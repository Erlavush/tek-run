"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type {
  ManualEntryQueueItem,
  ManualEntrySaveResponse,
  RaceStatus,
} from "@/lib/types";

const MANUAL_ENTRY_QUEUE_STORAGE_KEY = "tek-run.manual-entry-queue";

function isManualEntryQueueItem(value: unknown): value is ManualEntryQueueItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ManualEntryQueueItem>;
  return (
    typeof candidate.requestId === "string" &&
    typeof candidate.bibNumber === "string" &&
    typeof candidate.capturedAtIso === "string" &&
    typeof candidate.forceReview === "boolean" &&
    (candidate.status === "queued" ||
      candidate.status === "sending" ||
      candidate.status === "failed") &&
    (candidate.error === null || typeof candidate.error === "string") &&
    typeof candidate.attemptCount === "number" &&
    typeof candidate.createdAt === "string"
  );
}

function readStoredQueue() {
  if (typeof window === "undefined") {
    return [] as ManualEntryQueueItem[];
  }

  const stored = window.localStorage.getItem(MANUAL_ENTRY_QUEUE_STORAGE_KEY);

  if (!stored) {
    return [] as ManualEntryQueueItem[];
  }

  try {
    const parsed = JSON.parse(stored) as unknown[];
    return Array.isArray(parsed) ? parsed.filter((item) => isManualEntryQueueItem(item)) : [];
  } catch {
    return [] as ManualEntryQueueItem[];
  }
}

function persistQueue(queue: ManualEntryQueueItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MANUAL_ENTRY_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

interface UseManualEntryQueueOptions {
  raceStatus: RaceStatus;
  onEntrySaved: (payload: ManualEntrySaveResponse, item: ManualEntryQueueItem) => void;
  onEntryFailed: (message: string, item: ManualEntryQueueItem, retriable: boolean) => void;
}

export function useManualEntryQueue({
  raceStatus,
  onEntrySaved,
  onEntryFailed,
}: UseManualEntryQueueOptions) {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<ManualEntryQueueItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const hydratedQueue = readStoredQueue().map((item) => ({
      ...item,
      status: item.status === "sending" ? "queued" : item.status,
    }));

    setQueue(hydratedQueue);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    persistQueue(queue);
  }, [hasHydrated, queue]);

  const enqueueEntry = useCallback((bibNumber: string, forceReview = false) => {
    const item: ManualEntryQueueItem = {
      requestId: crypto.randomUUID(),
      bibNumber,
      capturedAtIso: new Date().toISOString(),
      forceReview,
      status: "queued",
      error: null,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
    };

    setQueue((current) => [...current, item]);

    return item;
  }, []);

  const retryFailedEntries = useCallback(() => {
    setQueue((current) =>
      current.map((item) =>
        item.status === "failed"
          ? {
              ...item,
              status: "queued",
              error: null,
            }
          : item,
      ),
    );
  }, []);

  const clearFailedEntries = useCallback(() => {
    setQueue((current) => current.filter((item) => item.status !== "failed"));
  }, []);

  const processNextEntry = useCallback(async () => {
    if (!hasHydrated || isProcessing || !isOnline) {
      return;
    }

    if (raceStatus !== "running" && raceStatus !== "ended") {
      return;
    }

    const nextItem = queue.find((item) => item.status === "queued");

    if (!nextItem) {
      return;
    }

    setIsProcessing(true);
    setQueue((current) =>
      current.map((item) =>
        item.requestId === nextItem.requestId
          ? {
              ...item,
              status: "sending",
              error: null,
            }
          : item,
      ),
    );

    try {
      const response = await fetch("/api/manual-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bibNumber: nextItem.bibNumber,
          capturedAtIso: nextItem.capturedAtIso,
          forceReview: nextItem.forceReview,
          requestId: nextItem.requestId,
        }),
      });
      const payload = (await response.json()) as ManualEntrySaveResponse & { error?: string };

      if (!response.ok) {
        const message = payload.error ?? "Unable to save queued entry.";
        const retriable = response.status >= 500;

        setQueue((current) =>
          current.map((item) =>
            item.requestId === nextItem.requestId
              ? {
                  ...item,
                  status: retriable ? "queued" : "failed",
                  error: retriable
                    ? "Server is unavailable right now. This entry will retry automatically."
                    : message,
                  attemptCount: item.attemptCount + 1,
                }
              : item,
          ),
        );
        onEntryFailed(message, nextItem, retriable);
        return;
      }

      setQueue((current) => current.filter((item) => item.requestId !== nextItem.requestId));
      onEntrySaved(payload, nextItem);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save queued entry.";
      const retriable = !navigator.onLine || error instanceof TypeError;

      setQueue((current) =>
        current.map((item) =>
          item.requestId === nextItem.requestId
            ? {
                ...item,
                status: retriable ? "queued" : "failed",
                error: retriable
                  ? "Waiting for connection. This entry will retry automatically."
                  : message,
                attemptCount: item.attemptCount + 1,
              }
            : item,
        ),
      );
      onEntryFailed(message, nextItem, retriable);
    } finally {
      setIsProcessing(false);
    }
  }, [hasHydrated, isOnline, isProcessing, onEntryFailed, onEntrySaved, queue, raceStatus]);

  useEffect(() => {
    void processNextEntry();
  }, [processNextEntry]);

  const pendingCount = useMemo(
    () => queue.filter((item) => item.status === "queued" || item.status === "sending").length,
    [queue],
  );
  const failedCount = useMemo(
    () => queue.filter((item) => item.status === "failed").length,
    [queue],
  );

  return {
    clearFailedEntries,
    enqueueEntry,
    failedCount,
    isOnline,
    isProcessing,
    pendingCount,
    queue,
    retryFailedEntries,
  };
}
