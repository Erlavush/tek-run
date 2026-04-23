"use client";

import { useEffect, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import type { VideoPublishStatus, VideoTokenResponse } from "@/lib/types";

export function useLivekitSubscriber(videoElement: HTMLVideoElement | null) {
  const roomRef = useRef<Room | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [status, setStatus] = useState<VideoPublishStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoElement) {
      return;
    }

    let cancelled = false;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const clearVideoElement = () => {
      videoElement.pause();
      videoElement.srcObject = null;
    };

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const attachRemoteTrack = (track: Track) => {
      if (track.kind !== Track.Kind.Video || !videoElement) {
        return;
      }

      track.attach(videoElement);
      videoElement.muted = true;
      void videoElement.play().catch(() => null);
      setStatus("live");
      setError(null);
    };

    const syncSubscribedVideoTrack = () => {
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
          if (publication.track?.kind === Track.Kind.Video) {
            attachRemoteTrack(publication.track);
            return true;
          }
        }
      }

      clearVideoElement();
      return false;
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimeoutRef.current !== null) {
        return;
      }

      const delayMs = Math.min(5000, 1000 * (reconnectAttemptRef.current + 1));
      reconnectAttemptRef.current += 1;

      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = null;
        void connect();
      }, delayMs);
    };

    room.on(RoomEvent.TrackSubscribed, (track) => {
      attachRemoteTrack(track);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach(videoElement);
        if (!syncSubscribedVideoTrack()) {
          setStatus("idle");
        }
      }
    });

    room.on(RoomEvent.Reconnecting, () => {
      if (cancelled) {
        return;
      }

      setStatus("connecting");
      setError(null);
    });

    room.on(RoomEvent.Reconnected, () => {
      if (cancelled) {
        return;
      }

      reconnectAttemptRef.current = 0;

      if (!syncSubscribedVideoTrack()) {
        setStatus("idle");
        setError(null);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) {
        clearVideoElement();
        setStatus("idle");
        scheduleReconnect();
      }
    });

    const connect = async () => {
      if (
        room.state === ConnectionState.Connected ||
        room.state === ConnectionState.Connecting ||
        room.state === ConnectionState.Reconnecting
      ) {
        return;
      }

      try {
        setStatus("connecting");
        setError(null);

        const response = await fetch("/api/video/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "display",
          }),
        });
        const payload = (await response.json()) as VideoTokenResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to request a display video token.");
        }

        await room.connect(payload.url, payload.token);

        if (cancelled) {
          return;
        }

        reconnectAttemptRef.current = 0;

        if (!syncSubscribedVideoTrack()) {
          setStatus("idle");
        }
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        clearVideoElement();
        setStatus("error");
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to connect the public display to the live video feed.",
        );
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      cancelled = true;
      clearReconnectTimeout();
      clearVideoElement();
      room.disconnect();
      roomRef.current = null;
    };
  }, [videoElement]);

  return {
    error,
    status,
  };
}
