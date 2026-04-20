import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const dataDirectory = path.join(process.cwd(), "data");
const masterlistPath = path.join(dataDirectory, "masterlist.xlsx");
const resultsPath = path.join(dataDirectory, "results-live.xlsx");

const masterlistRows = [
  { bib_number: "B-318", runner_name: "Miguel Santos", gender: "Male" },
  { bib_number: "B-452", runner_name: "Jessa Navarro", gender: "Female" },
  { bib_number: "C-067", runner_name: "Danilo Cruz", gender: "Male" },
  { bib_number: "A-229", runner_name: "Paula Dela Vega", gender: "Female" },
  { bib_number: "D-144", runner_name: "Ramon Estrella", gender: "Male" },
  { bib_number: "B-514", runner_name: "Aira Mendoza", gender: "Female" },
  { bib_number: "C-205", runner_name: "Tomas Lucena", gender: "Male" },
  { bib_number: "E-091", runner_name: "Kaye Lopez", gender: "Female" },
  { bib_number: "B-601", runner_name: "Noel Cabral", gender: "Male" },
  { bib_number: "D-387", runner_name: "Bianca Ramos", gender: "Female" },
  { bib_number: "M-101", runner_name: "Mark Villanueva", gender: "Male" },
  { bib_number: "F-102", runner_name: "Ivy Garcia", gender: "Female" },
];

const resultsHeaders = [
  [
    "place",
    "bib_number",
    "finish_timestamp",
    "finish_time_from_start",
    "source",
    "confidence",
    "review_status",
  ],
];

await fs.mkdir(dataDirectory, { recursive: true });

const masterlistWorkbook = XLSX.utils.book_new();
const masterlistSheet = XLSX.utils.json_to_sheet(masterlistRows);
masterlistSheet["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }];
XLSX.utils.book_append_sheet(masterlistWorkbook, masterlistSheet, "Masterlist");
XLSX.writeFile(masterlistWorkbook, masterlistPath);

const resultsWorkbook = XLSX.utils.book_new();
const resultsSheet = XLSX.utils.aoa_to_sheet(resultsHeaders);
resultsSheet["!cols"] = [
  { wch: 10 },
  { wch: 14 },
  { wch: 24 },
  { wch: 20 },
  { wch: 12 },
  { wch: 12 },
  { wch: 16 },
];
XLSX.utils.book_append_sheet(resultsWorkbook, resultsSheet, "Finishers");
XLSX.writeFile(resultsWorkbook, resultsPath);

console.log(masterlistPath);
console.log(resultsPath);
