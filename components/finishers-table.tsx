"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn, finisherStatusConfig, sectionTitleClass, sourceConfig } from "@/lib/theme";
import type { FinisherRecord } from "@/lib/types";
import { StatusChip } from "@/components/status-chip";

interface FinishersTableProps {
  autoScroll: boolean;
  finishers: FinisherRecord[];
  limit?: number;
  variant?: "operator" | "public";
}

export function FinishersTable({
  autoScroll,
  finishers,
  limit = 10,
  variant = "operator",
}: FinishersTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleFinishers = useMemo(() => finishers.slice(-limit), [finishers, limit]);

  useEffect(() => {
    if (!autoScroll || !containerRef.current) {
      return;
    }

    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [autoScroll, visibleFinishers]);

  return (
    <section className="panel-card p-5 lg:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className={sectionTitleClass}>
            {variant === "public" ? "Recent Top Finishers" : "Recent Finishers"}
          </h2>
          <p className="mt-1 text-sm font-medium text-[#605965]">
            Latest {visibleFinishers.length} records in chronological order.
          </p>
        </div>
        <div className="rounded-full bg-[#F7F5FA] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#7701A6] ring-1 ring-[#4C05E4]/10">
          Auto-scroll {autoScroll ? "On" : "Off"}
        </div>
      </div>

      {visibleFinishers.length === 0 ? (
        <div className="mt-5 rounded-[26px] bg-[#F7F7F7] px-5 py-10 text-center text-sm font-medium text-[#605965] ring-1 ring-[#1F1F1F]/6">
          Finish records will appear here once logging starts.
        </div>
      ) : (
        <div
          ref={containerRef}
          className={cn(
            "scrollbar-slim mt-5 overflow-auto rounded-[26px] border border-[#1F1F1F]/6 bg-white",
            variant === "public" ? "max-h-[420px]" : "max-h-[390px]",
          )}
        >
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-white/92 backdrop-blur">
              <tr className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7A7185]">
                <th className="px-4 py-4">Place</th>
                <th className="px-4 py-4">Bib Number</th>
                <th className="px-4 py-4">Runner Name</th>
                <th className="px-4 py-4">Finish Time</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleFinishers.map((finisher, index) => {
                const isNewest = index === visibleFinishers.length - 1;

                return (
                  <tr
                    key={finisher.id}
                    className={cn(
                      "border-t border-[#1F1F1F]/6 align-top",
                      isNewest && "bg-gradient-to-r from-[#4C05E4]/8 via-[#A00063]/6 to-transparent",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-[family-name:var(--font-display)] text-xl font-black text-[#1F1F1F]">
                          {finisher.place}
                        </span>
                        {isNewest ? (
                          <StatusChip label="Newest" tone="gradient" className="shrink-0" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "font-[family-name:var(--font-display)] font-black tracking-tight text-[#1F1F1F]",
                          variant === "public" ? "text-3xl" : "text-2xl",
                        )}
                      >
                        {finisher.bibNumber}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#1F1F1F]">
                      {finisher.runnerName}
                    </td>
                    <td className="px-4 py-4 font-[family-name:var(--font-display)] text-lg font-extrabold text-[#1F1F1F]">
                      {finisher.finishTime}
                    </td>
                    <td className="px-4 py-4">
                      <StatusChip
                        label={sourceConfig[finisher.source].label}
                        tone={sourceConfig[finisher.source].tone}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <StatusChip
                        label={finisherStatusConfig[finisher.status].label}
                        tone={finisherStatusConfig[finisher.status].tone}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
