import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { normalizeBibNumber } from "@/lib/bib";
import type {
  MasterlistEntry,
  ManualEntryFeed,
  ManualEntryPayload,
  ManualEntryRecord,
  PublicDisplayFeed,
  PublicDisplayFinisher,
  RaceDivision,
  ReviewStatus,
  ResultsWorkbookEntry,
} from "@/lib/types";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const MASTERLIST_SHEET_NAME = "Masterlist";
const RESULTS_SHEET_NAME = "Finishers";
const RESULTS_HEADERS = [
  "overall_place",
  "bib_number",
  "elapsed_race_time",
  "clock_finish_time",
  "source",
  "confidence",
  "review_status",
] as const;

XLSX.set_fs(fs);

export const MASTERLIST_WORKBOOK_PATH = path.join(DATA_DIRECTORY, "masterlist.xlsx");
export const RESULTS_WORKBOOK_PATH = path.join(DATA_DIRECTORY, "results-live.xlsx");

type NormalizedWorksheetRow = Record<string, unknown>;

function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatElapsedTimeString(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function normalizeDivision(value: string): RaceDivision | null {
  const normalized = value.trim().toLowerCase();

  if (["male", "m", "man", "men", "boy"].includes(normalized)) {
    return "male";
  }

  if (["female", "f", "woman", "women", "girl"].includes(normalized)) {
    return "female";
  }

  return null;
}

function normalizeReviewStatus(value: string): ReviewStatus {
  const normalized = value.trim().toLowerCase();

  if (normalized === "duplicate") {
    return "duplicate";
  }

  if (normalized === "needs review") {
    return "needs review";
  }

  return "verified";
}

function readWorksheetRows(filePath: string, preferredSheetName: string) {
  if (!fs.existsSync(filePath)) {
    return [] as NormalizedWorksheetRow[];
  }

  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
  });
  const sheet =
    workbook.Sheets[preferredSheetName] ?? workbook.Sheets[workbook.SheetNames[0] ?? ""];

  if (!sheet) {
    return [] as NormalizedWorksheetRow[];
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    blankrows: false,
    defval: "",
    raw: false,
  });

  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value]),
    ),
  );
}

function firstString(row: NormalizedWorksheetRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toString();
    }
  }

  return "";
}

function firstNumber(row: NormalizedWorksheetRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value.trim());

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function normalizeTimestamp(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

function parseComparableTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getTime();
  }

  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  const meridiem = match[4]?.replace(/\./g, "").toUpperCase() ?? null;

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  } else if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function getComparableRaceTime(entry: {
  finishTimeFromStart: string | null;
  finishTimestamp: string | null;
}) {
  const elapsedTime = parseComparableTimestamp(entry.finishTimeFromStart);

  if (elapsedTime !== null) {
    return elapsedTime;
  }

  return parseComparableTimestamp(entry.finishTimestamp);
}

function writeResultsWorkbook(rows: NormalizedWorksheetRow[]) {
  const worksheetRows = [
    [...RESULTS_HEADERS],
    ...rows.map((row) => RESULTS_HEADERS.map((header) => row[header] ?? "")),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(worksheetRows);

  for (let rowNumber = 2; rowNumber <= Math.max(rows.length + 1, 500); rowNumber += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowNumber - 1, c: 2 });

    if (!sheet[cellAddress]) {
      sheet[cellAddress] = {
        t: "z",
      };
    }

    sheet[cellAddress].z = "[h]:mm:ss";
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, RESULTS_SHEET_NAME);

  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  XLSX.writeFile(workbook, RESULTS_WORKBOOK_PATH, {
    compression: true,
  });
}

function choosePreferredFinisher(
  left: PublicDisplayFinisher,
  right: PublicDisplayFinisher,
) {
  const leftTimestamp = parseComparableTimestamp(left.finishTimestamp);
  const rightTimestamp = parseComparableTimestamp(right.finishTimestamp);

  if (leftTimestamp !== null || rightTimestamp !== null) {
    if (leftTimestamp === null) {
      return right;
    }

    if (rightTimestamp === null) {
      return left;
    }

    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp > rightTimestamp ? left : right;
    }
  }

  return left.rowNumber > right.rowNumber ? left : right;
}

