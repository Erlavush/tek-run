import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), "data", "results-live.xlsx");
const sheetName = "Finishers";
const mode = process.argv.includes("--blank") ? "blank" : "sample";
const masterlistPath = path.join(process.cwd(), "data", "masterlist.xlsx");
const sampleCount = 10;
const sampleRaceStartIso = "2026-04-20T05:00:00+08:00";

function csvEscape(value) {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

function mulberry32(seed) {
  let nextSeed = seed;

  return () => {
    nextSeed |= 0;
    nextSeed = (nextSeed + 0x6d2b79f5) | 0;
    let hash = Math.imul(nextSeed ^ (nextSeed >>> 15), 1 | nextSeed);
    hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash;
    return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
  };
}

function formatElapsedTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function buildSampleRows(masterlistRows) {
  const rng = mulberry32(20260420);
  const selected = [...masterlistRows]
    .sort(() => rng() - 0.5)
    .slice(0, sampleCount);

  const raceStart = new Date(sampleRaceStartIso);
  let currentElapsedSeconds = 19 * 60 + 12;

  return selected.map((row, index) => {
    currentElapsedSeconds += 48 + Math.floor(rng() * 96);
    const clockFinish = new Date(raceStart.getTime() + currentElapsedSeconds * 1000);

    return {
      overall_place: index + 1,
      bib_number: row.bibNumber,
      elapsed_race_time: formatElapsedTime(currentElapsedSeconds),
      clock_finish_time: clockFinish.toISOString(),
      source: rng() > 0.72 ? "manual" : "auto",
      confidence: (0.82 + rng() * 0.17).toFixed(2),
      review_status: "verified",
    };
  });
}

const headers = [
  "overall_place",
  "bib_number",
  "elapsed_race_time",
  "clock_finish_time",
  "source",
  "confidence",
  "review_status",
];

let dataRows = [];

if (mode === "sample") {
  const masterlistBlob = await FileBlob.load(masterlistPath);
  const masterlistWorkbook = await SpreadsheetFile.importXlsx(masterlistBlob);
  const inspection = await masterlistWorkbook.inspect({
    kind: "table",
    range: "Masterlist!A1:C200",
    include: "values",
    tableMaxRows: 200,
    tableMaxCols: 3,
  });
  const masterlistValues = JSON.parse(inspection.ndjson).values;
  const masterlistRows = masterlistValues
    .slice(1)
    .filter((row) => row[0] && row[1] && row[2])
    .map((row) => ({
      bibNumber: row[0],
      runnerName: row[1],
      gender: row[2],
    }));

  dataRows = buildSampleRows(masterlistRows);
}

const csvText = [headers, ...dataRows.map((row) => headers.map((header) => row[header] ?? ""))]
  .map((line) => line.map(csvEscape).join(","))
  .join("\n");

const workbook = await Workbook.fromCSV(csvText, { sheetName });
const worksheet = workbook.worksheets.getItem(sheetName);

if (worksheet) {
  worksheet.getRange("C2:C500").format.numberFormat = "[h]:mm:ss";
}

const inspection = await workbook.inspect({
  kind: "table",
  range: `${sheetName}!A1:G12`,
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 7,
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(JSON.stringify({ outputPath, mode, rowCount: dataRows.length }));
console.log(inspection.ndjson);
