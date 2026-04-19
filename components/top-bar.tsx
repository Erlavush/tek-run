import Link from "next/link";
import { primaryButtonClass, secondaryButtonClass, subtleButtonClass } from "@/lib/theme";

interface TopBarProps {
  eventName: string;
  onExport: () => void;
  onOpenSettings: () => void;
}

function LogoPlaceholder({
  label,
  accentClassName,
}: {
  label: string;
  accentClassName: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#1F1F1F]/8 bg-white px-4 py-3 shadow-[0_16px_32px_-28px_rgba(57,37,94,0.45)]">
      <div
        className={`absolute inset-y-0 left-0 w-1.5 rounded-full ${accentClassName}`}
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
        Logo
      </p>
      <p className="mt-1 text-sm font-extrabold text-[#1F1F1F]">{label}</p>
    </div>
  );
}

export function TopBar({ eventName, onExport, onOpenSettings }: TopBarProps) {
  return (
    <header className="panel-card px-5 py-5 lg:px-7 lg:py-6">
      <div className="accent-orbit -right-16 top-0 h-44 w-44 bg-[#FC6824]" />
      <div className="accent-orbit left-[28%] top-2 h-28 w-28 bg-[#3DA3F4]" />
      <div className="sport-swoosh -right-18 top-10 h-52 w-52" />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <LogoPlaceholder
              label="Organization Logo"
              accentClassName="bg-gradient-to-b from-[#4C05E4] to-[#A00063]"
            />
            <LogoPlaceholder
              label="Event Logo"
              accentClassName="bg-gradient-to-b from-[#A1D110] to-[#31B548]"
            />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-[#7701A6]">
              Race Control
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[#1F1F1F] lg:text-4xl">
              Finish Line Operator Dashboard
            </h1>
            <p className="mt-1.5 text-sm font-medium text-[#5F5866] lg:text-base">
              Offline AI-Assisted Logging System
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 lg:items-end">
          <div className="rounded-[24px] bg-[#F7F5FA] px-4 py-3 ring-1 ring-[#4C05E4]/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#8A8492]">
              Active Event
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-extrabold text-[#1F1F1F]">
              {eventName}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/public-display"
              target="_blank"
              className={primaryButtonClass}
            >
              Public Display Mode
            </Link>
            <button type="button" className={secondaryButtonClass} onClick={onOpenSettings}>
              Settings
            </button>
            <button type="button" className={subtleButtonClass} onClick={onExport}>
              Export Mock Results
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
