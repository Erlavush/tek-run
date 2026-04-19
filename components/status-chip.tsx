import { cn } from "@/lib/theme";
import type { StatusTone } from "@/lib/types";

const toneClassMap: Record<StatusTone, string> = {
  gradient:
    "bg-gradient-to-r from-[#4C05E4] to-[#A00063] text-white ring-transparent",
  success: "bg-[#31B548]/12 text-[#1E7B30] ring-[#31B548]/25",
  warning: "bg-[#FC6824]/12 text-[#B34717] ring-[#FC6824]/25",
  danger: "bg-[#FF5A5A]/12 text-[#B53030] ring-[#FF5A5A]/24",
  neutral: "bg-[#1F1F1F]/6 text-[#555555] ring-[#1F1F1F]/8",
  info: "bg-[#3DA3F4]/12 text-[#245CA8] ring-[#3DA3F4]/24",
  lime: "bg-[#A1D110]/16 text-[#5D7B0A] ring-[#A1D110]/22",
  orange: "bg-[#FC6824]/12 text-[#B14C1D] ring-[#FC6824]/24",
};

const dotClassMap: Record<StatusTone, string> = {
  gradient: "bg-white",
  success: "bg-[#31B548]",
  warning: "bg-[#FC6824]",
  danger: "bg-[#FF5A5A]",
  neutral: "bg-[#7C7C7C]",
  info: "bg-[#3DA3F4]",
  lime: "bg-[#A1D110]",
  orange: "bg-[#FC6824]",
};

interface StatusChipProps {
  label: string;
  tone: StatusTone;
  className?: string;
  pulse?: boolean;
}

export function StatusChip({
  label,
  tone,
  className,
  pulse = false,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset backdrop-blur-sm",
        toneClassMap[tone],
        pulse && "status-pulse",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClassMap[tone])} />
      {label}
    </span>
  );
}
