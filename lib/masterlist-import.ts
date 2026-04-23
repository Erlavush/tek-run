import * as XLSX from "xlsx";
import { normalizeBibNumber } from "@/lib/bib";
import type { MasterlistEntry, RaceDivision } from "@/lib/types";

type WorksheetRow = Record<string, unknown>;

function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstString(row: WorksheetRow, keys: string[]) {
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

export function parseMasterlistWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(Buffer.from(buffer), {
    type: "buffer",
    cellDates: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  const preferredSheetName =
    workbook.SheetNames.find((sheetName) =>
      ["Masterlist", "Import Ready", "Bib List"].includes(sheetName),
    ) ?? firstSheetName;
  const sheet = workbook.Sheets[preferredSheetName ?? ""];

  if (!sheet) {
    throw new Error("Masterlist workbook does not contain a readable sheet.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    blankrows: false,
    defval: "",
    raw: false,
  });

  const normalizedRows = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value]),
    ),
  );

  let skippedCount = 0;
  const entries = normalizedRows
    .map((row): MasterlistEntry | null => {
      const bibNumber = normalizeBibNumber(
        firstString(row, ["bib_number", "bib", "bib_no", "bibid"]),
      );
      const runnerName = firstString(row, ["runner_name", "name", "participant_name"]);
      const division = normalizeDivision(firstString(row, ["gender", "division", "sex"]));

      if (!bibNumber || !runnerName || !division) {
        skippedCount += 1;
        return null;
      }

      return {
        bibNumber,
        runnerName,
        division,
      };
    })
    .filter((entry): entry is MasterlistEntry => entry !== null);

  return {
    entries,
    skippedCount,
  };
}
