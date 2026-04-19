import { inputClass, labelClass, primaryButtonClass, sectionTitleClass, secondaryButtonClass, subtleButtonClass } from "@/lib/theme";

interface OperatorControlsProps {
  currentTimeLabel: string;
  eventName: string;
  manualBib: string;
  manualRunnerName: string;
  onClear: () => void;
  onLogFinish: () => void;
  onMarkNeedsReview: () => void;
  onManualBibChange: (value: string) => void;
  onManualRunnerNameChange: (value: string) => void;
}

export function OperatorControls({
  currentTimeLabel,
  eventName,
  manualBib,
  manualRunnerName,
  onClear,
  onLogFinish,
  onMarkNeedsReview,
  onManualBibChange,
  onManualRunnerNameChange,
}: OperatorControlsProps) {
  const isReadyToLog = manualBib.trim().length > 0;

  return (
    <section className="panel-card p-5 lg:p-6">
      <div className="accent-orbit -right-10 top-0 h-28 w-28 bg-[#FC6824]" />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className={sectionTitleClass}>Operator Controls</h2>
            <p className="mt-2 text-sm font-medium text-[#605965]">
              Built for fast manual intervention while OCR and finish-line events are
              still mocked.
            </p>
          </div>

          <div className="rounded-[24px] bg-[#F7F5FA] px-4 py-3 ring-1 ring-[#4C05E4]/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
              Local Clock
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#1F1F1F]">
              {currentTimeLabel}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7185]">
              {eventName}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className={labelClass} htmlFor="manual-bib">
              Manual Bib Entry
            </label>
            <input
              id="manual-bib"
              className={inputClass}
              placeholder="Enter bib number"
              value={manualBib}
              onChange={(event) => onManualBibChange(event.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="manual-runner-name">
              Runner Name (Optional)
            </label>
            <input
              id="manual-runner-name"
              className={inputClass}
              placeholder="Add runner name if known"
              value={manualRunnerName}
              onChange={(event) => onManualRunnerNameChange(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!isReadyToLog}
            onClick={onLogFinish}
          >
            Log Finish Now
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!isReadyToLog}
            onClick={onMarkNeedsReview}
          >
            Mark Needs Review
          </button>
          <button type="button" className={subtleButtonClass} onClick={onClear}>
            Clear Inputs
          </button>
        </div>

        <div className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#8A8492]">
            Pressure Mode Notes
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#5B5461]">
            Use manual entry whenever the bib is folded, occluded, or the same runner
            is detected twice. Duplicate bibs will be flagged automatically in the
            mock session.
          </p>
        </div>
      </div>
    </section>
  );
}
