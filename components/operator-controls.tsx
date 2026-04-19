import type { RaceStatus } from "@/lib/types";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  sectionTitleClass,
  secondaryButtonClass,
  subtleButtonClass,
} from "@/lib/theme";

interface OperatorControlsProps {
  currentTimeLabel: string;
  manualBib: string;
  onClear: () => void;
  onEndRaceNow: () => void;
  onLogFinish: () => void;
  onManualBibChange: (value: string) => void;
  onMarkNeedsReview: () => void;
  onRestartRace: () => void;
  onStartRaceNow: () => void;
  raceEndedTimeLabel: string;
  raceStartTimeLabel: string;
  raceStatus: RaceStatus;
}

function getRaceStatusCopy(raceStatus: RaceStatus) {
  if (raceStatus === "running") {
    return {
      label: "Running",
      detail: "Finish logging is active.",
    };
  }

  if (raceStatus === "ended") {
    return {
      label: "Ended",
      detail: "Race clock is stopped.",
    };
  }

  return {
    label: "Ready",
    detail: "Waiting for the official start.",
  };
}

export function OperatorControls({
  currentTimeLabel,
  manualBib,
  onClear,
  onEndRaceNow,
  onLogFinish,
  onManualBibChange,
  onMarkNeedsReview,
  onRestartRace,
  onStartRaceNow,
  raceEndedTimeLabel,
  raceStartTimeLabel,
  raceStatus,
}: OperatorControlsProps) {
  const isReadyToLog = manualBib.trim().length > 0;
  const canSaveManualFinish = isReadyToLog && raceStatus === "running";
  const raceStatusCopy = getRaceStatusCopy(raceStatus);

  return (
    <section className="panel-card p-5 lg:p-6">
      <div className="accent-orbit -right-10 top-0 h-28 w-28 bg-[#FC6824]" />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className={sectionTitleClass}>Race Control</h2>
            <p className="mt-2 text-sm font-medium text-[#605965]">
              Keep this screen focused on the official start, end, and manual bib entry.
            </p>
          </div>

          <div className="rounded-[24px] bg-[#F7F5FA] px-4 py-3 ring-1 ring-[#4C05E4]/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
              Local Clock
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1F1F1F]">
              {currentTimeLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
              Race Status
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1F1F1F]">
              {raceStatusCopy.label}
            </p>
            <p className="mt-1 text-sm font-medium text-[#615A66]">
              {raceStatusCopy.detail}
            </p>
          </div>

          <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
              Official Start Time
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1F1F1F]">
              {raceStartTimeLabel}
            </p>
          </div>

          <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
              End Time
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1F1F1F]">
              {raceEndedTimeLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={raceStatus !== "idle"}
            onClick={onStartRaceNow}
          >
            Start Run
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={raceStatus !== "running"}
            onClick={onEndRaceNow}
          >
            End Run
          </button>
          <button
            type="button"
            className={subtleButtonClass}
            disabled={raceStatus !== "ended"}
            onClick={onRestartRace}
          >
            Restart Run
          </button>
        </div>

        <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
          <label className={labelClass} htmlFor="manual-bib">
            Manual Bib Entry
          </label>
          <input
            id="manual-bib"
            className={inputClass}
            placeholder="Enter bib number only"
            value={manualBib}
            onChange={(event) => onManualBibChange(event.target.value.toUpperCase())}
          />
          <p className="mt-3 text-sm font-medium text-[#615A66]">
            Use this only when the auto-detection is wrong or unclear.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!canSaveManualFinish}
            onClick={onLogFinish}
          >
            Save Manual Finish
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!canSaveManualFinish}
            onClick={onMarkNeedsReview}
          >
            Save For Review
          </button>
          <button type="button" className={subtleButtonClass} onClick={onClear}>
            Clear Bib
          </button>
        </div>
      </div>
    </section>
  );
}
