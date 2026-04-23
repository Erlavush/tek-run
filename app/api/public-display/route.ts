import { NextResponse } from "next/server";
import { getPublicDisplayFeed } from "@/lib/server/race-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getPublicDisplayFeed(), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read shared race data.";

    return NextResponse.json(
      {
        finishers: [],
        race: {
          id: "",
          eventName: "Community Run 2026",
          raceStatus: "idle",
          raceStartTimeIso: null,
          raceEndTimeIso: null,
          updatedAt: new Date().toISOString(),
        },
        video: {
          eventId: "",
          activeSourceSlot: null,
          activeSourceLabel: null,
          publishStatus: "idle",
          updatedAt: new Date().toISOString(),
          lastHeartbeat: null,
        },
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