function deduplicateFinishersByBib(finishers: PublicDisplayFinisher[]) {
  const deduplicated = new Map<string, PublicDisplayFinisher>();

  for (const finisher of finishers) {
    const existing = deduplicated.get(finisher.bibNumber);

    if (!existing) {
      deduplicated.set(finisher.bibNumber, finisher);
      continue;
    }

    deduplicated.set(finisher.bibNumber, choosePreferredFinisher(existing, finisher));
  }

  return Array.from(deduplicated.values());
}

function isPublicDisplayReadyResult(entry: ResultsWorkbookEntry) {
  if (!entry.bibNumber) {
    return false;
  }

  return getComparableRaceTime(entry) !== null;
}

function readMasterlist() {
  return readWorksheetRows(MASTERLIST_WORKBOOK_PATH, MASTERLIST_SHEET_NAME)
    .map((row): MasterlistEntry | null => {
      const bibNumber = normalizeBibNumber(
        firstString(row, ["bib_number", "bib", "bib_no", "bibid"]),
      );
      const runnerName = firstString(row, ["runner_name", "name", "participant_name"]);
      const division = normalizeDivision(firstString(row, ["gender", "division", "sex"]));

      if (!bibNumber || !runnerName || !division) {
        return null;
      }

      return {
        bibNumber,
        runnerName,
        division,
      };
    })
    .filter((entry): entry is MasterlistEntry => entry !== null);
}

function readResultsWorkbook() {
  return readWorksheetRows(RESULTS_WORKBOOK_PATH, RESULTS_SHEET_NAME)
    .map((row, index): ResultsWorkbookEntry | null => {
      const bibNumber = normalizeBibNumber(
        firstString(row, ["bib_number", "bib", "bib_no", "bibid"]),
      );
      const place = firstNumber(row, [
        "place",
        "overall_place",
        "finish_order",
        "rank",
        "sequence_number",
      ]);
      const finishTimestamp = normalizeTimestamp(
        firstString(row, [
          "finish_timestamp",
          "clock_finish_time",
          "crossing_clock_time",
          "timestamp",
          "logged_at",
        ]),
      );
      const finishTimeFromStart = firstString(
        row,
        [
          "finish_time_from_start",
          "elapsed_race_time",
          "race_elapsed_time",
          "finish_time",
          "elapsed_time",
        ],
      );
      const source = firstString(row, ["source"]) || "manual";
      const confidence = firstNumber(row, ["confidence"]);
      const reviewStatus = normalizeReviewStatus(
        firstString(row, ["review_status", "status"]) || "verified",
      );

      if (!bibNumber) {
        return null;
      }

      return {
        rowNumber: index + 2,
        place,
        bibNumber,
        finishTimestamp,
        finishTimeFromStart: finishTimeFromStart || null,
        source,
        confidence,
        reviewStatus,
      };
    })
    .filter((entry): entry is ResultsWorkbookEntry => entry !== null);
}

function createManualEntryRecord(
  entry: ResultsWorkbookEntry,
  masterlistLookup: Map<string, MasterlistEntry>,
): ManualEntryRecord {
  const mappedRunner = masterlistLookup.get(normalizeBibNumber(entry.bibNumber)) ?? null;
  const warning = entry.reviewStatus === "duplicate" ? "duplicate" : mappedRunner ? null : "unknown";

  return {
    id: `manual-${entry.rowNumber}`,
    rowNumber: entry.rowNumber,
    bibNumber: normalizeBibNumber(entry.bibNumber),
    runnerName: mappedRunner?.runnerName ?? null,
    division: mappedRunner?.division ?? null,
    elapsedRaceTime: entry.finishTimeFromStart ?? "--:--:--",
    clockFinishTime: entry.finishTimestamp ?? "",
    reviewStatus: entry.reviewStatus,
    warning,
  };
}

