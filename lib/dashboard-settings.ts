import type {
  DashboardSettings,
  RaceStatus,
  ThemeMode,
} from "@/lib/types";

export const DASHBOARD_SETTINGS_STORAGE_KEY = "tek-run.dashboard-settings";
export const DASHBOARD_SETTINGS_UPDATED_EVENT = "tek-run:settings-updated";

export const defaultDashboardSettings: DashboardSettings = {
  eventName: "Community Run 2026",
  finishLineLabel: "Finish Line",
  cameraSource: "",
  autoScrollResults: true,
  soundAlert: true,
  themeMode: "event-light",
  mockMode: false,
  djPocketDeviceId: "",
  droneDeviceId: "",
  testCameraDeviceId: "",
  raceStartTimeIso: null,
  raceEndTimeIso: null,
  raceStatus: "idle",
};

function isThemeMode(value: string): value is ThemeMode {
  return value === "event-light" || value === "high-contrast" || value === "system";
}

function isRaceStatus(value: string): value is RaceStatus {
  return value === "idle" || value === "running" || value === "ended";
}

function normalizeRaceStartTime(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

export function normalizeDashboardSettings(
  value: Partial<DashboardSettings> | null | undefined,
): DashboardSettings {
  return {
    eventName:
      typeof value?.eventName === "string" && value.eventName.trim().length > 0
        ? value.eventName
        : defaultDashboardSettings.eventName,
    finishLineLabel:
      typeof value?.finishLineLabel === "string" && value.finishLineLabel.trim().length > 0
        ? value.finishLineLabel
        : defaultDashboardSettings.finishLineLabel,
    cameraSource:
      typeof value?.cameraSource === "string"
        ? value.cameraSource
        : defaultDashboardSettings.cameraSource,
    autoScrollResults:
      typeof value?.autoScrollResults === "boolean"
        ? value.autoScrollResults
        : defaultDashboardSettings.autoScrollResults,
    soundAlert:
      typeof value?.soundAlert === "boolean"
        ? value.soundAlert
        : defaultDashboardSettings.soundAlert,
    themeMode:
      typeof value?.themeMode === "string" && isThemeMode(value.themeMode)
        ? value.themeMode
        : defaultDashboardSettings.themeMode,
    mockMode:
      typeof value?.mockMode === "boolean"
        ? value.mockMode
        : defaultDashboardSettings.mockMode,
    djPocketDeviceId:
      typeof value?.djPocketDeviceId === "string"
        ? value.djPocketDeviceId
        : defaultDashboardSettings.djPocketDeviceId,
    droneDeviceId:
      typeof value?.droneDeviceId === "string"
        ? value.droneDeviceId
        : defaultDashboardSettings.droneDeviceId,
    testCameraDeviceId:
      typeof value?.testCameraDeviceId === "string"
        ? value.testCameraDeviceId
        : defaultDashboardSettings.testCameraDeviceId,
    raceStartTimeIso: normalizeRaceStartTime(value?.raceStartTimeIso),
    raceEndTimeIso: normalizeRaceStartTime(value?.raceEndTimeIso),
    raceStatus:
      typeof value?.raceStatus === "string" && isRaceStatus(value.raceStatus)
        ? value.raceStatus
        : defaultDashboardSettings.raceStatus,
  };
}

export function readDashboardSettings(): DashboardSettings {
  if (typeof window === "undefined") {
    return defaultDashboardSettings;
  }

  const stored = window.localStorage.getItem(DASHBOARD_SETTINGS_STORAGE_KEY);
  if (!stored) {
    return defaultDashboardSettings;
  }

  try {
    return normalizeDashboardSettings(JSON.parse(stored) as Partial<DashboardSettings>);
  } catch {
    return defaultDashboardSettings;
  }
}

export function persistDashboardSettings(settings: DashboardSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeDashboardSettings(settings);
  window.localStorage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_SETTINGS_UPDATED_EVENT, {
      detail: normalized,
    }),
  );
}

export function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "";
  }

  const timezoneOffsetMs = timestamp.getTimezoneOffset() * 60 * 1000;
  return new Date(timestamp.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}
