"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { CameraPanel } from "@/components/camera-panel";
import { FinishersTable } from "@/components/finishers-table";
import { HealthPanel } from "@/components/health-panel";
import { LatestFinisherCard } from "@/components/latest-finisher-card";
import { OperatorControls } from "@/components/operator-controls";
import { SettingsPanel } from "@/components/settings-panel";
import { TopBar } from "@/components/top-bar";
import { useCamera } from "@/hooks/use-camera";
import { useLocalTime } from "@/hooks/use-local-time";
import {
  buildManualFinisher,
  buildSystemLog,
  createRunnerName,
  initialSessionInfo,
  initialSettings,
  seedFinishers,
  seedSystemLogs,
} from "@/lib/mock-data";
import { formatClock, formatLongDate } from "@/lib/theme";
import type { DashboardSettings, FinisherStatus, SystemLogEntry } from "@/lib/types";

const MAX_LOG_ENTRIES = 18;

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function DashboardShell() {
  const localTime = useLocalTime();
  const camera = useCamera();
  const previousCameraState = useRef(camera.status);

  const [settings, setSettings] = useState(initialSettings);
  const [sessionInfo, setSessionInfo] = useState(initialSessionInfo);
  const [finishers, setFinishers] = useState(seedFinishers);
  const [logs, setLogs] = useState(seedSystemLogs);
  const [manualBib, setManualBib] = useState("");
  const [manualRunnerName, setManualRunnerName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const latestFinisher = finishers.at(-1) ?? null;

  const appendLog = (entry: SystemLogEntry) => {
    setLogs((current) => [...current, entry].slice(-MAX_LOG_ENTRIES));
  };

  useEffect(() => {
    if (previousCameraState.current === camera.status) {
      return;
    }

    const messageMap: Record<typeof camera.status, string> = {
      connected: "Camera feed connected successfully.",
      disconnected: "Camera feed stopped.",
      denied: "Camera permission was denied by the browser.",
      unsupported: "This browser does not support camera access.",
    };

    appendLog(
      buildSystemLog({
        level: camera.status === "connected" ? "success" : "warn",
        message: messageMap[camera.status],
      }),
    );

    previousCameraState.current = camera.status;
  }, [camera.status]);

  useEffect(() => {
    if (camera.selectedDeviceId && camera.selectedDeviceId !== settings.cameraSource) {
      setSettings((current) => ({
        ...current,
        cameraSource: camera.selectedDeviceId,
      }));
    }
  }, [camera.selectedDeviceId, settings.cameraSource]);

  const currentTimeLabel = useMemo(() => formatClock(localTime), [localTime]);
  const todayLabel = useMemo(() => formatLongDate(localTime), [localTime]);

  const queueExcelStatusReset = () => {
    window.setTimeout(() => {
      setSessionInfo((current) => ({
        ...current,
        excelState: "idle",
      }));
    }, 900);
  };

  const handleLogFinish = (requestedStatus: FinisherStatus) => {
    const normalizedBib = manualBib.trim().toUpperCase();

    if (!normalizedBib) {
      return;
    }

    const timestamp = new Date();
    const duplicateDetected = finishers.some(
      (finisher) => finisher.bibNumber.toUpperCase() === normalizedBib,
    );

    const finalStatus: FinisherStatus = duplicateDetected
      ? "duplicate"
      : requestedStatus;

    const nextPlace = finishers.length > 0 ? finishers.at(-1)!.place + 1 : 1;
    const nextFinisher = buildManualFinisher({
      place: nextPlace,
      bibNumber: normalizedBib,
      runnerName: manualRunnerName.trim() || createRunnerName(nextPlace),
      status: finalStatus,
      source: "manual",
      timestamp,
    });

    const logMessage =
      finalStatus === "duplicate"
        ? `Duplicate bib ${normalizedBib} flagged during manual entry.`
        : finalStatus === "needs review"
          ? `Bib ${normalizedBib} logged manually and queued for review.`
          : `Manual finish recorded for bib ${normalizedBib}.`;

    const logLevel =
      finalStatus === "verified" ? "success" : finalStatus === "duplicate" ? "warn" : "warn";

    setSessionInfo((current) => ({
      ...current,
      excelState: "running",
      lastDetectionTime: nextFinisher.loggedAt,
      lastExcelWriteStatus:
        finalStatus === "duplicate"
          ? "Mock write skipped until duplicate is resolved"
          : "Mock spreadsheet write completed",
    }));

    startTransition(() => {
      setFinishers((current) => [...current, nextFinisher]);
      appendLog(
        buildSystemLog({
          level: logLevel,
          message: logMessage,
          timestamp,
        }),
      );
    });

    if (settings.soundAlert) {
      window.navigator.vibrate?.(40);
    }

    queueExcelStatusReset();
    setManualBib("");
    setManualRunnerName("");
  };

  const handleExport = () => {
    const header = [
      "Place",
      "Bib Number",
      "Runner Name",
      "Finish Time",
      "Logged At",
      "Source",
      "Status",
      "Confidence",
    ];

    const rows = finishers.map((finisher) => [
      String(finisher.place),
      finisher.bibNumber,
      finisher.runnerName,
      finisher.finishTime,
      finisher.loggedAt,
      finisher.source,
      finisher.status,
      String(finisher.confidence),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${settings.eventName.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-mock-results.csv`;
    link.click();
    URL.revokeObjectURL(downloadUrl);

    appendLog(
      buildSystemLog({
        level: "info",
        message: `Exported ${finishers.length} mock results to CSV.`,
      }),
    );
  };

  const handleCameraSourceChange = (value: string) => {
    camera.setSelectedDeviceId(value);
    setSettings((current) => ({
      ...current,
      cameraSource: value,
    }));

    if (camera.status === "connected") {
      void camera.startCamera(value);
    }
  };

  const handleSettingChange = <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div data-theme-mode={settings.themeMode} className="relative min-h-screen overflow-hidden">
      <div className="accent-orbit left-10 top-16 h-52 w-52 bg-[#4C05E4]" />
      <div className="accent-orbit right-[12%] top-[22%] h-40 w-40 bg-[#FC6824]" />
      <div className="accent-orbit bottom-10 right-10 h-60 w-60 bg-[#56F005]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7 xl:px-8">
        <TopBar
          eventName={settings.eventName}
          onExport={handleExport}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(430px,0.95fr)]">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7701A6]">
                  Operator Session
                </p>
                <p className="mt-1 text-sm font-semibold text-[#5F5866]">
                  {todayLabel} | Offline mode active
                </p>
              </div>
            </div>

            <CameraPanel
              detectionState={sessionInfo.detectionState}
              devices={camera.devices}
              error={camera.error}
              excelState={sessionInfo.excelState}
              finishLineLabel={settings.finishLineLabel}
              ocrState={sessionInfo.ocrState}
              onDeviceChange={handleCameraSourceChange}
              onStartCamera={() => void camera.startCamera()}
              onStopCamera={camera.stopCamera}
              selectedDeviceId={camera.selectedDeviceId}
              status={camera.status}
              stream={camera.stream}
            />
          </section>

          <aside className="space-y-6">
            <OperatorControls
              currentTimeLabel={currentTimeLabel}
              eventName={settings.eventName}
              manualBib={manualBib}
              manualRunnerName={manualRunnerName}
              onClear={() => {
                setManualBib("");
                setManualRunnerName("");
              }}
              onLogFinish={() => handleLogFinish("verified")}
              onManualBibChange={setManualBib}
              onManualRunnerNameChange={setManualRunnerName}
              onMarkNeedsReview={() => handleLogFinish("needs review")}
            />

            <LatestFinisherCard
              currentTimeLabel={currentTimeLabel}
              eventName={settings.eventName}
              finisher={latestFinisher}
            />

            <FinishersTable
              autoScroll={settings.autoScrollResults}
              finishers={finishers}
              limit={10}
            />

            <HealthPanel
              cameraState={camera.status}
              connectionMode={sessionInfo.connectionMode}
              eventName={settings.eventName}
              lastDetectionTime={sessionInfo.lastDetectionTime}
              lastExcelWriteStatus={sessionInfo.lastExcelWriteStatus}
              logs={logs}
              mockMode={settings.mockMode}
              totalLoggedFinishers={finishers.length}
            />
          </aside>
        </div>
      </main>

      <SettingsPanel
        devices={camera.devices}
        isOpen={isSettingsOpen}
        onCameraSourceChange={handleCameraSourceChange}
        onClose={() => setIsSettingsOpen(false)}
        onSettingChange={handleSettingChange}
        settings={settings}
      />
    </div>
  );
}
