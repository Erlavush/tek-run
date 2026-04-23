import { inputClass, labelClass, primaryButtonClass, sectionTitleClass, secondaryButtonClass } from "@/lib/theme";
import type { RaceCounts, RaceState } from "@/lib/types";

interface RaceAdminPanelProps {
  counts: RaceCounts;
  eventNameDraft: string;
  importMessage: string | null;
  isImporting: boolean;
  isSavingEventName: boolean;
  onEventNameChange: (value: string) => void;
  onImportFileChange: (file: File | null) => void;
  onImportMasterlist: () => void;
  onSaveEventName: () => void;
  race: RaceState;
}

export function RaceAdminPanel({
  counts,
  eventNameDraft,
  importMessage,
  isImporting,
  isSavingEventName,
  onEventNameChange,
  onImportFileChange,
  onImportMasterlist,
  onSaveEventName,
  race,
}: RaceAdminPanelProps) {
  return (
    <section className="panel-card p-4 lg:p-5">
      <div className="flex flex-col gap-4">
        <h2 className={sectionTitleClass}>Event</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              Status
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-black">
              {race.raceStatus}
            </p>
          </div>

          <div className="rounded-[20px] border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              Runners
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-black">
              {counts.totalRunners}
            </p>
          </div>

          <div className="rounded-[20px] border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              Finishers
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-black">
              {counts.totalFinishers}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[20px] border border-black bg-white px-4 py-4">
            <label className={labelClass} htmlFor="event-name">
              Name
            </label>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                id="event-name"
                className={inputClass}
                value={eventNameDraft}
                onChange={(event) => onEventNameChange(event.target.value)}
              />
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={isSavingEventName}
                onClick={onSaveEventName}
              >
                {isSavingEventName ? "Saving" : "Save"}
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-black bg-white px-4 py-4">
            <label className={labelClass} htmlFor="masterlist-file">
              Masterlist
            </label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                id="masterlist-file"
                type="file"
                accept=".xlsx"
                className="block w-full text-sm font-semibold text-black file:mr-3 file:rounded-xl file:border file:border-black file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
                onChange={(event) => onImportFileChange(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className={primaryButtonClass}
                disabled={isImporting || race.raceStatus !== "idle"}
                onClick={onImportMasterlist}
              >
                {isImporting ? "Importing" : "Import"}
              </button>
            </div>

            {importMessage ? (
              <p className="mt-3 text-sm font-semibold text-black">{importMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
