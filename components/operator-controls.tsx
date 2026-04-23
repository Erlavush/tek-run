import type { RaceStatus } from "@/lib/types";
import {
  primaryButtonClass,
  sectionTitleClass,
  secondaryButtonClass,
  subtleButtonClass,
} from "@/lib/theme";
import { StatusChip } from "@/components/status-chip";

interface OperatorControlsProps {
  currentTimeLabel: string;
  onEndRaceNow: () => void;
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
      tone: "success" as const,
    };
  }

  if (raceStatus === "ended") {
    return {
      label: "Ended",
      tone: "warning" as const,
    };
  }

  return {
    label: "Idle",
    tone: "neutral" as const,
  };
}

export function OperatorControls({
  currentTimeLabel,
  onEndRaceNow,
  onRestartRace,
  onStartRaceNow,
  raceEndedTimeLabel,
  raceStartTimeLabel,
  raceStatus,
}: OperatorControlsProps) {
  const raceStatusCopy = getRaceStatusCopy(raceStatus);

  return (
    <section className="panel-card p-4 lg:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={sectionTitleClass}>Race Control</h2>
          <div className="flex flex-wrap gap-2">
            <StatusChip
              label={raceStatusCopy.label}
              tone={raceStatusCopy.tone}
              pulse={raceStatus === "running"}
            />
            <div className="rounded-full border border-black px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-black">
              {currentTimeLabel}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              Start
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-black">
              {raceStartTimeLabel}
            </p>
          </div>

          <div className="rounded-[20px] border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              End
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-black">
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
      </div>
    </section>
  );
}
