export type FinisherSource = "auto" | "manual";
export type FinisherStatus = "verified" | "needs review" | "duplicate" | "unknown";
export type PipelineState = "idle" | "running" | "warning" | "error";
export type CameraConnectionState =
  | "connected"
  | "disconnected"
  | "denied"
  | "unsupported";
export type SystemLogLevel = "info" | "success" | "warn" | "error";
export type ThemeMode = "event-light" | "high-contrast" | "system";
export type RaceDivision = "male" | "female";
export type RaceStatus = "idle" | "running" | "ended";
export type StatusTone =
  | "gradient"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "info"
  | "lime"
  | "orange";

export interface FinisherRecord {
  id: string;
  place: number;
  bibNumber: string;
  runnerName: string;
  finishTime: string;
  loggedAt: string;
  source: FinisherSource;
  status: FinisherStatus;
  confidence: number;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: SystemLogLevel;
  message: string;
}

export interface DashboardSettings {
  eventName: string;
  finishLineLabel: string;
  cameraSource: string;
  autoScrollResults: boolean;
  soundAlert: boolean;
  themeMode: ThemeMode;
  mockMode: boolean;
  raceStartTimeIso: string | null;
  raceEndTimeIso: string | null;
  raceStatus: RaceStatus;
}

export interface VideoInputOption {
  deviceId: string;
  label: string;
}

export interface DashboardSessionInfo {
  connectionMode: "offline";
  lastDetectionTime: string | null;
  lastExcelWriteStatus: string;
  ocrState: PipelineState;
  detectionState: PipelineState;
  excelState: PipelineState;
}

export interface LeaderboardEntry {
  id: string;
  division: RaceDivision;
  place: number;
  bibNumber: string;
  runnerName: string;
  finishTime: string;
}

export interface LatestRunnerCard {
  id: string;
  division: RaceDivision;
  bibNumber: string;
  runnerName: string;
  finishTime: string;
}

export interface RecentDivisionFinisher {
  id: string;
  division: RaceDivision;
  sequenceNumber: number;
  bibNumber: string;
  runnerName: string;
  finishTime: string;
}
