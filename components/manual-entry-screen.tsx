"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { useLocalTime } from "@/hooks/use-local-time";
import { useManualEntryQueue } from "@/hooks/use-manual-entry-queue";
import {
  DASHBOARD_SETTINGS_STORAGE_KEY,
  DASHBOARD_SETTINGS_UPDATED_EVENT,
  defaultDashboardSettings,
  readDashboardSettings,
} from "@/lib/dashboard-settings";
import type {
  DashboardSettings,
  ManualEntryFeed,
  ManualEntryRecord,
  ManualEntrySaveResponse,
} from "@/lib/types";

function createEmptyFeed(): ManualEntryFeed {
  return {
    entries: [],
    race: {
      id: "active-event",
      eventName: defaultDashboardSettings.eventName,
      raceStatus: "idle",
      raceStartTimeIso: null,
      raceEndTimeIso: null,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
    masterlistPath: "",
    resultsPath: "",
  };
}

function formatElapsedClock(
  currentTime: Date | null,
  raceStatus: ManualEntryFeed["race"]["raceStatus"],
  raceStartTimeIso: string | null,
  raceEndTimeIso: string | null,
) {
  if (!raceStartTimeIso) {
    return "0:00:00";
  }

  const raceStart = new Date(raceStartTimeIso);

  if (Number.isNaN(raceStart.getTime())) {
    return "0:00:00";
  }

  const referenceTime =
    raceStatus === "ended" && raceEndTimeIso ? new Date(raceEndTimeIso) : currentTime;

  if (!referenceTime || Number.isNaN(referenceTime.getTime())) {
    return "0:00:00";
  }

  const totalSeconds = Math.max(0, Math.floor((referenceTime.getTime() - raceStart.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString();
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function getWarningCopy(entry: ManualEntryRecord | null) {
  if (!entry) {
    return null;
  }

  if (entry.warning === "duplicate") {
    return "Duplicate bib saved with warning.";
  }

  if (entry.warning === "unknown") {
    return "Bib saved, but no masterlist match was found.";
  }

  return "Entry saved.";
}

function getEntryAccent(entry: ManualEntryRecord) {
  if (entry.warning === "duplicate") {
    return "text-[#ff7d7d]";
  }

  if (entry.warning === "unknown") {
    return "text-[#ffd36e]";
  }

  if (entry.division === "female") {
    return "text-[#ff5bbd]";
  }

  return "text-[#59a5ff]";
}

export function ManualEntryScreen() {
  const localTime = useLocalTime(200);
  const pageRef = useRef<HTMLElement>(null);
  const [settings, setSettings] = useState(defaultDashboardSettings);
  const [digits, setDigits] = useState("");
  const [feed, setFeed] = useState<ManualEntryFeed>(createEmptyFeed);
  const [latestSaved, setLatestSaved] = useState<ManualEntryRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState("Keyboard ready. Type the bib and press Enter.");
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "warning" | "error">(
    "neutral",
  );

  const focusPage = useCallback(() => {
    window.requestAnimationFrame(() => {
      pageRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const syncSettings = useCallback(() => {
    setSettings(readDashboardSettings());
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const response = await fetch("/api/manual-entry", {
        cache: "no-store",
      });
      const nextFeed = (await response.json()) as ManualEntryFeed & { error?: string };

      if (!response.ok) {
        throw new Error(nextFeed.error ?? "Unable to load manual entry feed.");
      }

      setFeed(nextFeed);
      setLatestSaved((current) => current ?? nextFeed.entries[0] ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load manual entry feed.";
      setStatusMessage(message);
      setStatusTone("error");
    }
  }, []);

  const handleQueuedEntrySaved = useCallback(
    (payload: ManualEntrySaveResponse) => {
      setLatestSaved(payload.entry);
      setStatusMessage(
        payload.duplicateDetected
          ? (payload.duplicateReason ?? "Duplicate bib saved with warning.")
          : getWarningCopy(payload.entry) ?? "Entry saved.",
      );
      setStatusTone(payload.duplicateDetected || payload.unknownBib ? "warning" : "success");

      if (settings.soundAlert) {
        window.navigator.vibrate?.(35);
      }

      void loadEntries();
    },
    [loadEntries, settings.soundAlert],
  );

  const handleQueuedEntryFailed = useCallback(
    (message: string, item: { bibNumber: string }, retriable: boolean) => {
      setStatusMessage(
        retriable
          ? `Queued ${item.bibNumber}. Waiting for connection and automatic retry.`
          : `Manual save failed for ${item.bibNumber}: ${message}`,
      );
      setStatusTone(retriable ? "warning" : "error");
    },
    [],
  );

  const {
    clearFailedEntries,
    enqueueEntry,
    failedCount,
    isOnline,
    isProcessing,
    pendingCount,
    queue,
    retryFailedEntries,
  } = useManualEntryQueue({
    raceStatus: feed.race.raceStatus,
    onEntrySaved: handleQueuedEntrySaved,
    onEntryFailed: handleQueuedEntryFailed,
  });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === DASHBOARD_SETTINGS_STORAGE_KEY) {
        syncSettings();
      }
    };

    const handleSettingsUpdated = () => {
      syncSettings();
    };

    syncSettings();
    void loadEntries();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(DASHBOARD_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DASHBOARD_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, [loadEntries, syncSettings]);

  useFirebaseRealtime(
    "manual-entry-screen",
    [
      { table: "race_events", filter: "id=eq.active-event" },
      { table: "finishers", filter: "event_id=eq.active-event" },
    ],
    () => {
      void loadEntries();
    },
    true,
  );

  useEffect(() => {
    if (pendingCount > 0 && !isOnline) {
      setStatusMessage(`${pendingCount} queued entr${pendingCount === 1 ? "y is" : "ies are"} waiting for the network to return.`);
      setStatusTone("warning");
    }
  }, [isOnline, pendingCount]);

  const saveEntry = useCallback(async () => {
    if (feed.race.raceStatus !== "running" || !feed.race.raceStartTimeIso) {
      setStatusMessage("Start the race on the operator dashboard before manual capture.");
      setStatusTone("error");
      focusPage();
      return;
    }

    if (digits.length === 0) {
      setStatusMessage("Type a bib number before pressing Enter.");
      setStatusTone("error");
      focusPage();
      return;
    }

    const queuedItem = enqueueEntry(digits);

    setDigits("");
    setStatusMessage(
      isOnline
        ? `Queued ${queuedItem.bibNumber}. Continue typing.${pendingCount > 0 ? ` ${pendingCount + 1} pending.` : ""}`
        : `Queued ${queuedItem.bibNumber}. Browser is offline; this entry will sync when the connection returns.`,
    );
    setStatusTone(isOnline ? "neutral" : "warning");
    focusPage();
  }, [
    digits,
    enqueueEntry,
    feed.race.raceStartTimeIso,
    feed.race.raceStatus,
    focusPage,
    isOnline,
    pendingCount,
  ]);

  useEffect(() => {
    focusPage();
  }, [focusPage]);

  useEffect(() => {
    if (!isProcessing) {
      focusPage();
    }
  }, [focusPage, isProcessing]);

  const handleCaptureKey = useCallback(
    (key: string, code: string) => {
      const topRowDigit = /^\d$/.test(key) ? key : null;
      const topRowCodeDigit = code.match(/^Digit(\d)$/)?.[1] ?? null;
      const numpadDigit = code.match(/^Numpad(\d)$/)?.[1] ?? null;
      const nextDigit = topRowDigit ?? topRowCodeDigit ?? numpadDigit;

      if (nextDigit) {
        setDigits((current) => (current.length >= 4 ? current : `${current}${nextDigit}`));
        return true;
      }

      if (key === "Backspace" || key === "Delete") {
        setDigits((current) => current.slice(0, -1));
        return true;
      }

      if (key === "Enter" || code === "NumpadEnter") {
        void saveEntry();
        return true;
      }

      if (key === "Escape") {
        setDigits("");
        return true;
      }

      return false;
    },
    [saveEntry],
  );

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (handleCaptureKey(event.key, event.code)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleWindowKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleWindowKeyDown, true);
    };
  }, [handleCaptureKey]);

  const elapsedClock = useMemo(
    () =>
      formatElapsedClock(
        localTime,
        feed.race.raceStatus,
        feed.race.raceStartTimeIso,
        feed.race.raceEndTimeIso,
      ),
    [feed.race.raceEndTimeIso, feed.race.raceStartTimeIso, feed.race.raceStatus, localTime],
  );

  const normalizedPreview = useMemo(() => digits.padStart(4, "0"), [digits]);
  const slotValues = useMemo(() => normalizedPreview.split(""), [normalizedPreview]);
  const featuredEntry = latestSaved ?? feed.entries[0] ?? null;
  const queueEntries = useMemo(
    () =>
      featuredEntry
        ? feed.entries.filter((entry) => entry.id !== featuredEntry.id).slice(0, 3)
        : feed.entries.slice(0, 3),
    [feed.entries, featuredEntry],
  );
  const queuedEntriesPreview = useMemo(
    () => [...queue].reverse().slice(0, 4),
    [queue],
  );
  const statusClass =
    statusTone === "error"
      ? "text-[#ff8d8d]"
      : statusTone === "warning"
        ? "text-[#ffd36e]"
        : statusTone === "success"
          ? "text-[#84f1a7]"
          : "text-white/56";

  return (
    <div className="min-h-screen bg-black text-white">
      <main
        ref={pageRef}
        tabIndex={-1}
        className="relative mx-auto flex min-h-screen w-full max-w-[1720px] flex-col px-4 py-4 md:px-8 md:py-6"
        onPointerDown={focusPage}
      >
        <div className="flex items-start justify-between">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[18px] border border-white/16 bg-white px-4 py-2 text-xs font-extrabold tracking-[0.16em] text-black transition hover:bg-[#f1f1f1]"
          >
            OPERATOR
          </Link>

          <div className="text-right text-[11px] font-bold uppercase tracking-[0.3em] text-white/34">
            <div>{feed.race.raceStatus}</div>
            <div className={isOnline ? "text-[#84f1a7]" : "text-[#ffd36e]"}>
              {isOnline ? "online" : "offline"}
            </div>
          </div>
        </div>

        <div className="lg:mr-[360px]">
          <div className="mt-4 flex justify-center">
            <div className="flex flex-col items-center">
              <p className="text-center text-[18px] font-black uppercase tracking-[0.08em] text-white">
                ELAPSED TIME
              </p>
              <div className="mt-2 rounded-[34px] border-[6px] border-white px-8 py-3">
                <div className="overlay-digital-font text-center text-[58px] font-bold leading-none text-white md:text-[76px]">
                  {elapsedClock}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full">
              <div className="mx-auto mt-8 grid max-w-[1180px] grid-cols-2 gap-4 md:mt-12 md:grid-cols-4 md:gap-8">
                {slotValues.map((value, index) => (
                  <div
                    key={`${value}-${index}`}
                    className="flex min-h-[220px] items-center justify-center rounded-[30px] bg-white text-black md:min-h-[300px] xl:min-h-[360px]"
                  >
                    <span className="font-[family-name:var(--font-display)] text-[112px] font-extrabold leading-none md:text-[150px] xl:text-[200px]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void saveEntry()}
                  disabled={feed.race.raceStatus !== "running"}
                  className="overlay-title-font inline-flex min-w-[280px] items-center justify-center rounded-[28px] bg-white px-10 py-4 text-[40px] leading-none text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45 md:min-w-[320px] md:text-[46px]"
                >
                  ENTER
                </button>

                <p className={`mt-4 text-center text-sm font-bold tracking-[0.08em] ${statusClass}`}>
                  {statusMessage}
                </p>
                <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  {pendingCount} pending | {failedCount} failed | {isProcessing ? "syncing" : "ready"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="mt-8 w-full max-w-[360px] self-center rounded-[30px] bg-white px-5 py-4 text-black lg:hidden">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-5">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="overlay-title-font text-[20px] leading-none text-black">
                    QUEUE
                  </p>
                  <span className="rounded-full border border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                    {pendingCount} pending
                  </span>
                </div>

                <div className="space-y-2.5">
                  {queuedEntriesPreview.map((entry) => (
                    <div key={entry.requestId} className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0 text-[16px] font-extrabold leading-none text-black">
                        <span>{entry.bibNumber}</span>
                        <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-black/55">
                          {entry.status}
                        </span>
                      </div>
                      <div className="shrink-0 text-[12px] font-bold text-black/70">
                        #{entry.attemptCount}
                      </div>
                    </div>
                  ))}

                  {queuedEntriesPreview.length === 0 ? (
                    <div className="text-sm font-semibold text-black/55">No queued entries.</div>
                  ) : null}
                </div>

                {failedCount > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      className="rounded-[16px] border border-black bg-black px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white"
                      onClick={retryFailedEntries}
                    >
                      Retry Failed
                    </button>
                    <button
                      type="button"
                      className="rounded-[16px] border border-black bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-black"
                      onClick={clearFailedEntries}
                    >
                      Clear Failed
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="border-t-[3px] border-black/85 pt-4 lg:border-l-[3px] lg:border-t-0 lg:pl-5 lg:pt-0">
                <p className="overlay-title-font text-right text-[20px] leading-none text-black">
                  LATEST
                </p>

                <div className="mt-3 space-y-2.5">
                  {queueEntries.map((entry) => (
                    <div key={entry.id} className="flex items-baseline justify-between gap-3">
                      <div className={`min-w-0 text-[16px] font-extrabold leading-none ${getEntryAccent(entry)}`}>
                        <span>{entry.bibNumber}</span>
                        <span className="ml-2 truncate text-[13px]">{entry.runnerName ?? "NO NAME"}</span>
                      </div>
                      <div className="shrink-0 text-[13px] font-bold text-black">
                        {entry.elapsedRaceTime}
                      </div>
                    </div>
                  ))}

                  {queueEntries.length === 0 ? (
                    <div className="text-sm font-semibold text-black/55">No saved entries yet.</div>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="border-t-[3px] border-black/85 pt-4">
              {featuredEntry ? (
                <div className="flex flex-col gap-2 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
                  <div className={`text-[28px] font-extrabold leading-none ${getEntryAccent(featuredEntry)}`}>
                    {featuredEntry.bibNumber}
                    <span className="ml-2 text-[18px]">{featuredEntry.runnerName ?? "NO NAME"}</span>
                  </div>
                  <div className="text-[18px] font-black text-black">
                    {featuredEntry.elapsedRaceTime}
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm font-semibold text-black/55">Waiting for first save.</div>
              )}
            </div>
          </div>
        </aside>

        <section className="hidden lg:block lg:absolute lg:right-8 lg:top-[112px] lg:w-[320px] lg:rounded-[30px] lg:bg-white lg:px-5 lg:py-4 lg:text-black">
          <div className="flex items-center justify-between gap-3">
            <p className="overlay-title-font text-[20px] leading-none text-black">
              QUEUE
            </p>
            <span className="rounded-full border border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
              {pendingCount} pending
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {queuedEntriesPreview.map((entry) => (
              <div key={entry.requestId} className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 text-[16px] font-extrabold leading-none text-black">
                  <span>{entry.bibNumber}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-black/55">
                    {entry.status}
                  </span>
                </div>
                <div className="shrink-0 text-[12px] font-bold text-black/70">
                  #{entry.attemptCount}
                </div>
              </div>
            ))}

            {queuedEntriesPreview.length === 0 ? (
              <div className="text-sm font-semibold text-black/55">No queued entries.</div>
            ) : null}
          </div>

          {failedCount > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-[16px] border border-black bg-black px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white"
                onClick={retryFailedEntries}
              >
                Retry Failed
              </button>
              <button
                type="button"
                className="rounded-[16px] border border-black bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-black"
                onClick={clearFailedEntries}
              >
                Clear Failed
              </button>
            </div>
          ) : null}
        </section>

        <section className="hidden lg:block lg:absolute lg:bottom-8 lg:right-8 lg:w-[320px] lg:rounded-[30px] lg:bg-white lg:px-5 lg:py-4 lg:text-black">
          <p className="overlay-title-font text-right text-[20px] leading-none text-black">
            LATEST
          </p>

          <div className="mt-4 space-y-2.5">
            {queueEntries.map((entry) => (
              <div key={entry.id} className="flex items-baseline justify-between gap-3">
                <div className={`min-w-0 text-[16px] font-extrabold leading-none ${getEntryAccent(entry)}`}>
                  <span>{entry.bibNumber}</span>
                  <span className="ml-2 truncate text-[13px]">{entry.runnerName ?? "NO NAME"}</span>
                </div>
                <div className="shrink-0 text-[13px] font-bold text-black">
                  {entry.elapsedRaceTime}
                </div>
              </div>
            ))}

            {queueEntries.length === 0 ? (
              <div className="text-sm font-semibold text-black/55">No saved entries yet.</div>
            ) : null}
          </div>

          <div className="my-4 border-t-[3px] border-black/85" />

          {featuredEntry ? (
            <div className="text-center">
              <div className={`text-[26px] font-extrabold leading-none ${getEntryAccent(featuredEntry)}`}>
                {featuredEntry.bibNumber}
                <span className="ml-2 text-[18px]">{featuredEntry.runnerName ?? "NO NAME"}</span>
              </div>
              <div className="mt-2 text-[16px] font-bold text-black">
                {featuredEntry.elapsedRaceTime}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm font-semibold text-black/55">Waiting for first save.</div>
          )}
        </section>
      </main>
    </div>
  );
}
