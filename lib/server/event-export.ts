import * as XLSX from "xlsx";
import { getEventBackupData } from "@/lib/server/race-store";

export type EventExportFormat = "xlsx" | "json" | "csv";

interface EventExportFile {
  body: Buffer;
  contentType: string;
  fileName: string;
}

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "tek-run";
}

function buildBaseFileName(eventName: string, exportedAt: string) {
  const eventSlug = sanitizeFileNamePart(eventName);
  const timestamp = exportedAt
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "z");

  return `${eventSlug}-${timestamp}`;
}

export async function buildEventExport(format: EventExportFormat): Promise<EventExportFile> {
  const backup = await getEventBackupData();
  const baseFileName = buildBaseFileName(backup.race.eventName, backup.exportedAt);

  if (format === "json") {
    return {
      body: Buffer.from(JSON.stringify(backup, null, 2), "utf8"),
      contentType: "application/json; charset=utf-8",
      fileName: `${baseFileName}.json`,
    };
  }

  if (format === "csv") {
    const finishersRows = backup.finishers.map((entry) => ({
      sequence: entry.rowNumber,
      bibNumber: entry.bibNumber,
      runnerName: entry.runnerName ?? "",
      division: entry.division ?? "",
      elapsedRaceTime: entry.elapsedRaceTime,
      clockFinishTime: entry.clockFinishTime,
      reviewStatus: entry.reviewStatus,
      source: entry.source,
    }));
    const csvSheet = XLSX.utils.json_to_sheet(finishersRows);
    const csvText = XLSX.utils.sheet_to_csv(csvSheet);

    return {
      body: Buffer.from(csvText, "utf8"),
      contentType: "text/csv; charset=utf-8",
      fileName: `${baseFileName}-finishers.csv`,
    };
  }

  const summaryRows = [
    { field: "Exported At", value: backup.exportedAt },
    { field: "Event Name", value: backup.race.eventName },
    { field: "Race Status", value: backup.race.raceStatus },
    { field: "Race Start", value: backup.race.raceStartTimeIso ?? "" },
    { field: "Race End", value: backup.race.raceEndTimeIso ?? "" },
    { field: "Total Runners", value: backup.counts.totalRunners },
    { field: "Total Finishers", value: backup.counts.totalFinishers },
    { field: "Verified Finishers", value: backup.counts.verifiedFinishers },
    { field: "Video Source", value: backup.video.activeSourceLabel ?? "" },
    { field: "Video Status", value: backup.video.publishStatus },
    { field: "Video Heartbeat", value: backup.video.lastHeartbeat ?? "" },
  ];
  const runnerRows = backup.runners.map((runner) => ({
    bibNumber: runner.bibNumber,
    runnerName: runner.runnerName,
    division: runner.division,
    createdAt: runner.createdAt,
  }));
  const finisherRows = backup.finishers.map((entry) => ({
    sequence: entry.rowNumber,
    bibNumber: entry.bibNumber,
    runnerName: entry.runnerName ?? "",
    division: entry.division ?? "",
    elapsedRaceTime: entry.elapsedRaceTime,
    clockFinishTime: entry.clockFinishTime,
    reviewStatus: entry.reviewStatus,
    source: entry.source,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(runnerRows), "Runners");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(finisherRows), "Finishers");

  return {
    body: XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: `${baseFileName}.xlsx`,
  };
}