export function readManualEntryFeed(limit = 8): ManualEntryFeed {
  const masterlist = readMasterlist();
  const masterlistLookup = new Map(
    masterlist.map((entry) => [normalizeBibNumber(entry.bibNumber), entry]),
  );
  const entries = readResultsWorkbook()
    .map((entry) => createManualEntryRecord(entry, masterlistLookup))
    .sort((left, right) => right.rowNumber - left.rowNumber)
    .slice(0, limit);

  return {
    entries,
    race: {
      id: "local-workbook",
      eventName: "Community Run 2026",
      raceStatus: "idle",
      raceStartTimeIso: null,
      raceEndTimeIso: null,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
    masterlistPath: MASTERLIST_WORKBOOK_PATH,
    resultsPath: RESULTS_WORKBOOK_PATH,
  };
}

export function appendManualEntry(payload: ManualEntryPayload) {
  const normalizedBib = normalizeBibNumber(payload.bibNumber);

  if (!normalizedBib) {
    throw new Error("Bib number is required.");
  }

  if (!payload.raceStartTimeIso) {
    throw new Error("Race has not been started.");
  }

  const capturedAt = new Date(payload.capturedAtIso);
  const raceStartTime = new Date(payload.raceStartTimeIso);

  if (Number.isNaN(capturedAt.getTime()) || Number.isNaN(raceStartTime.getTime())) {
    throw new Error("Invalid capture time.");
  }

  const currentRows = readWorksheetRows(RESULTS_WORKBOOK_PATH, RESULTS_SHEET_NAME);
  const currentEntries = readResultsWorkbook();
  const masterlist = readMasterlist();
  const masterlistLookup = new Map(
    masterlist.map((entry) => [normalizeBibNumber(entry.bibNumber), entry]),
  );
  const duplicateDetected = currentEntries.some(
    (entry) => normalizeBibNumber(entry.bibNumber) === normalizedBib,
  );
  const unknownBib = !masterlistLookup.has(normalizedBib);
  const elapsedSeconds = Math.max(
    0,
    Math.floor((capturedAt.getTime() - raceStartTime.getTime()) / 1000),
  );
  const reviewStatus = duplicateDetected ? "duplicate" : unknownBib ? "needs review" : "verified";
  const nextRowNumber = currentRows.length + 2;

  currentRows.push({
    overall_place: currentRows.length + 1,
    bib_number: normalizedBib,
    elapsed_race_time: formatElapsedTimeString(elapsedSeconds),
    clock_finish_time: capturedAt.toISOString(),
    source: "manual",
    confidence: "",
    review_status: reviewStatus,
  });

  writeResultsWorkbook(currentRows);

  const savedEntry = createManualEntryRecord(
    {
      rowNumber: nextRowNumber,
      place: currentRows.length,
      bibNumber: normalizedBib,
      finishTimestamp: capturedAt.toISOString(),
      finishTimeFromStart: formatElapsedTimeString(elapsedSeconds),
      source: "manual",
      confidence: null,
      reviewStatus,
    },
    masterlistLookup,
  );

  return {
    entry: savedEntry,
    duplicateDetected,
    unknownBib,
    updatedAt: new Date().toISOString(),
    resultsPath: RESULTS_WORKBOOK_PATH,
  };
}

export function readPublicDisplayFeed(): PublicDisplayFeed {
  const masterlist = readMasterlist();
  const masterlistLookup = new Map(
    masterlist.map((entry) => [normalizeBibNumber(entry.bibNumber), entry]),
  );

  const finishers = deduplicateFinishersByBib(
    readResultsWorkbook()
      .map((entry): PublicDisplayFinisher | null => {
        if (!isPublicDisplayReadyResult(entry)) {
          return null;
        }

        const mappedRunner = masterlistLookup.get(normalizeBibNumber(entry.bibNumber));

        if (!mappedRunner) {
          return null;
        }

        return {
          id: `${entry.bibNumber}-${entry.rowNumber}`,
          rowNumber: entry.rowNumber,
          place: entry.place,
          bibNumber: mappedRunner.bibNumber,
          runnerName: mappedRunner.runnerName,
          division: mappedRunner.division,
          finishTimestamp: entry.finishTimestamp,
          finishTimeFromStart: entry.finishTimeFromStart,
          source: entry.source,
          confidence: entry.confidence,
          reviewStatus: entry.reviewStatus,
        };
      })
      .filter((entry): entry is PublicDisplayFinisher => entry !== null),
  ).sort((left, right) => left.rowNumber - right.rowNumber);

  return {
    finishers,
    race: {
      id: "local-workbook",
      eventName: "Community Run 2026",
      raceStatus: "idle",
      raceStartTimeIso: null,
      raceEndTimeIso: null,
      updatedAt: new Date().toISOString(),
    },
    video: {
      eventId: "local-workbook",
      activeSourceSlot: null,
      activeSourceLabel: null,
      publishStatus: "idle",
      updatedAt: new Date().toISOString(),
      lastHeartbeat: null,
    },
    masterlistPath: MASTERLIST_WORKBOOK_PATH,
    resultsPath: RESULTS_WORKBOOK_PATH,
    updatedAt: new Date().toISOString(),
  };
}
