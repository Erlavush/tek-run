import Link from "next/link";
import type { RaceStatus } from "@/lib/types";
import { primaryButtonClass } from "@/lib/theme";

interface TopBarProps {
  eventName: string;
  raceStatus: RaceStatus;
}

function getStatusLabel(raceStatus: RaceStatus) {
  if (raceStatus === "running") {
    return "Race Running";
  }

  if (raceStatus === "ended") {
    return "Run Ended";
  }

  return "Ready To Start";
}

export function TopBar({ eventName, raceStatus }: TopBarProps) {
  return (
    <header className="panel-card px-5 py-5 lg:px-7 lg:py-6">
      <div className="accent-orbit -right-16 top-0 h-44 w-44 bg-[#FC6824]" />
      <div className="accent-orbit left-[28%] top-2 h-28 w-28 bg-[#3DA3F4]" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-[#7701A6]">
            Race Control
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[#1F1F1F] lg:text-4xl">
            {eventName}
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#5F5866]">
            Simplified operator mode for race-day control.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 lg:items-end">
          <div className="rounded-[24px] bg-[#F7F5FA] px-4 py-3 ring-1 ring-[#4C05E4]/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#8A8492]">
              Race Status
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-extrabold text-[#1F1F1F]">
              {getStatusLabel(raceStatus)}
            </p>
          </div>

          <Link href="/public-display" target="_blank" className={primaryButtonClass}>
            Open Public Display
          </Link>
        </div>
      </div>
    </header>
  );
}
