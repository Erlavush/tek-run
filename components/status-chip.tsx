import { cn } from "@/lib/theme";
import type { StatusTone } from "@/lib/types";

const toneClassMap: Record<StatusTone, string> = {
  gradient: "bg-[#1f8f42] text-white ring-[#166534]",
  success: "bg-[#1f8f42] text-white ring-[#166534]",
  warning: "bg-[#f59e0b] text-black ring-[#c2410c]",
  danger: "bg-[#dc2626] text-white ring-[#991b1b]",
  neutral: "bg-white text-black ring-black/20",
  info: "bg-white text-black ring-black/20",
  lime: "bg-[#facc15] text-black ring-[#ca8a04]",
  orange: "bg-[#f59e0b] text-black ring-[#c2410c]",
};

const dotClassMap: Record<StatusTone, string> = {
  gradient: "bg-white",
  success: "bg-white",
  warning: "bg-black",
  danger: "bg-white",
  neutral: "bg-black",
  info: "bg-black",
  lime: "bg-black",
  orange: "bg-black",
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
