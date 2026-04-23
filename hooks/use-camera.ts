"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraConnectionState, VideoInputOption } from "@/lib/types";

function getFriendlyCameraLabel(label: string, index: number) {
  const trimmed = label.trim().replace(/\s*\([^)]*\)\s*$/, "");

  if (!trimmed) {
    return `Camera ${index + 1}`;
  }

  if (/integrated/i.test(trimmed)) {
    return "Built-in Camera";
  }

  if (/obs/i.test(trimmed)) {
    return "OBS Virtual Camera";
  }

  if (/virtual/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

function mapVideoInputs(devices: MediaDeviceInfo[]): VideoInputOption[] {
  const duplicateCounts = new Map<string, number>();

  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => {
      const rawLabel = device.label || `Camera ${index + 1}`;
      const baseLabel = getFriendlyCameraLabel(rawLabel, index);
      const nextCount = (duplicateCounts.get(baseLabel) ?? 0) + 1;
      duplicateCounts.set(baseLabel, nextCount);

      return {
        deviceId: device.deviceId,
        label: nextCount > 1 ? `${baseLabel} ${nextCount}` : baseLabel,
        rawLabel,
      };
    });
}

export function useCamera() {
  const [devices, setDevices] = useState<VideoInputOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selectedDeviceMissing =
    Boolean(selectedDeviceId) && !devices.some((device) => device.deviceId === selectedDeviceId);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      return;
    }

    const nextDevices = mapVideoInputs(await navigator.mediaDevices.enumerateDevices());
    setDevices(nextDevices);
    setSelectedDeviceId((current) => current || nextDevices[0]?.deviceId || "");
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const stopCamera = useCallback(() => {
    releaseStream();
    setError(null);
    setStatus("disconnected");
  }, [releaseStream]);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        setError("This browser does not expose camera access.");
        return null;
      }

      const requestedDeviceId = deviceId ?? selectedDeviceId;

      if (
        requestedDeviceId &&
        !devices.some((deviceOption) => deviceOption.deviceId === requestedDeviceId)
      ) {
        setStatus("disconnected");
        setError("The locked camera is unavailable. Reconnect it or choose another source.");
        return null;
      }

      setError(null);
      releaseStream();

      const buildConstraints = (withDeviceId: boolean): MediaStreamConstraints => ({
        audio: false,
        video: withDeviceId && requestedDeviceId
          ? {
              deviceId: { exact: requestedDeviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: { ideal: "environment" },
            },
      });

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia(
          buildConstraints(Boolean(requestedDeviceId)),
        );

        streamRef.current = nextStream;
        setStream(nextStream);
        setStatus("connected");

        if (requestedDeviceId) {
          setSelectedDeviceId(requestedDeviceId);
        }

        await refreshDevices();
        return nextStream;
      } catch (firstError) {
        const domError = firstError as DOMException;

        if (domError.name === "NotAllowedError") {
          setStatus("denied");
          setError("Camera permission was denied. Allow access and retry.");
          return null;
        }

        if (!requestedDeviceId) {
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia(
              buildConstraints(false),
            );

            streamRef.current = fallbackStream;
            setStream(fallbackStream);
            setStatus("connected");
            await refreshDevices();
            return fallbackStream;
          } catch {
            // Fall through to the generic error state below.
          }
        }

        setStatus("disconnected");
        setError("Unable to start the selected camera feed.");
        return null;
      }
    },
    [devices, refreshDevices, releaseStream, selectedDeviceId],
  );

  useEffect(() => {
    void refreshDevices();

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [refreshDevices]);

  useEffect(() => {
    return () => {
      releaseStream();
    };
  }, [releaseStream]);

  useEffect(() => {
    if (!selectedDeviceMissing) {
      return;
    }

    releaseStream();
    setStatus("disconnected");
    setError("The locked camera is unavailable. Reconnect it or choose another source.");
  }, [releaseStream, selectedDeviceMissing]);

  return {
    devices,
    error,
    selectedDeviceId,
    selectedDeviceMissing,
    setSelectedDeviceId,
    startCamera,
    status,
    stopCamera,
    stream,
  };
}
