"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  createLocalVideoTrack,
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from "livekit-client";
import type { VideoPublishStatus, VideoSourceSlot, VideoTokenResponse } from "@/lib/types";

interface PublishSlotOptions {
  deviceId: string;
  slot: VideoSourceSlot;
  label: string;
  previewTrack?: MediaStreamTrack | null;
}

async function syncVideoState(payload: object) {
  await fetch("/api/video/state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function useLivekitPublisher() {
  const roomRef = useRef<Room | null>(null);
  const trackRef = useRef<LocalVideoTrack | MediaStreamTrack | null>(null);
  const usingPreviewTrackRef = useRef(false);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const [status, setStatus] = useState<VideoPublishStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<VideoSourceSlot | null>(null);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current !== null) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const ensureRoom = useCallback(async () => {
    if (roomRef.current && roomRef.current.state === ConnectionState.Connected) {
      return roomRef.current;
    }

    const response = await fetch("/api/video/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "operator",
      }),
    });
    const payload = (await response.json()) as VideoTokenResponse & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to request an operator video token.");
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    room.on(RoomEvent.Disconnected, () => {
      clearHeartbeat();
      const publishedTrack = trackRef.current;

      if (publishedTrack && !usingPreviewTrackRef.current) {
        publishedTrack.stop();
      }

      trackRef.current = null;
      usingPreviewTrackRef.current = false;
      roomRef.current = null;
      setStatus("idle");
      setActiveSlot(null);
    });

    await room.connect(payload.url, payload.token);
    roomRef.current = room;

    return room;
  }, [clearHeartbeat]);

  const releasePublishedTrack = useCallback(async () => {
    const room = roomRef.current;
    const publishedTrack = trackRef.current;

    if (!publishedTrack) {
      usingPreviewTrackRef.current = false;
      return;
    }

    const wasUsingPreviewTrack = usingPreviewTrackRef.current;

    if (room) {
      await room.localParticipant
        .unpublishTrack(publishedTrack, wasUsingPreviewTrack ? false : undefined)
        .catch(() => null);
    }

    if (!wasUsingPreviewTrack) {
      publishedTrack.stop();
    }

    trackRef.current = null;
    usingPreviewTrackRef.current = false;
  }, []);

  const stopPublishing = useCallback(async () => {
    clearHeartbeat();

    await releasePublishedTrack();

    roomRef.current?.disconnect();
    roomRef.current = null;
    setStatus("idle");
    setActiveSlot(null);
    setError(null);

    await syncVideoState({
      activeSourceSlot: null,
      activeSourceLabel: null,
      publishStatus: "idle",
      heartbeat: false,
    }).catch(() => null);
  }, [clearHeartbeat, releasePublishedTrack]);

  const publishSlot = useCallback(async ({
    deviceId,
    slot,
    label,
    previewTrack,
  }: PublishSlotOptions) => {
    if (!deviceId) {
      throw new Error("Assign a camera device to the selected slot first.");
    }

    setStatus("connecting");
    setError(null);

    await syncVideoState({
      activeSourceSlot: slot,
      activeSourceLabel: label,
      publishStatus: "connecting",
      heartbeat: true,
    }).catch(() => null);

    try {
      const room = await ensureRoom();

      await releasePublishedTrack();

      const nextTrack =
        previewTrack ??
        (await createLocalVideoTrack({
          deviceId: {
            exact: deviceId,
          },
          resolution: VideoPresets.h720.resolution,
          frameRate: 30,
        }));

      await room.localParticipant.publishTrack(nextTrack, {
        source: Track.Source.Camera,
        simulcast: false,
      });

      trackRef.current = nextTrack;
      usingPreviewTrackRef.current = Boolean(previewTrack);
      setStatus("live");
      setActiveSlot(slot);

      clearHeartbeat();
      heartbeatIntervalRef.current = window.setInterval(() => {
        void syncVideoState({
          activeSourceSlot: slot,
          activeSourceLabel: label,
          publishStatus: "live",
          heartbeat: true,
        });
      }, 15000);

      await syncVideoState({
        activeSourceSlot: slot,
        activeSourceLabel: label,
        publishStatus: "live",
        heartbeat: true,
      }).catch(() => null);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Unable to publish the selected camera.";
      setError(message);
      setStatus("error");

      await syncVideoState({
        activeSourceSlot: slot,
        activeSourceLabel: label,
        publishStatus: "error",
        heartbeat: false,
      }).catch(() => null);

      throw nextError;
    }
  }, [clearHeartbeat, ensureRoom, releasePublishedTrack]);

  useEffect(() => {
    return () => {
      void stopPublishing();
    };
  }, [stopPublishing]);

  return {
    activeSlot,
    error,
    publishSlot,
    status,
    stopPublishing,
  };
}
