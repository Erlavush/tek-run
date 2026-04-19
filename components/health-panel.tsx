import { cameraStateConfig, formatNullableTime, logLevelConfig, sectionTitleClass } from "@/lib/theme";
import type { CameraConnectionState, SystemLogEntry } from "@/lib/types";
import { StatusChip } from "@/components/status-chip";

interface HealthPanelProps {
  cameraState: CameraConnectionState;
  connectionMode: string;
  eventName: string;
  lastDetectionTime: string | null;
  lastExcelWriteStatus: string;
  logs: SystemLogEntry[];
  mockMode: boolean;
  totalLoggedFinishers: number;
}

export function HealthPanel({
  cameraState,
  connectionMode,
  eventName,
  lastDetectionTime,
  lastExcelWriteStatus,
  logs,
  mockMode,
  totalLoggedFinishers,
}: HealthPanelProps) {
  const cameraStatus = cameraStateConfig[cameraState];

  const metrics = [
    { label: "Event Name", value: eventName, accent: "bg-[#4C05E4]" },
    { label: "Total Logged Finishers", value: String(totalLoggedFinishers), accent: "bg-[#A1D110]" },
    { label: "Camera State", value: cameraStatus.label, accent: "bg-[#3DA3F4]" },
    {
      label: "Last Detection Time",
      value: formatNullableTime(lastDetectionTime),
      accent: "bg-[#FC6824]",
    },
    {
      label: "Last Excel Write",
      value: lastExcelWriteStatus,
      accent: "bg-[#31B548]",
    },
    { label: "Connection Mode", value: connectionMode, accent: "bg-[#FF5A5A]" },
  ];

  return (
    <section className="panel-card p-5 lg:p-6">
      <div className="accent-orbit -left-10 bottom-0 h-28 w-28 bg-[#3DA3F4]" />
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={sectionTitleClass}>System Health / Session Info</h2>
            <p className="mt-2 text-sm font-medium text-[#605965]">
              Operator-facing snapshot for the local mock session.
            </p>
          </div>

          <StatusChip
            label={mockMode ? "Mock Mode Enabled" : "Live Mode Pending"}
            tone={mockMode ? "gradient" : "warning"}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[24px] bg-[#F7F7F7] px-4 py-4 ring-1 ring-[#1F1F1F]/6"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${metric.accent}`} />
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8A8492]">
                  {metric.label}
                </p>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-[#1F1F1F]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] bg-[#0D1020] px-5 py-5 text-white shadow-[0_28px_48px_-36px_rgba(13,16,32,0.9)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/55">
                Session Log
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-white">
                Rolling Operator Feed
              </p>
            </div>
            <StatusChip label={`Camera ${cameraStatus.label}`} tone={cameraStatus.tone} />
          </div>

          <div className="scrollbar-slim mt-4 max-h-64 space-y-3 overflow-auto pr-2">
            {logs.map((entry) => {
              const logStyle = logLevelConfig[entry.level];

              return (
                <div
                  key={entry.id}
                  className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 backdrop-blur"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${logStyle.dotClassName}`} />
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                        {entry.level}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-white/60">
                      {new Date(entry.timestamp).toLocaleTimeString("en-US")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/88">
                    {entry.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
