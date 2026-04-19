"use client";

import { useEffect, useRef } from "react";
import {
  cameraStateConfig,
  inputClass,
  labelClass,
  pipelineStateConfig,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  subtleButtonClass,
} from "@/lib/theme";
import type {
  CameraConnectionState,
  PipelineState,
  VideoInputOption,
} from "@/lib/types";
import { StatusChip } from "@/components/status-chip";

interface CameraPanelProps {
  devices: VideoInputOption[];
  error: string | null;
  excelState: PipelineState;
  finishLineLabel: string;
  ocrState: PipelineState;
  onDeviceChange: (deviceId: string) => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  selectedDeviceId: string;
  status: CameraConnectionState;
  stream: MediaStream | null;
  detectionState: PipelineState;
  variant?: "operator" | "public";
}

export function CameraPanel({
  devices,
  error,
  excelState,
  finishLineLabel,
  ocrState,
  onDeviceChange,
  onStartCamera,
  onStopCamera,
  selectedDeviceId,
  status,
  stream,
  detectionState,
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
      // Ignore fullscreen request failures in unsupported browsers.
    }
  };

  const cameraState = cameraStateConfig[status];

  const previewMessage =
    status === "denied"
      ? "Camera permission was denied. Update the browser permission and retry."
      : status === "unsupported"
        ? "Camera access is not available in this browser."
        : "Preview is idle. Start the camera to check alignment before the race.";

  return (
    <section className="panel-card p-5 lg:p-6">
      <div className="accent-orbit -left-10 top-8 h-36 w-36 bg-[#3DA3F4]" />
      <div className="accent-orbit right-8 top-12 h-28 w-28 bg-[#A1D110]" />
      <div className="sport-swoosh alt -bottom-12 left-[22%] h-56 w-56" />

      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className={sectionTitleClass}>
              {variant === "public" ? "Live Finish Feed" : "Live Camera Preview"}
            </h2>
            <StatusChip
              label={`Camera ${cameraState.label}`}
              tone={cameraState.tone}
              pulse={status === "connected"}
            />
          </div>
          <p className="mt-2 max-w-2xl text-sm font-medium text-[#635D68]">
            Browser-based camera integration with a virtual finish line overlay.
            This panel is ready to connect to OCR, detection, and crossing events later.
          </p>
        </div>

        {variant === "operator" ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} onClick={onStartCamera}>
              Start Camera
            </button>
            <button type="button" className={secondaryButtonClass} onClick={onStopCamera}>
              Stop Camera
            </button>
            <button type="button" className={subtleButtonClass} onClick={openFullscreen}>
              Fullscreen Preview
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <StatusChip
            label={`OCR ${pipelineStateConfig[ocrState].label}`}
            tone={pipelineStateConfig[ocrState].tone}
          />
          <StatusChip
            label={`Detection ${pipelineStateConfig[detectionState].label}`}
            tone={pipelineStateConfig[detectionState].tone}
          />
          <StatusChip
            label={`Excel Logging ${pipelineStateConfig[excelState].label}`}
            tone={pipelineStateConfig[excelState].tone}
          />
        </div>

        <div className="w-full xl:max-w-sm">
          <label className={labelClass} htmlFor={`${variant}-camera-source`}>
            Camera Source
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

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[28px] bg-[#0D1020] shadow-[0_34px_60px_-34px_rgba(13,16,32,0.88)]"
      >
        <div className="aspect-[16/9] w-full">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="soft-grid flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(76,5,228,0.25),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(161,209,16,0.18),transparent_26%),linear-gradient(180deg,#141829_0%,#0B0F1D_100%)] px-6 text-white">
              <div className="max-w-xl text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/10 backdrop-blur">
                  <div className="h-12 w-12 rounded-[18px] border border-white/30 bg-gradient-to-br from-white/10 to-white/0" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
                  Camera Preview Ready
                </h3>
                <p className="mt-3 text-sm font-medium text-white/75 lg:text-base">
                  {previewMessage}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={onStartCamera}
                  >
                    Enable Camera Feed
                  </button>
                  {variant === "operator" ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={openFullscreen}
                    >
                      Open Fullscreen
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-5 top-5 flex flex-wrap gap-2">
            <StatusChip
              label={stream ? "Preview Live" : "Preview Standby"}
              tone={stream ? "gradient" : "neutral"}
              pulse={stream !== null}
            />
            <StatusChip
              label={stream ? "Frame Sync Stable" : "Awaiting Feed"}
              tone={stream ? "lime" : "neutral"}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-6 top-[56%]">
            <div className="relative">
              <div className="finish-line-glow h-[3px] rounded-full bg-gradient-to-r from-[#A1D110] via-white to-[#56F005]" />
              <div className="absolute -top-6 right-0 rounded-full bg-white/92 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#1F1F1F]">
                {finishLineLabel}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-2xl bg-black/45 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur">
              Lane View • Chest-level framing recommended
            </div>

            {error ? (
              <div className="rounded-2xl bg-[#FF5A5A]/90 px-4 py-3 text-sm font-semibold text-white shadow-lg">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {variant === "public" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={primaryButtonClass} onClick={onStartCamera}>
            {stream ? "Restart Feed" : "Start Feed"}
          </button>
          <button type="button" className={secondaryButtonClass} onClick={onStopCamera}>
            Stop Feed
          </button>
        </div>
      ) : null}
    </section>
  );
}
