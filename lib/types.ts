export type FinisherSource = "auto" | "manual";
export type FinisherStatus = "verified" | "needs review" | "duplicate" | "unknown";
export type ReviewStatus = "verified" | "needs review" | "duplicate";
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
export type VideoSourceSlot = "dj-pocket" | "drone" | "test-camera";
export type VideoPublishStatus = "idle" | "connecting" | "live" | "error";
export type HealthCheckStatus = "pass" | "warn" | "fail";
export type ManualEntryQueueItemStatus = "queued" | "sending" | "failed";
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
  djPocketDeviceId: string;
  droneDeviceId: string;
  testCameraDeviceId: string;
  raceStartTimeIso: string | null;
  raceEndTimeIso: string | null;
  raceStatus: RaceStatus;
}

export interface VideoInputOption {
  deviceId: string;
  label: string;
  rawLabel: string;
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

export interface MasterlistEntry {
  bibNumber: string;
  runnerName: string;
  division: RaceDivision;
}

export interface ResultsWorkbookEntry {
  rowNumber: number;
  place: number | null;
  bibNumber: string;
  finishTimestamp: string | null;
  finishTimeFromStart: string | null;
  source: string;
  confidence: number | null;
  reviewStatus: ReviewStatus;
}

export interface PublicDisplayFinisher {
  id: string;
  rowNumber: number;
  place: number | null;
  bibNumber: string;
  runnerName: string;
  division: RaceDivision;
  finishTimestamp: string | null;
  finishTimeFromStart: string | null;
  source: string;
  confidence: number | null;
  reviewStatus: ReviewStatus;
}

export interface PublicDisplayFeed {
  finishers: PublicDisplayFinisher[];
  race: RaceState;
  video: VideoState;
  updatedAt: string;
  masterlistPath: string;
  resultsPath: string;
  error?: string;
}

export interface ManualEntryRecord {
  id: string;
  rowNumber: number;
  bibNumber: string;
  runnerName: string | null;
  division: RaceDivision | null;
  elapsedRaceTime: string;
  clockFinishTime: string;
  reviewStatus: ReviewStatus;
  warning: "duplicate" | "unknown" | null;
}

export interface ManualEntryFeed {
  entries: ManualEntryRecord[];
  race: RaceState;
  updatedAt: string;
  masterlistPath: string;
  resultsPath: string;
  error?: string;
}

export interface ManualEntryPayload {
  bibNumber: string;
  capturedAtIso: string;
  forceReview?: boolean;
  requestId?: string;
  raceStartTimeIso?: string | null;
}

export interface ManualEntrySaveResponse {
  entry: ManualEntryRecord;
  duplicateDetected: boolean;
  duplicateReason?: string | null;
  unknownBib: boolean;
  updatedAt: string;
  resultsPath: string;
}

export interface ManualEntryQueueItem {
  requestId: string;
  bibNumber: string;
  capturedAtIso: string;
  forceReview: boolean;
  status: ManualEntryQueueItemStatus;
  error: string | null;
  attemptCount: number;
  createdAt: string;
}

export interface FinisherReviewRecord extends ManualEntryRecord {
  source: FinisherSource;
}

export interface FinisherReviewFeed {
  entries: FinisherReviewRecord[];
  race: RaceState;
  counts: RaceCounts;
  updatedAt: string;
  error?: string;
}

export interface FinisherReviewUpdatePayload {
  bibNumber: string;
  runnerName: string;
  division: RaceDivision | null;
  reviewStatus: ReviewStatus;
  elapsedRaceTime?: string;
}

export interface FinisherReviewUpdateResponse {
  entry: FinisherReviewRecord;
  counts: RaceCounts;
  updatedAt: string;
}

export interface RaceState {
  id: string;
  eventName: string;
  raceStatus: RaceStatus;
  raceStartTimeIso: string | null;
  raceEndTimeIso: string | null;
  updatedAt: string;
}

export interface VideoState {
  eventId: string;
  activeSourceSlot: VideoSourceSlot | null;
  activeSourceLabel: string | null;
  publishStatus: VideoPublishStatus;
  updatedAt: string;
  lastHeartbeat: string | null;
}

export interface RaceCounts {
  totalRunners: number;
  totalFinishers: number;
  verifiedFinishers: number;
}

export interface RaceResponse {
  race: RaceState;
  video: VideoState;
  counts: RaceCounts;
  updatedAt: string;
  error?: string;
}

export interface RaceActionPayload {
  action: "start" | "end" | "reset" | "update";
  eventName?: string;
}

export interface VideoStateUpdatePayload {
  activeSourceSlot?: VideoSourceSlot | null;
  activeSourceLabel?: string | null;
  publishStatus?: VideoPublishStatus;
  heartbeat?: boolean;
}

export interface VideoTokenRequest {
  role: "operator" | "display";
}

export interface VideoTokenResponse {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

export interface MasterlistImportResponse {
  importedCount: number;
  skippedCount: number;
  updatedAt: string;
}

export interface SystemHealthCheck {
  id: string;
  label: string;
  status: HealthCheckStatus;
  detail: string;
}

export interface SystemHealthResponse {
  checkedAt: string;
  serverTimeIso: string;
  checks: SystemHealthCheck[];
  latestFinisherAt: string | null;
  livekitRoomName: string;
  livekitRoomActive: boolean;
  livekitParticipantCount: number;
  videoHeartbeatAgeSeconds: number | null;
}

export interface EventBackupRunnerRecord {
  bibNumber: string;
  runnerName: string;
  division: RaceDivision;
  createdAt: string;
}

export interface EventBackupData {
  exportedAt: string;
  race: RaceState;
  counts: RaceCounts;
  video: VideoState;
  runners: EventBackupRunnerRecord[];
  finishers: FinisherReviewRecord[];
}
