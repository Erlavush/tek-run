import type { CameraConnectionState, HealthCheckStatus, SystemHealthResponse } from "@/lib/types";
import { primaryButtonClass, secondaryButtonClass, sectionTitleClass, subtleButtonClass } from "@/lib/theme";
import { StatusChip } from "@/components/status-chip";
import type { CameraPermissionState } from "@/hooks/use-camera-permission";

type ExportFormat = "xlsx" | "json" | "csv";

interface OperationsPanelProps {
  browserOnline: boolean;
  cameraPermission: CameraPermissionState;
  cameraState: CameraConnectionState;
  downloadingFormat: ExportFormat | null;
  health: SystemHealthResponse | null;
  isRunningHealthCheck: boolean;
  lastExportedAt: string | null;
  latestFinisherAt: string | null;
  onDownload: (format: ExportFormat) => void;
  onRunHealthCheck: () => void;
  raceEnded: boolean;
  selectedCameraLabel: string;
  selectedDeviceMissing: boolean;
}

function getCheckTone(status: HealthCheckStatus) {
  if (status === "pass") {
    return "success" as const;
  }

  if (status === "warn") {
    return "warning" as const;
  }

  return "danger" as const;
}

function formatTime(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  })
    .format(new Date(value))
    .replace("AM", "A.M.")
    .replace("PM", "P.M.");
}

function getCameraPermissionLabel(permission: CameraPermissionState) {
  if (permission === "granted") {
    return "Granted";
  }

  if (permission === "prompt") {
    return "Prompt";
  }

  if (permission === "denied") {
    return "Denied";
  }

  if (permission === "unsupported") {
    return "Unsupported";
  }

  return "Unknown";
}

function getOverallHealthStatus(health: SystemHealthResponse | null): HealthCheckStatus {
  if (!health || health.checks.length === 0) {
    return "warn";
  }

  if (health.checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (health.checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}

export function OperationsPanel({
  browserOnline,
  cameraPermission,
  cameraState,
  downloadingFormat,
  health,
  isRunningHealthCheck,
  lastExportedAt,
  latestFinisherAt,
  onDownload,
  onRunHealthCheck,
  raceEnded,
  selectedCameraLabel,
  selectedDeviceMissing,
}: OperationsPanelProps) {
  const summaryChecks = [
    {
      id: "network",
      label: "Network",
      status: browserOnline ? "pass" : "fail",
      value: browserOnline ? "Online" : "Offline",
    },
    {
      id: "permission",
      label: "Camera",
      status:
        cameraPermission === "granted"
          ? "pass"
          : cameraPermission === "prompt" || cameraPermission === "unsupported"
            ? "warn"
            : cameraPermission === "denied"
              ? "fail"
              : "warn",
      value: getCameraPermissionLabel(cameraPermission),
    },
    {
      id: "lock",
      label: "Lock",
      status: selectedDeviceMissing ? "fail" : cameraState === "connected" ? "pass" : "warn",
      value: selectedDeviceMissing ? "Missing" : selectedCameraLabel,
    },
    {
      id: "checks",
      label: "Checks",
      status: getOverallHealthStatus(health),
      value: health ? `${health.checks.length} items` : "Pending",
    },
    {
      id: "feed",
      label: "Feed",
      status:
        typeof health?.videoHeartbeatAgeSeconds === "number"
          ? health.videoHeartbeatAgeSeconds <= 45
            ? "pass"
            : "fail"
          : health?.livekitRoomActive
            ? "warn"
            : "warn",
      value:
        typeof health?.videoHeartbeatAgeSeconds === "number"
          ? `${health.videoHeartbeatAgeSeconds}s`
          : "n/a",
    },
    {
      id: "last",
      label: "Last",
      status: latestFinisherAt ? "pass" : "warn",
      value: formatTime(latestFinisherAt),
    },
  ] satisfies Array<{
    id: string;
    label: string;
    status: HealthCheckStatus;
    value: string;
  }>;

  return (
    <section className="panel-card p-4 lg:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={sectionTitleClass}>Ops</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={isRunningHealthCheck}
              onClick={onRunHealthCheck}
            >
              {isRunningHealthCheck ? "Running Checks" : "Run Preflight Check"}
            </button>
            <StatusChip
              label={health ? formatTime(health.checkedAt) : "Pending"}
              tone={health ? "info" : "warning"}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {summaryChecks.map((check) => (
            <div key={check.id} className="rounded-[20px] border border-black bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
                  {check.label}
                </p>
                <StatusChip
                  label={check.status}
                  tone={getCheckTone(check.status)}
                  className="shrink-0"
                />
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-black">{check.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[20px] border border-black bg-white px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/50">
              Export
            </p>
            <StatusChip
              label={raceEnded ? "Ready" : "Wait"}
              tone={raceEnded ? "success" : "lime"}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-black">Last: {formatTime(lastExportedAt)}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              disabled={!raceEnded || downloadingFormat !== null}
              onClick={() => onDownload("xlsx")}
            >
              {downloadingFormat === "xlsx" ? "XLSX..." : "XLSX"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={!raceEnded || downloadingFormat !== null}
              onClick={() => onDownload("json")}
            >
              {downloadingFormat === "json" ? "JSON..." : "JSON"}
            </button>
            <button
              type="button"
              className={subtleButtonClass}
              disabled={!raceEnded || downloadingFormat !== null}
              onClick={() => onDownload("csv")}
            >
              {downloadingFormat === "csv" ? "CSV..." : "CSV"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
