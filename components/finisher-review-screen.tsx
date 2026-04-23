"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { formatNullableTime } from "@/lib/theme";
import type {
  FinisherReviewFeed,
  FinisherReviewRecord,
  FinisherReviewUpdatePayload,
  RaceDivision,
  ReviewStatus,
} from "@/lib/types";

type ReviewFilter = "all" | ReviewStatus;

interface ReviewDraft {
  bibNumber: string;
  runnerName: string;
  division: "" | RaceDivision;
  reviewStatus: ReviewStatus;
  elapsedRaceTime: string;
}

function createEmptyFeed(): FinisherReviewFeed {
  return {
    entries: [],
    race: {
      id: "active-event",
      eventName: "Community Run 2026",
      raceStatus: "idle",
      raceStartTimeIso: null,
      raceEndTimeIso: null,
      updatedAt: new Date().toISOString(),
    },
    counts: {
      totalRunners: 0,
      totalFinishers: 0,
      verifiedFinishers: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

function createDraft(entry: FinisherReviewRecord | null): ReviewDraft {
  if (!entry) {
    return {
      bibNumber: "",
      runnerName: "",
      division: "",
      reviewStatus: "needs review",
      elapsedRaceTime: "00:00:00",
    };
  }

  return {
    bibNumber: entry.bibNumber,
    runnerName: entry.runnerName ?? "",
    division: entry.division ?? "",
    reviewStatus: entry.reviewStatus,
    elapsedRaceTime: entry.elapsedRaceTime,
  };
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  })
    .format(new Date(value))
    .replace("AM", "A.M.")
    .replace("PM", "P.M.");
}

function getFilterCount(entries: FinisherReviewRecord[], filter: ReviewFilter) {
  if (filter === "all") {
    return entries.length;
  }

  return entries.filter((entry) => entry.reviewStatus === filter).length;
}

function getVisibleStatus(entry: FinisherReviewRecord) {
  if (entry.warning === "unknown" && entry.reviewStatus === "needs review") {
    return "unknown";
  }

  return entry.reviewStatus;
}

export function FinisherReviewScreen() {
  const [feed, setFeed] = useState<FinisherReviewFeed>(createEmptyFeed);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>(createDraft(null));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch("/api/finishers", {
        cache: "no-store",
      });
      const nextFeed = (await response.json()) as FinisherReviewFeed & { error?: string };

      if (!response.ok) {
        throw new Error(nextFeed.error ?? "Unable to load finisher review feed.");
      }

      setFeed(nextFeed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load finisher review feed.");
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useFirebaseRealtime(
    "finisher-review-screen",
    [
      { table: "race_events", filter: "id=eq.active-event" },
      { table: "finishers", filter: "event_id=eq.active-event" },
    ],
    () => {
      void loadFeed();
    },
    true,
  );

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return feed.entries.filter((entry) => {
      if (filter !== "all" && entry.reviewStatus !== filter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        entry.bibNumber.toLowerCase().includes(normalizedSearch) ||
        (entry.runnerName ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [feed.entries, filter, search]);

  const selectedEntry = useMemo(
    () => feed.entries.find((entry) => entry.id === selectedId) ?? null,
    [feed.entries, selectedId],
  );

  useEffect(() => {
    if (feed.entries.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    if (!selectedId || !feed.entries.some((entry) => entry.id === selectedId)) {
      setSelectedId(feed.entries[0]?.id ?? null);
    }
  }, [feed.entries, selectedId]);

  useEffect(() => {
    setDraft(createDraft(selectedEntry));
  }, [selectedEntry]);

  const handleSave = async (statusOverride?: ReviewStatus) => {
    if (!selectedEntry || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const payload: FinisherReviewUpdatePayload = {
        bibNumber: draft.bibNumber,
        runnerName: draft.runnerName,
        division: draft.division || null,
        reviewStatus: statusOverride ?? draft.reviewStatus,
        elapsedRaceTime: draft.elapsedRaceTime,
      };

      const response = await fetch(`/api/finishers/${selectedEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const nextState = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(nextState.error ?? "Unable to update finisher.");
      }

      setMessage(statusOverride === "verified" ? "Finisher verified." : "Changes saved.");
      await loadFeed();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update finisher.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry || isDeleting) {
      return;
    }

    const confirmed = window.confirm(`Delete finisher ${selectedEntry.bibNumber}?`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/finishers/${selectedEntry.id}`, {
        method: "DELETE",
      });
      const nextState = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(nextState.error ?? "Unable to delete finisher.");
      }

      setMessage("Finisher deleted.");
      setSelectedId(null);
      await loadFeed();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete finisher.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-[1760px] flex-col gap-6 px-4 py-4 md:px-8 md:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-[18px] border border-white bg-white px-4 py-2 text-xs font-extrabold tracking-[0.16em] text-black transition hover:bg-[#efefef]"
            >
              OPERATOR
            </Link>
            <Link
              href="/manual-entry"
              className="rounded-[18px] border border-white px-4 py-2 text-xs font-extrabold tracking-[0.16em] text-white transition hover:bg-white hover:text-black"
            >
              MANUAL
            </Link>
            <Link
              href="/public-display"
              target="_blank"
              className="rounded-[18px] border border-white px-4 py-2 text-xs font-extrabold tracking-[0.16em] text-white transition hover:bg-white hover:text-black"
            >
              PUBLIC
            </Link>
          </div>

          <p className="text-right text-[11px] font-bold uppercase tracking-[0.28em] text-white/60">
            Updated {formatUpdatedAt(feed.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/55">
              Finisher Review
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Review Finishers
            </h1>
            <p className="mt-2 text-sm font-semibold text-white/70">
              Simple edit and verify screen for the shared finishers database.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white bg-white px-4 py-4 text-black">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/50">
                Total Finishers
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black">
                {feed.counts.totalFinishers}
              </p>
            </div>
            <div className="rounded-[24px] border border-white bg-white px-4 py-4 text-black">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/50">
                Verified
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black">
                {feed.counts.verifiedFinishers}
              </p>
            </div>
            <div className="rounded-[24px] border border-white bg-white px-4 py-4 text-black">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/50">
                Race Status
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black">
                {feed.race.raceStatus}
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-[22px] border border-white bg-white px-4 py-3 text-sm font-bold text-black">
            {message}
          </div>
        ) : null}

        <div className="grid flex-1 gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
          <section className="flex min-h-[640px] flex-col rounded-[32px] border border-white bg-white text-black">
            <div className="border-b border-black px-5 py-5">
              <div className="flex flex-col gap-4">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search bib or runner"
                  className="w-full rounded-[18px] border border-black bg-white px-4 py-3 text-sm font-semibold outline-none"
                />

                <div className="flex flex-wrap gap-2">
                  {(["all", "needs review", "verified", "duplicate"] as ReviewFilter[]).map(
                    (option) => {
                      const active = filter === option;
                      const label =
                        option === "all"
                          ? "ALL"
                          : option === "needs review"
                            ? "REVIEW"
                            : option === "verified"
                              ? "VERIFIED"
                              : "DUPLICATE";

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFilter(option)}
                          className={`rounded-[18px] border px-4 py-2 text-xs font-extrabold tracking-[0.14em] transition ${
                            active
                              ? "border-black bg-black text-white"
                              : "border-black bg-white text-black hover:bg-black hover:text-white"
                          }`}
                        >
                          {label} {getFilterCount(feed.entries, option)}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {filteredEntries.map((entry) => {
                  const active = entry.id === selectedId;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black bg-white text-black hover:bg-[#f2f2f2]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-[family-name:var(--font-display)] text-3xl font-black leading-none">
                            {entry.bibNumber}
                          </p>
                          <p className="mt-2 text-sm font-bold">
                            {entry.runnerName ?? "NO NAME"}
                          </p>
                        </div>
                        <div className="text-right text-xs font-bold uppercase tracking-[0.14em]">
                          <p>#{entry.rowNumber}</p>
                          <p className="mt-2">{entry.elapsedRaceTime}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.14em]">
                        <span>{getVisibleStatus(entry)}</span>
                        <span>{entry.division ?? "no division"}</span>
                      </div>
                    </button>
                  );
                })}

                {filteredEntries.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-black px-4 py-10 text-center text-sm font-bold uppercase tracking-[0.18em] text-black/60">
                    No finishers match this filter.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white bg-white text-black">
            {selectedEntry ? (
              <div className="flex h-full flex-col">
                <div className="border-b border-black px-6 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-black/55">
                    Selected Entry
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none">
                    {selectedEntry.bibNumber}
                  </h2>
                </div>

                <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.28em] text-black/55">
                        Bib Number
                      </label>
                      <input
                        value={draft.bibNumber}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, bibNumber: event.target.value.toUpperCase() }))
                        }
                        className="w-full rounded-[18px] border border-black bg-white px-4 py-3 text-lg font-extrabold outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.28em] text-black/55">
                        Runner Name
                      </label>
                      <input
                        value={draft.runnerName}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, runnerName: event.target.value }))
                        }
                        className="w-full rounded-[18px] border border-black bg-white px-4 py-3 text-lg font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.28em] text-black/55">
                        Elapsed Time
                      </label>
                      <input
                        value={draft.elapsedRaceTime}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, elapsedRaceTime: event.target.value }))
                        }
                        placeholder="00:00:00"
                        className="w-full rounded-[18px] border border-black bg-white px-4 py-3 text-lg font-extrabold tracking-wider outline-none font-[family-name:var(--font-mono,monospace)]"
                      />
                      <p className="mt-1.5 text-[10px] font-bold text-black/40">Format: HH:MM:SS — this changes leaderboard ranking</p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.28em] text-black/55">
                          Division
                        </label>
                        <select
                          value={draft.division}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              division: event.target.value as "" | RaceDivision,
                            }))
                          }
                          className="w-full rounded-[18px] border border-black bg-white px-4 py-3 text-base font-bold outline-none"
                        >
                          <option value="">Unset</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.28em] text-black/55">
                          Review Status
                        </label>
                        <select
                          value={draft.reviewStatus}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              reviewStatus: event.target.value as ReviewStatus,
                            }))
                          }
                          className="w-full rounded-[18px] border border-black bg-white px-4 py-3 text-base font-bold outline-none"
                        >
                          <option value="verified">Verified</option>
                          <option value="needs review">Needs Review</option>
                          <option value="duplicate">Duplicate</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving || isDeleting}
                        className="rounded-[18px] border border-black bg-black px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-black disabled:opacity-45"
                      >
                        {isSaving ? "Saving" : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSave("verified")}
                        disabled={isSaving || isDeleting}
                        className="rounded-[18px] border border-black bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white disabled:opacity-45"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        disabled={isSaving || isDeleting}
                        className="rounded-[18px] border border-black bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white disabled:opacity-45"
                      >
                        {isDeleting ? "Deleting" : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-black px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/50">
                        Sequence
                      </p>
                      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black">
                        #{selectedEntry.rowNumber}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-black px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/50">
                        Elapsed Time
                      </p>
                      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black">
                        {selectedEntry.elapsedRaceTime}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-black px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/50">
                        Logged At
                      </p>
                      <p className="mt-2 text-base font-bold">
                        {formatNullableTime(selectedEntry.clockFinishTime)}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-black px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/50">
                        Source
                      </p>
                      <p className="mt-2 text-base font-bold uppercase">
                        {selectedEntry.source}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[640px] items-center justify-center px-6 text-center">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
                    No Finisher Selected
                  </p>
                  <p className="mt-3 text-sm font-semibold text-black/65">
                    Pick a finisher from the list to edit, verify, or delete it.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
