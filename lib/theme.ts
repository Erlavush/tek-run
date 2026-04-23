import type {
  CameraConnectionState,
  FinisherSource,
  FinisherStatus,
  PipelineState,
  StatusTone,
  SystemLogLevel,
  ThemeMode,
} from "@/lib/types";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-black bg-black px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:pointer-events-none disabled:opacity-45";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-black bg-white px-4 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:pointer-events-none disabled:opacity-45";

export const subtleButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-black bg-[#f2f2f2] px-4 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:pointer-events-none disabled:opacity-45";

export const inputClass =
  "w-full rounded-2xl border border-black bg-white px-4 py-3 text-sm font-semibold text-black outline-none transition placeholder:text-black/45 focus:ring-4 focus:ring-black/10";

export const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-[0.28em] text-black/55";

export const sectionTitleClass =
  "font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight text-black";

export const sourceConfig: Record<
  FinisherSource,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  auto: { label: "Auto", tone: "info" },
  manual: { label: "Manual", tone: "orange" },
};

export const finisherStatusConfig: Record<
  FinisherStatus,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  verified: { label: "Verified", tone: "success" },
  "needs review": { label: "Needs Review", tone: "warning" },
  duplicate: { label: "Duplicate", tone: "danger" },
  unknown: { label: "Unknown", tone: "neutral" },
};

export const pipelineStateConfig: Record<
  PipelineState,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  idle: { label: "Idle", tone: "neutral" },
  running: { label: "Running", tone: "gradient" },
  warning: { label: "Warning", tone: "warning" },
  error: { label: "Error", tone: "danger" },
};

export const cameraStateConfig: Record<
  CameraConnectionState,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  connected: { label: "Connected", tone: "success" },
  disconnected: { label: "Disconnected", tone: "danger" },
  denied: { label: "Permission Denied", tone: "danger" },
  unsupported: { label: "Unsupported", tone: "warning" },
};

export const logLevelConfig: Record<
  SystemLogLevel,
  {
    tone: StatusTone;
    dotClassName: string;
  }
> = {
  info: { tone: "info", dotClassName: "bg-[#3DA3F4]" },
  success: { tone: "success", dotClassName: "bg-[#31B548]" },
  warn: { tone: "warning", dotClassName: "bg-[#FC6824]" },
  error: { tone: "danger", dotClassName: "bg-[#FF5A5A]" },
};

export const themeModeOptions: Array<{
  value: ThemeMode;
  label: string;
  description: string;
}> = [
  {
    value: "event-light",
    label: "Event Light",
    description: "Default bright operator layout with soft neutral contrast.",
  },
  {
    value: "high-contrast",
    label: "High Contrast",
    description: "Sharper borders and stronger contrast for harsh venue lighting.",
  },
  {
    value: "system",
    label: "System",
    description: "Keeps the event theme but follows the browser preference later.",
  },
];

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatClock(date: Date | null) {
  if (!date) {
    return "--:--:--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatLongDate(date: Date | null) {
  if (!date) {
    return "Syncing local date";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatNullableTime(value: string | null | undefined) {
  if (!value) {
    return "No timestamp yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
