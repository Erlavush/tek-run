import type {
  DashboardSessionInfo,
  DashboardSettings,
  FinisherRecord,
  FinisherSource,
  FinisherStatus,
  LatestRunnerCard,
  LeaderboardEntry,
  SystemLogEntry,
} from "@/lib/types";

const EVENT_TIME_ZONE = "Asia/Manila";
const MOCK_REFERENCE_TIME_ISO = "2026-04-18T22:59:56+08:00";
export const PUBLIC_DISPLAY_START_TIME_ISO = "2026-04-19T04:15:00+08:00";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});

const runnerNamePool = [
  "Miguel Santos",
  "Jessa Navarro",
  "Danilo Cruz",
  "Paula Dela Vega",
  "Ramon Estrella",
  "Aira Mendoza",
  "Tomas Lucena",
  "Kaye Lopez",
  "Noel Cabral",
  "Bianca Ramos",
  "Mark Villanueva",
  "Ivy Garcia",
];

function buildTimestamp(offsetSeconds: number) {
  return new Date(
    new Date(MOCK_REFERENCE_TIME_ISO).getTime() - offsetSeconds * 1000,
  );
}

function createFinisher(
  place: number,
  bibNumber: string,
  runnerName: string,
  offsetSeconds: number,
  source: FinisherSource,
  status: FinisherStatus,
  confidence: number,
): FinisherRecord {
  const loggedAt = buildTimestamp(offsetSeconds);

  return {
    id: `finisher-${place}`,
    place,
    bibNumber,
    runnerName,
    finishTime: timeFormatter.format(loggedAt),
    loggedAt: loggedAt.toISOString(),
    source,
    status,
    confidence,
  };
}

function createLog(
  id: string,
  offsetSeconds: number,
  level: SystemLogEntry["level"],
  message: string,
): SystemLogEntry {
  return {
    id,
    timestamp: buildTimestamp(offsetSeconds).toISOString(),
    level,
    message,
  };
}

export const initialSettings: DashboardSettings = {
  eventName: "Community Run 2026",
  finishLineLabel: "Finish Line",
  cameraSource: "",
  autoScrollResults: true,
  soundAlert: true,
  themeMode: "event-light",
  mockMode: true,
};

export const initialSessionInfo: DashboardSessionInfo = {
  connectionMode: "offline",
  lastDetectionTime: buildTimestamp(14).toISOString(),
  lastExcelWriteStatus: "Mock spreadsheet write completed",
  ocrState: "idle",
  detectionState: "idle",
  excelState: "idle",
};

export const seedFinishers: FinisherRecord[] = [
  createFinisher(184, "B-318", "Miguel Santos", 132, "auto", "verified", 0.95),
  createFinisher(185, "B-452", "Jessa Navarro", 118, "auto", "verified", 0.92),
  createFinisher(186, "C-067", "Danilo Cruz", 101, "manual", "needs review", 0.61),
  createFinisher(187, "A-229", "Paula Dela Vega", 85, "auto", "verified", 0.96),
  createFinisher(188, "D-144", "Ramon Estrella", 77, "auto", "verified", 0.93),
  createFinisher(189, "B-514", "Aira Mendoza", 64, "manual", "verified", 0.88),
  createFinisher(190, "C-205", "Tomas Lucena", 52, "auto", "duplicate", 0.78),
  createFinisher(191, "E-091", "Kaye Lopez", 41, "auto", "verified", 0.94),
  createFinisher(192, "B-601", "Noel Cabral", 28, "manual", "verified", 0.89),
  createFinisher(193, "D-387", "Bianca Ramos", 14, "auto", "unknown", 0.57),
];

export const seedSystemLogs: SystemLogEntry[] = [
  createLog("log-1", 240, "info", "Camera pipeline ready. Waiting for operator start."),
  createLog("log-2", 204, "success", "Mock session seeded with 10 recent finishers."),
  createLog("log-3", 167, "info", "Virtual finish line calibrated at 56% frame height."),
  createLog("log-4", 121, "warn", "Bib C-067 logged manually and flagged for review."),
  createLog("log-5", 77, "info", "OCR queue is idle. No pending recognition jobs."),
  createLog("log-6", 14, "warn", "Latest auto-detection returned low confidence for bib D-387."),
];

export const publicDisplayLeaderboard: LeaderboardEntry[] = [
  {
    id: "male-1",
    division: "male",
    place: 1,
    bibNumber: "0096",
    runnerName: "Cybel",
    finishTime: "5:04:43 AM",
  },
  {
    id: "male-2",
    division: "male",
    place: 2,
    bibNumber: "0192",
    runnerName: "Earl69",
    finishTime: "5:10:12 AM",
  },
  {
    id: "male-3",
    division: "male",
    place: 3,
    bibNumber: "0483",
    runnerName: "XyZ:2",
    finishTime: "5:19:39 AM",
  },
  {
    id: "female-1",
    division: "female",
    place: 1,
    bibNumber: "0201",
    runnerName: "Erika",
    finishTime: "5:04:43 AM",
  },
  {
    id: "female-2",
    division: "female",
    place: 2,
    bibNumber: "0401",
    runnerName: "Diane67",
    finishTime: "5:10:12 AM",
  },
  {
    id: "female-3",
    division: "female",
    place: 3,
    bibNumber: "0391",
    runnerName: "xyza222233",
    finishTime: "5:19:39 AM",
  },
];

export const publicDisplayLatestRunners: LatestRunnerCard[] = [
  {
    id: "latest-male",
    division: "male",
    bibNumber: "0138",
    runnerName: "Cybel",
    finishTime: "5:25:29 AM",
  },
  {
    id: "latest-female",
    division: "female",
    bibNumber: "0012",
    runnerName: "Anna",
    finishTime: "5:25:29 AM",
  },
];

export function formatFinishTime(timestamp: Date | string) {
  return timeFormatter.format(typeof timestamp === "string" ? new Date(timestamp) : timestamp);
}

export function createRunnerName(seed: number) {
  return runnerNamePool[seed % runnerNamePool.length];
}

export function buildManualFinisher({
  place,
  bibNumber,
  runnerName,
  status,
  source,
  timestamp,
}: {
  place: number;
  bibNumber: string;
  runnerName: string;
  status: FinisherStatus;
  source: FinisherSource;
  timestamp: Date;
}): FinisherRecord {
  return {
    id: `finisher-${place}-${timestamp.getTime()}`,
    place,
    bibNumber,
    runnerName,
    finishTime: formatFinishTime(timestamp),
    loggedAt: timestamp.toISOString(),
    source,
    status,
    confidence: status === "verified" ? 0.99 : 0.68,
  };
}

export function buildSystemLog({
  level,
  message,
  timestamp = new Date(),
}: {
  level: SystemLogEntry["level"];
  message: string;
  timestamp?: Date;
}): SystemLogEntry {
  return {
    id: `log-${timestamp.getTime()}-${message.length}`,
    timestamp: timestamp.toISOString(),
    level,
    message,
  };
}
