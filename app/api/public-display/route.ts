import { NextResponse } from "next/server";
import { readPublicDisplayFeed } from "@/lib/excel-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  try {
    return NextResponse.json(readPublicDisplayFeed(), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read workbook data.";

    return NextResponse.json(
      {
        finishers: [],
        updatedAt: new Date().toISOString(),
        masterlistPath: "",
        resultsPath: "",
        error: message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
