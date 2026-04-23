"use client";

import { useEffect, useRef } from "react";
import {
  cameraStateConfig,
  inputClass,
  labelClass,
  sectionTitleClass,
  subtleButtonClass,
} from "@/lib/theme";
import type { CameraConnectionState, VideoInputOption, VideoPublishStatus } from "@/lib/types";
import { StatusChip } from "@/components/status-chip";

interface CameraPanelProps {
  broadcastError?: string | null;
  broadcastStatus?: VideoPublishStatus;
  devices: VideoInputOption[];
  error: string | null;
  liveSourceLabel?: string | null;
  onDeviceChange: (deviceId: string) => void;
  onGoLive?: () => void;
  onStartCamera: () => void;
  onStopBroadcast?: () => void;
  onStopCamera: () => void;
  selectedCameraLabel?: string;
  selectedDeviceId: string;
  status: CameraConnectionState;
  stream: MediaStream | null;
  variant?: "operator" | "public";
}

const greenActionButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[#166534] bg-[#1f8f42] px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#166534] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1f8f42]/20 disabled:pointer-events-none disabled:border-[#86efac] disabled:bg-[#dcfce7] disabled:text-[#4d7c0f]";

const amberActionButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[#c2410c] bg-[#f59e0b] px-4 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-[#ea580c] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f59e0b]/20 disabled:pointer-events-none disabled:border-[#fde68a] disabled:bg-[#fef3c7] disabled:text-[#a16207]";

const redActionButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[#991b1b] bg-[#dc2626] px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#b91c1c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc2626]/20 disabled:pointer-events-none disabled:border-[#fca5a5] disabled:bg-[#fee2e2] disabled:text-[#991b1b]";

function getBroadcastTone(status: VideoPublishStatus | undefined) {
  if (status === "live") {
    return "danger" as const;
  }

  if (status === "connecting") {
    return "warning" as const;
  }

  if (status === "error") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getBroadcastLabel(status: VideoPublishStatus | undefined) {
  if (status === "live") {
    return "Live";
  }

  if (status === "connecting") {
    return "Connecting";
  }

  if (status === "error") {
    return "Error";
  }

  return "Standby";
}

export function CameraPanel({
  broadcastError,
  broadcastStatus,
  devices,
  error,
  liveSourceLabel,
  onDeviceChange,
  onGoLive,
  onStartCamera,
  onStopBroadcast,
  onStopCamera,
  selectedCameraLabel,
  selectedDeviceId,
  status,
  stream,
  variant = "operator",
}: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => null);
      return;
    }

    videoRef.current.srcObject = null;
  }, [stream]);

  const openFullscreen = async () => {
    if (!containerRef.current) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await containerRef.current.requestFullscreen();
    } catch {
      // Ignore fullscreen failures on browsers that do not support it.
    }
  };

  const cameraState = cameraStateConfig[status];
  const previewMessage =
    status === "denied"
      ? "Camera denied"
      : status === "unsupported"
        ? "Not supported"
        : "Camera off";
  const displaySelectedLabel =
    selectedCameraLabel ??
    devices.find((device) => device.deviceId === selectedDeviceId)?.label ??
    (selectedDeviceId ? "Selected Camera" : "No camera selected");
  const displayLiveSourceLabel = liveSourceLabel ?? "Offline";
  const combinedError = broadcastError ?? error;
  const canStartCamera = devices.length > 0;
  const canStopCamera = stream !== null;
  const canOpenFullscreen = stream !== null;
  const canGoLive =
    Boolean(selectedDeviceId) &&
    Boolean(onGoLive) &&
    broadcastStatus !== "live";
  const canStopLive =
    Boolean(onStopBroadcast) &&
    broadcastStatus !== undefined &&
    broadcastStatus !== "idle";

  return (
    <section className="panel-card p-4 lg:p-5">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={sectionTitleClass}>
            {variant === "public" ? "Public Camera" : "Camera"}
          </h2>
          <StatusChip
            label={cameraState.label}
            tone={cameraState.tone}
            pulse={status === "connected"}
          />
          {variant === "operator" && broadcastStatus ? (
            <StatusChip
              label={getBroadcastLabel(broadcastStatus)}
              tone={getBroadcastTone(broadcastStatus)}
              pulse={broadcastStatus === "live" || broadcastStatus === "connecting"}
              className={broadcastStatus === "live" ? "bg-[#c81515] text-white ring-[#8f1111]" : undefined}
            />
          ) : null}
        </div>

        {variant === "operator" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={greenActionButtonClass}
              disabled={!canStartCamera}
              onClick={onStartCamera}
            >
              Start
            </button>
            <button
              type="button"
              className={redActionButtonClass}
              disabled={!canStopCamera}
              onClick={onStopCamera}
            >
              Stop
            </button>
            <button
              type="button"
              className={subtleButtonClass}
              disabled={!canOpenFullscreen}
              onClick={openFullscreen}
            >
              Fullscreen
            </button>
            <button
              type="button"
              className={amberActionButtonClass}
              disabled={!canGoLive}
              onClick={onGoLive}
            >
              Go Live
            </button>
            <button
              type="button"
              className={redActionButtonClass}
              disabled={!canStopLive}
              onClick={onStopBroadcast}
            >
              Stop Live
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="w-full xl:max-w-md">
          <label className={labelClass} htmlFor={`${variant}-camera-source`}>
            Source
          </label>
          <select
            id={`${variant}-camera-source`}
            className={inputClass}
            value={selectedDeviceId}
            onChange={(event) => onDeviceChange(event.target.value)}
          >
            {devices.length === 0 ? (
              <option value="">No camera devices detected</option>
            ) : (
              devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {variant === "operator" ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              Selected
            </p>
            <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xl font-extrabold text-black">
              {displaySelectedLabel}
            </p>
          </div>

          <div className="rounded-[20px] border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              Live
            </p>
            <p className="mt-1 truncate font-[family-name:var(--font-display)] text-xl font-extrabold text-black">
              {displayLiveSourceLabel}
            </p>
          </div>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[28px] border-2 border-black bg-black"
      >
        <div className="aspect-[16/9] w-full">
          {stream ? (
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="soft-grid flex h-full w-full items-center justify-center bg-black px-6 text-white">
              <div className="max-w-xl text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/30 bg-white/10">
                  <div className="h-10 w-10 rounded-[14px] border border-white/30" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
                  {previewMessage}
                </h3>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    className={greenActionButtonClass}
                    disabled={!canStartCamera}
                    onClick={onStartCamera}
                  >
                    Start
                  </button>
                  {variant === "operator" ? (
                    <button
                      type="button"
                      className={subtleButtonClass}
                      disabled={!canOpenFullscreen}
                      onClick={openFullscreen}
                    >
                      Fullscreen
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-5 top-5 flex flex-wrap gap-2">
            <StatusChip
              label={stream ? "Preview Live" : "Preview Off"}
              tone={stream ? "success" : "neutral"}
              pulse={stream !== null}
            />
          </div>

          <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-2xl border border-white/20 bg-black/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
              {selectedDeviceId ? "Source locked" : "No source"}
            </div>

            {combinedError ? (
              <div className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-black">
                {combinedError}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {variant === "public" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={greenActionButtonClass}
            disabled={!canStartCamera}
            onClick={onStartCamera}
          >
            {stream ? "Restart Feed" : "Start Feed"}
          </button>
          <button
            type="button"
            className={redActionButtonClass}
            disabled={!canStopCamera}
            onClick={onStopCamera}
          >
            Stop Feed
          </button>
        </div>
      ) : null}
    </section>
  );
}
