import { finisherStatusConfig, formatNullableTime, sectionTitleClass, sourceConfig } from "@/lib/theme";
import type { FinisherRecord } from "@/lib/types";
import { StatusChip } from "@/components/status-chip";

interface LatestFinisherCardProps {
  currentTimeLabel?: string;
  eventName: string;
  finisher: FinisherRecord | null;
  variant?: "operator" | "public";
}

export function LatestFinisherCard({
  currentTimeLabel,
  eventName,
  finisher,
  variant = "operator",
}: LatestFinisherCardProps) {
  const isPublic = variant === "public";

  if (!finisher) {
    return (
      <section className="panel-card p-5 lg:p-6">
        <h2 className={sectionTitleClass}>Latest Finisher</h2>
        <p className="mt-4 rounded-[24px] bg-[#F6F6F6] px-5 py-8 text-center text-sm font-medium text-[#5E5763]">
          No finisher has been logged yet.
        </p>
      </section>
    );
  }

  if (!isPublic) {
    return (
      <section className="panel-card p-5 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7A7185]">
                Latest Finisher
              </p>
              <h2 className={`${sectionTitleClass} mt-2`}>Latest Logged Result</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusChip
                label={sourceConfig[finisher.source].label}
                tone={sourceConfig[finisher.source].tone}
              />
              <StatusChip
                label={finisherStatusConfig[finisher.status].label}
                tone={finisherStatusConfig[finisher.status].tone}
              />
            </div>
          </div>

          <div className="rounded-[28px] bg-[#FAFAFA] px-5 py-5 ring-1 ring-[#1F1F1F]/6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                  Bib Number
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-5xl font-black tracking-tight text-[#1F1F1F]">
                  {finisher.bibNumber}
                </p>
                <p className="mt-2 text-lg font-bold text-[#1F1F1F]">
                  {finisher.runnerName}
                </p>
              </div>

              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-[#1F1F1F]/6">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                  Finish Time
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1F1F1F]">
                  {finisher.finishTime}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-[#1F1F1F]/6">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                  Place
                </p>
                <p className="mt-2 text-base font-bold text-[#1F1F1F]">#{finisher.place}</p>
              </div>
              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-[#1F1F1F]/6">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                  Logged At
                </p>
                <p className="mt-2 text-base font-bold text-[#1F1F1F]">
                  {formatNullableTime(finisher.loggedAt)}
                </p>
              </div>
              <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-[#1F1F1F]/6">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                  Event
                </p>
                <p className="mt-2 text-base font-bold text-[#1F1F1F]">{eventName}</p>
              </div>
            </div>

            {currentTimeLabel ? (
              <p className="mt-4 text-right text-xs font-bold uppercase tracking-[0.28em] text-[#7A7185]">
                Local clock {currentTimeLabel}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={isPublic ? "gradient-shell rounded-[32px] p-1.5" : "panel-card p-5 lg:p-6"}>
      <div className={isPublic ? "rounded-[30px] bg-white p-6 lg:p-8" : ""}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7A7185]">
                Latest Finisher
              </p>
              <h2
                className={`${sectionTitleClass} ${isPublic ? "mt-2 text-2xl lg:text-3xl" : "mt-2"}`}
              >
                Race Bib Placard
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusChip
                label={sourceConfig[finisher.source].label}
                tone={sourceConfig[finisher.source].tone}
              />
              <StatusChip
                label={finisherStatusConfig[finisher.status].label}
                tone={finisherStatusConfig[finisher.status].tone}
              />
            </div>
          </div>

          <div className="gradient-shell rounded-[30px] p-[1px] shadow-[0_24px_44px_-30px_rgba(76,5,228,0.7)]">
            <div className="rounded-[29px] bg-white px-5 py-5 lg:px-6 lg:py-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                    Event
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight text-[#1F1F1F]">
                    {eventName}
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#F7F5FA] px-4 py-3 text-right ring-1 ring-[#4C05E4]/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                    Place
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black text-[#1F1F1F]">
                    #{finisher.place}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] bg-[#FAFAFA] px-5 py-6 ring-1 ring-[#1F1F1F]/6">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#8A8492]">
                  Bib Number
                </p>
                <p
                  className={`mt-2 bg-gradient-to-r from-[#4C05E4] via-[#7701A6] to-[#A00063] bg-clip-text font-[family-name:var(--font-display)] font-black tracking-[-0.06em] text-transparent ${
                    isPublic ? "text-7xl lg:text-8xl" : "text-6xl"
                  }`}
                >
                  {finisher.bibNumber}
                </p>
                <p className="mt-3 text-lg font-bold text-[#1F1F1F] lg:text-xl">
                  {finisher.runnerName}
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                    Finish Time
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1F1F1F]">
                    {finisher.finishTime}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                    Last Detection
                  </p>
                  <p className="mt-2 text-base font-bold text-[#1F1F1F]">
                    {formatNullableTime(finisher.loggedAt)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                    Confidence
                  </p>
                  <p className="mt-2 text-base font-bold text-[#1F1F1F]">
                    {Math.round(finisher.confidence * 100)}%
                  </p>
                </div>
              </div>

              {currentTimeLabel ? (
                <p className="mt-4 text-right text-xs font-bold uppercase tracking-[0.28em] text-[#7A7185]">
                  Local clock {currentTimeLabel}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
