"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraPanel } from "@/components/camera-panel";
import { LatestFinisherCard } from "@/components/latest-finisher-card";
import { OperatorControls } from "@/components/operator-controls";
import { TopBar } from "@/components/top-bar";
import { useCamera } from "@/hooks/use-camera";
import { useLocalTime } from "@/hooks/use-local-time";
import {
  defaultDashboardSettings,
  persistDashboardSettings,
  readDashboardSettings,
} from "@/lib/dashboard-settings";
import {
  buildManualFinisher,
  createRunnerName,
  initialSessionInfo,
  seedFinishers,
} from "@/lib/mock-data";
import { normalizeBibNumber } from "@/lib/bib";
import { formatClock, formatLongDate } from "@/lib/theme";
import type { DashboardSettings, FinisherStatus } from "@/lib/types";

function formatRaceMoment(value: string | null, fallbackLabel: string) {
  if (!value) {
    return fallbackLabel;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
    .format(new Date(value))
    .replace("AM", "A.M.")
    .replace("PM", "P.M.");
}

export function DashboardShell() {
  const localTime = useLocalTime();
  const camera = useCamera();
  const previousCameraState = useRef(camera.status);

  const [settings, setSettings] = useState(defaultDashboardSettings);
  const [sessionInfo, setSessionInfo] = useState(initialSessionInfo);
  const [finishers, setFinishers] = useState(seedFinishers);
  const [manualBib, setManualBib] = useState("");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const latestFinisher = finishers.at(-1) ?? null;

  useEffect(() => {
    const storedSettings = readDashboardSettings();
    setSettings(storedSettings);

    if (storedSettings.cameraSource) {
      camera.setSelectedDeviceId(storedSettings.cameraSource);
    }

    setHasLoadedSettings(true);
  }, [camera.setSelectedDeviceId]);

  useEffect(() => {
    if (!hasLoadedSettings) {
      return;
    }

    persistDashboardSettings(settings);
  }, [hasLoadedSettings, settings]);

  useEffect(() => {
    if (previousCameraState.current === camera.status) {
      return;
    }

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
  const raceStartLabel = useMemo(
    () => formatRaceMoment(settings.raceStartTimeIso, "Not started"),
    [settings.raceStartTimeIso],
  );
  const raceEndLabel = useMemo(
    () => formatRaceMoment(settings.raceEndTimeIso, "Not ended"),
    [settings.raceEndTimeIso],
  );

  const queueExcelStatusReset = () => {
    window.setTimeout(() => {
      setSessionInfo((current) => ({
        ...current,
        excelState: "idle",
      }));
    }, 900);
  };

  const handleLogFinish = (requestedStatus: FinisherStatus) => {
    const normalizedBib = normalizeBibNumber(manualBib);

    if (!normalizedBib || settings.raceStatus !== "running") {
      return;
    }

    const timestamp = new Date();
    const duplicateDetected = finishers.some(
      (finisher) => normalizeBibNumber(finisher.bibNumber) === normalizedBib,
    );

    const finalStatus: FinisherStatus = duplicateDetected ? "duplicate" : requestedStatus;
    const nextPlace = finishers.length > 0 ? finishers.at(-1)!.place + 1 : 1;
    const nextFinisher = buildManualFinisher({
      place: nextPlace,
      bibNumber: normalizedBib,
      runnerName: createRunnerName(nextPlace),
      status: finalStatus,
      source: "manual",
      timestamp,
    });

    setSessionInfo((current) => ({
      ...current,
      excelState: "running",
      lastDetectionTime: nextFinisher.loggedAt,
      lastExcelWriteStatus:
        finalStatus === "duplicate"
          ? "Duplicate flagged for manual review"
          : "Latest finisher pushed to spreadsheet queue",
    }));

    setFinishers((current) => [...current, nextFinisher]);

    if (settings.soundAlert) {
      window.navigator.vibrate?.(40);
    }

    queueExcelStatusReset();
    setManualBib("");
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

  const handleRaceStartNow = () => {
    if (settings.raceStatus !== "idle") {
      return;
    }

    const timestamp = new Date().toISOString();

    setSettings((current) => ({
      ...current,
      raceStartTimeIso: timestamp,
      raceEndTimeIso: null,
      raceStatus: "running",
    }));
  };

  const handleRaceEndNow = () => {
    if (settings.raceStatus !== "running") {
      return;
    }

    setSettings((current) => ({
      ...current,
      raceEndTimeIso: new Date().toISOString(),
      raceStatus: "ended",
    }));
  };

  const handleRestartRace = () => {
    setSettings((current) => ({
      ...current,
      raceStartTimeIso: null,
      raceEndTimeIso: null,
      raceStatus: "idle",
    }));
    setManualBib("");
  };

  const handleManualBibChange = (value: string) => {
    setManualBib(value.toUpperCase());
  };

  const handleManualBibBlur = () => {
    setManualBib((current) => normalizeBibNumber(current));
  };

  return (
    <div data-theme-mode={settings.themeMode} className="relative min-h-screen overflow-hidden">
      <div className="accent-orbit left-10 top-16 h-52 w-52 bg-[#4C05E4]" />
      <div className="accent-orbit right-[12%] top-[22%] h-40 w-40 bg-[#FC6824]" />
      <div className="accent-orbit bottom-10 right-10 h-60 w-60 bg-[#56F005]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7 xl:px-8">
        <TopBar eventName={settings.eventName} raceStatus={settings.raceStatus} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7701A6]">
              Operator Session
            </p>
            <p className="mt-1 text-sm font-semibold text-[#5F5866]">
              {todayLabel} | Keep this screen for core race actions only
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <section className="space-y-6">
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
              manualBib={manualBib}
              onClear={() => setManualBib("")}
              onEndRaceNow={handleRaceEndNow}
              onLogFinish={() => handleLogFinish("verified")}
              onManualBibBlur={handleManualBibBlur}
              onManualBibChange={handleManualBibChange}
              onMarkNeedsReview={() => handleLogFinish("needs review")}
              onRestartRace={handleRestartRace}
              onStartRaceNow={handleRaceStartNow}
              raceEndedTimeLabel={raceEndLabel}
              raceStartTimeLabel={raceStartLabel}
              raceStatus={settings.raceStatus}
            />

            <LatestFinisherCard
              currentTimeLabel={currentTimeLabel}
              eventName={settings.eventName}
              finisher={latestFinisher}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
