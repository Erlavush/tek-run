import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourceDirectory = "C:\\Users\\user\\Downloads\\race-bibs-0001-0100";
const outputPath = path.join(process.cwd(), "data", "masterlist.xlsx");
const sheetName = "Masterlist";

const femaleNames = new Set([
  "abby",
  "abigail",
  "angel",
  "anna",
  "anne",
  "bea",
  "bianca",
  "cathy",
  "charmaine",
  "christine",
  "diane",
  "dree",
  "erika",
  "faith",
  "gwen",
  "hazel",
  "ivy",
  "jane",
  "jessa",
  "joy",
  "kathlen",
  "kaye",
  "krisha",
  "lianne",
  "lilo",
  "maria",
  "marie",
  "mariz",
  "mary",
  "patricia",
  "pauline",
  "rain",
  "rose",
  "shan",
  "sofia",
  "sophia",
  "trisha",
  "vinise",
  "yvonne",
]);

const maleNames = new Set([
  "aaron",
  "aldrin",
  "angelo",
  "charles",
  "daniel",
  "david",
  "edward",
  "eren",
  "gabriel",
  "gilbert",
  "james",
  "jerome",
  "john",
  "kipchoge",
  "mark",
  "miguel",
  "paul",
  "rex",
  "ryan",
  "tomas",
  "vince",
]);

function titleCaseWord(word) {
  if (!word) {
    return "";
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizeRunnerName(rawName) {
  return rawName
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

function inferGender(runnerName) {
  const firstName = runnerName.split(" ")[0]?.toLowerCase() ?? "";

  if (femaleNames.has(firstName)) {
    return "Female";
  }

  if (maleNames.has(firstName)) {
    return "Male";
  }

  if (/(a|e|i|ie|lyn|lynn|rose|joy|mae)$/i.test(firstName)) {
    return "Female";
  }

  return "Male";
}

function csvEscape(value) {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

const directoryEntries = await fs.readdir(sourceDirectory, { withFileTypes: true });

const rows = directoryEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name.match(/^bib-(\d{4})-(.+)\.png$/i))
  .filter((match) => match !== null)
  .map((match) => {
    const bibNumber = match[1];
    const runnerName = normalizeRunnerName(match[2]);

    return {
      bib_number: bibNumber,
      runner_name: runnerName,
      gender: inferGender(runnerName),
    };
  })
  .sort((left, right) => left.bib_number.localeCompare(right.bib_number));

const csvText = [
  ["bib_number", "runner_name", "gender"],
  ...rows.map((row) => [row.bib_number, row.runner_name, row.gender]),
]
  .map((line) => line.map(csvEscape).join(","))
  .join("\n");

const workbook = await Workbook.fromCSV(csvText, { sheetName });

const inspection = await workbook.inspect({
  kind: "table",
  range: `${sheetName}!A1:C12`,
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 3,
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(JSON.stringify({ outputPath, rowCount: rows.length }));
console.log(inspection.ndjson);
