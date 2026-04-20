import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import XLSX from "xlsx";

const workbookPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), "data", "results-live.xlsx");

const sourceWorkbook = XLSX.readFile(workbookPath, {
  cellDates: true,
});
const sourceWorksheet =
  sourceWorkbook.Sheets.Finishers ?? sourceWorkbook.Sheets[sourceWorkbook.SheetNames[0] ?? ""];

if (!sourceWorksheet) {
  throw new Error(`No worksheet found in ${workbookPath}`);
}

const sourceRows = XLSX.utils.sheet_to_json(sourceWorksheet, {
  blankrows: false,
  defval: "",
  raw: false,
});

const headers = sourceRows.length
  ? Object.keys(sourceRows[0])
  : [
      "overall_place",
      "bib_number",
      "elapsed_race_time",
      "clock_finish_time",
      "source",
      "confidence",
      "review_status",
    ];

function csvEscape(value) {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

const csvText = [headers, ...sourceRows.map((row) => headers.map((header) => row[header] ?? ""))]
  .map((line) => line.map(csvEscape).join(","))
  .join("\n");

const workbook = await Workbook.fromCSV(csvText, { sheetName: "Finishers" });
const worksheet = workbook.worksheets.getItem("Finishers");

if (!worksheet) {
  throw new Error(`No worksheet found in ${workbookPath}`);
}

worksheet.getRange("C2:C500").format.numberFormat = "[h]:mm:ss";

const output = await SpreadsheetFile.exportXlsx(workbook);
await fs.mkdir(path.dirname(workbookPath), { recursive: true });
await output.save(workbookPath);

console.log(JSON.stringify({ workbookPath, formattedRange: "C2:C500", numberFormat: "[h]:mm:ss" }));
