"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CameraPanel } from "@/components/camera-panel";
import { LatestFinisherCard } from "@/components/latest-finisher-card";
import { OperationsPanel } from "@/components/operations-panel";
import { OperatorControls } from "@/components/operator-controls";
import { RaceAdminPanel } from "@/components/race-admin-panel";
import { TopBar } from "@/components/top-bar";
import { useCameraPermission } from "@/hooks/use-camera-permission";
import { useCamera } from "@/hooks/use-camera";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { useLivekitPublisher } from "@/hooks/use-livekit-publisher";
import { useLocalTime } from "@/hooks/use-local-time";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  defaultDashboardSettings,
  persistDashboardSettings,
  readDashboardSettings,
} from "@/lib/dashboard-settings";
import { formatClock } from "@/lib/theme";
import { getEffectiveVideoPublishStatus } from "@/lib/video-state";
import type {
  DashboardSettings,
  FinisherRecord,
  FinisherStatus,
  ManualEntryFeed,
  ManualEntryRecord,
  RaceResponse,
  SystemHealthResponse,
} from "@/lib/types";

type ExportFormat = "xlsx" | "json" | "csv";

const LAST_EXPORT_STORAGE_KEY = "tek-run.last-exported-at";

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

function createEmptyRaceResponse(): RaceResponse {
  return {
    race: {
      id: "active-event",
      eventName: defaultDashboardSettings.eventName,
      raceStatus: "idle",
      raceStartTimeIso: null,
      raceEndTimeIso: null,
      updatedAt: new Date().toISOString(),
    },
    video: {
      eventId: "active-event",
      activeSourceSlot: null,
      activeSourceLabel: null,
      publishStatus: "idle",
      updatedAt: new Date().toISOString(),
      lastHeartbeat: null,
    },
    counts: {
      totalRunners: 0,
      totalFinishers: 0,
      verifiedFinishers: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

function createEmptyManualFeed(): ManualEntryFeed {
  return {
    entries: [],
    race: createEmptyRaceResponse().race,
    updatedAt: new Date().toISOString(),
    masterlistPath: "",
    resultsPath: "",
  };
}

function toFinisherStatus(entry: ManualEntryRecord): FinisherStatus {
  if (entry.reviewStatus === "duplicate") {
    return "duplicate";
  }

  if (entry.reviewStatus === "needs review") {
    return "needs review";
  }

  if (!entry.runnerName) {
    return "unknown";
  }

  return "verified";
}

function mapLatestFinisher(entry: ManualEntryRecord | null): FinisherRecord | null {
  if (!entry) {
    return null;
  }

  return {
    id: entry.id,
    place: entry.rowNumber,
    bibNumber: entry.bibNumber,
    runnerName: entry.runnerName ?? "NO NAME",
    finishTime: entry.elapsedRaceTime,
    loggedAt: entry.clockFinishTime,
    source: "manual",
    status: toFinisherStatus(entry),
    confidence: entry.reviewStatus === "verified" ? 0.99 : 0.68,
  };
}

function getDownloadedFileName(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

export function DashboardShell() {
  const localTime = useLocalTime();
  const browserOnline = useOnlineStatus();
  const cameraPermission = useCameraPermission();
  const camera = useCamera();
  const publisher = useLivekitPublisher();
  const [settings, setSettings] = useState(defaultDashboardSettings);
  const [raceResponse, setRaceResponse] = useState<RaceResponse>(createEmptyRaceResponse);
  const [manualFeed, setManualFeed] = useState<ManualEntryFeed>(createEmptyManualFeed);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [eventNameDraft, setEventNameDraft] = useState(defaultDashboardSettings.eventName);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingEventName, setIsSavingEventName] = useState(false);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<ExportFormat | null>(null);
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    const [raceResponseResult, manualResponseResult] = await Promise.all([
      fetch("/api/race", {
        cache: "no-store",
      }),
      fetch("/api/manual-entry", {
        cache: "no-store",
      }),
    ]);

    const nextRaceResponse = (await raceResponseResult.json()) as RaceResponse & { error?: string };
    const nextManualFeed = (await manualResponseResult.json()) as ManualEntryFeed & {
      error?: string;
    };

    if (!raceResponseResult.ok) {
      throw new Error(nextRaceResponse.error ?? "Unable to load shared race state.");
    }

    if (!manualResponseResult.ok) {
      throw new Error(nextManualFeed.error ?? "Unable to load manual entries.");
    }

    setRaceResponse(nextRaceResponse);
    setManualFeed(nextManualFeed);
    setEventNameDraft((current) =>
      current.trim().length === 0 || current === raceResponse.race.eventName
        ? nextRaceResponse.race.eventName
        : current,
    );
  }, [raceResponse.race.eventName]);

  const runHealthCheck = useCallback(async () => {
    setIsRunningHealthCheck(true);

    try {
      const response = await fetch("/api/system/health", {
        cache: "no-store",
      });
      const payload = (await response.json()) as SystemHealthResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to run the system health check.");
      }

      setHealth(payload);
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Unable to run the system health check.",
      );
    } finally {
      setIsRunningHealthCheck(false);
    }
  }, []);

  useEffect(() => {
    const storedSettings = readDashboardSettings();
    setSettings(storedSettings);

    if (storedSettings.cameraSource) {
      camera.setSelectedDeviceId(storedSettings.cameraSource);
    }

    setHasLoadedSettings(true);
  }, [camera.setSelectedDeviceId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedExportTime = window.localStorage.getItem(LAST_EXPORT_STORAGE_KEY);
    setLastExportedAt(storedExportTime);
  }, []);

  useEffect(() => {
    if (!hasLoadedSettings) {
      return;
    }

    persistDashboardSettings(settings);
  }, [hasLoadedSettings, settings]);

  useEffect(() => {
    if (typeof window === "undefined" || !lastExportedAt) {
      return;
    }

    window.localStorage.setItem(LAST_EXPORT_STORAGE_KEY, lastExportedAt);
  }, [lastExportedAt]);

  useEffect(() => {
    if (camera.selectedDeviceId && camera.selectedDeviceId !== settings.cameraSource) {
      setSettings((current) => ({
        ...current,
        cameraSource: camera.selectedDeviceId,
      }));
    }
  }, [camera.selectedDeviceId, settings.cameraSource]);

  useEffect(() => {
    void loadDashboardData().catch((error) => {
      setActionMessage(error instanceof Error ? error.message : "Unable to load dashboard data.");
    });
  }, [loadDashboardData]);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  useFirebaseRealtime(
    "operator-dashboard",
    [
      { table: "race_events", filter: "id=eq.active-event" },
      { table: "finishers", filter: "event_id=eq.active-event" },
      { table: "video_state", filter: "event_id=eq.active-event" },
      { table: "runners", filter: "event_id=eq.active-event" },
    ],
    () => {
      void loadDashboardData().catch(() => null);
    },
    true,
  );

  const currentTimeLabel = useMemo(() => formatClock(localTime), [localTime]);
  const raceStartLabel = useMemo(
    () => formatRaceMoment(raceResponse.race.raceStartTimeIso, "Not started"),
    [raceResponse.race.raceStartTimeIso],
  );
  const raceEndLabel = useMemo(
    () => formatRaceMoment(raceResponse.race.raceEndTimeIso, "Not ended"),
    [raceResponse.race.raceEndTimeIso],
  );
  const latestFinisher = useMemo(
    () => mapLatestFinisher(manualFeed.entries[0] ?? null),
    [manualFeed.entries],
  );
  const selectedCameraLabel = useMemo(
    () => {
      if (camera.selectedDeviceMissing) {
        return "Locked Camera Missing";
      }

      return (
        camera.devices.find((device) => device.deviceId === camera.selectedDeviceId)?.label ??
        (camera.selectedDeviceId ? "Selected Camera" : "No camera selected")
      );
    },
    [camera.devices, camera.selectedDeviceId, camera.selectedDeviceMissing],
  );
  const effectivePublishStatus = useMemo(
    () =>
      getEffectiveVideoPublishStatus(
        raceResponse.video,
        localTime?.getTime() ?? Date.now(),
      ),
    [localTime, raceResponse.video],
  );
  const broadcastError = useMemo(() => {
    if (publisher.error) {
      return publisher.error;
    }

    if (publisher.status === "idle" && effectivePublishStatus === "error") {
      return "Camera broadcast heartbeat expired. Restart the live feed from this dashboard.";
    }

    return null;
  }, [effectivePublishStatus, publisher.error, publisher.status]);

  const handleCameraSourceChange = (value: string) => {
    if (publisher.status !== "idle") {
      setActionMessage("Stop the live broadcast before switching the camera source.");
      return;
    }

    camera.setSelectedDeviceId(value);
    setSettings((current) => ({
      ...current,
      cameraSource: value,
    }));

    if (camera.status === "connected") {
      void camera.startCamera(value);
    }
  };

  const handleDownloadExport = async (format: ExportFormat) => {
    setDownloadingFormat(format);

    try {
      const response = await fetch(`/api/export?format=${format}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to export the event backup.");
      }

      const blob = await response.blob();
      const fileName = getDownloadedFileName(
        response.headers.get("Content-Disposition"),
        `tek-run-export.${format}`,
      );
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      const exportedAt = new Date().toISOString();
      setLastExportedAt(exportedAt);
      setActionMessage(`${format.toUpperCase()} export downloaded.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to export event data.");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleRaceAction = async (action: "start" | "end" | "reset" | "update") => {
    const response = await fetch("/api/race", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        eventName: eventNameDraft.trim(),
      }),
    });
    const payload = (await response.json()) as RaceResponse & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to update race state.");
    }

    setRaceResponse(payload);
    setActionMessage(
      action === "start"
        ? "Race started."
        : action === "end"
          ? "Race ended. Export the final backup from Operations Dashboard."
          : action === "reset"
            ? "Race reset and finishers cleared."
            : "Event name updated.",
    );

    await loadDashboardData();
    await runHealthCheck();
  };

  const handleConfirmedRaceAction = async (action: "start" | "end" | "reset" | "update") => {
    try {
      if (action === "end") {
        const confirmed = window.confirm(
          "End the race now? This freezes the official finish window and prepares the final export.",
        );

        if (!confirmed) {
          return;
        }
      }

      if (action === "reset") {
        const confirmed = window.confirm(
          "Reset the race and clear all logged finishers? This action cannot be undone from the operator screen.",
        );

        if (!confirmed) {
          return;
        }

        await publisher.stopPublishing();
        camera.stopCamera();
      }

      await handleRaceAction(action);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to update race state.");
    }
  };

  const handleSaveEventName = async () => {
    setIsSavingEventName(true);

    try {
      await handleRaceAction("update");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to save event name.");
    } finally {
      setIsSavingEventName(false);
    }
  };

  const handleImportMasterlist = async () => {
    if (!selectedImportFile) {
      setImportMessage("Choose an .xlsx masterlist file first.");
      return;
    }

    const confirmed = window.confirm(
      "Replace the current runner masterlist with this workbook? Use this only after verifying the upload file.",
    );

    if (!confirmed) {
      return;
    }

    setIsImporting(true);
    setImportMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedImportFile);

      const response = await fetch("/api/masterlist/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        importedCount?: number;
        skippedCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import the masterlist.");
      }

      setImportMessage(
        `Imported ${payload.importedCount ?? 0} runners. Skipped ${payload.skippedCount ?? 0} invalid rows.`,
      );
      await loadDashboardData();
      await runHealthCheck();
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Unable to import masterlist.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleGoLive = async () => {
    if (!camera.selectedDeviceId) {
      setActionMessage("Select a camera source first.");
      return;
    }

    if (camera.selectedDeviceMissing) {
      setActionMessage("The locked camera is missing. Reconnect it or choose another source.");
      return;
    }

    try {
      const previewStream = await camera.startCamera(camera.selectedDeviceId);
      const previewTrack = previewStream?.getVideoTracks()[0] ?? null;

      if (!previewTrack) {
        throw new Error("Unable to start the selected camera feed.");
      }

      await publisher.publishSlot({
        deviceId: camera.selectedDeviceId,
        slot: "test-camera",
        label: selectedCameraLabel === "No camera selected" ? "Operator Camera" : selectedCameraLabel,
        previewTrack,
      });
      setActionMessage(`${selectedCameraLabel} is now live on the public display.`);
      await loadDashboardData();
      await runHealthCheck();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to start the live camera broadcast.");
    }
  };

  const handleStopCamera = async () => {
    try {
      if (publisher.status !== "idle") {
        await publisher.stopPublishing();
      }

      camera.stopCamera();
      await loadDashboardData().catch(() => null);
      await runHealthCheck().catch(() => null);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to stop the camera feed.");
    }
  };

  const handleStopBroadcast = async () => {
    try {
      await publisher.stopPublishing();
      setActionMessage("Broadcast stopped.");
      await loadDashboardData().catch(() => null);
      await runHealthCheck().catch(() => null);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to stop the live broadcast.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-[1560px] flex-col gap-4 px-4 py-4 lg:px-5 lg:py-5">
        <TopBar />

        {actionMessage ? (
          <div className="rounded-[18px] border border-white bg-white px-4 py-3 text-sm font-semibold text-black">
            {actionMessage}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,430px)]">
          <section className="space-y-4">
            <OperatorControls
              currentTimeLabel={currentTimeLabel}
              onEndRaceNow={() => void handleConfirmedRaceAction("end")}
              onRestartRace={() => void handleConfirmedRaceAction("reset")}
              onStartRaceNow={() => void handleConfirmedRaceAction("start")}
              raceEndedTimeLabel={raceEndLabel}
              raceStartTimeLabel={raceStartLabel}
              raceStatus={raceResponse.race.raceStatus}
            />

            <CameraPanel
              broadcastError={broadcastError}
              broadcastStatus={
                publisher.status === "idle" ? effectivePublishStatus : publisher.status
              }
              devices={camera.devices}
              error={camera.error}
              liveSourceLabel={raceResponse.video.activeSourceLabel}
              onDeviceChange={handleCameraSourceChange}
              onGoLive={() => void handleGoLive()}
              onStartCamera={() => void camera.startCamera()}
              onStopBroadcast={() => void handleStopBroadcast()}
              onStopCamera={() => void handleStopCamera()}
              selectedCameraLabel={selectedCameraLabel}
              selectedDeviceId={camera.selectedDeviceId}
              status={camera.status}
              stream={camera.stream}
            />
          </section>

          <aside className="space-y-4">
            <RaceAdminPanel
              counts={raceResponse.counts}
              eventNameDraft={eventNameDraft}
              importMessage={importMessage}
              isImporting={isImporting}
              isSavingEventName={isSavingEventName}
              onEventNameChange={setEventNameDraft}
              onImportFileChange={setSelectedImportFile}
              onImportMasterlist={handleImportMasterlist}
              onSaveEventName={handleSaveEventName}
              race={raceResponse.race}
            />

            <OperationsPanel
              browserOnline={browserOnline}
              cameraPermission={cameraPermission}
              cameraState={camera.status}
              downloadingFormat={downloadingFormat}
              health={health}
              isRunningHealthCheck={isRunningHealthCheck}
              lastExportedAt={lastExportedAt}
              latestFinisherAt={manualFeed.entries[0]?.clockFinishTime ?? null}
              onDownload={(format) => void handleDownloadExport(format)}
              onRunHealthCheck={() => void runHealthCheck()}
              raceEnded={raceResponse.race.raceStatus === "ended"}
              selectedCameraLabel={selectedCameraLabel}
              selectedDeviceMissing={camera.selectedDeviceMissing}
            />

            <LatestFinisherCard
              currentTimeLabel={currentTimeLabel}
              eventName={raceResponse.race.eventName}
              finisher={latestFinisher}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
