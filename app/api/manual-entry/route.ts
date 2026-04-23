import { NextResponse } from "next/server";
import { appendManualEntry, getManualEntryFeed } from "@/lib/server/race-store";
import type { ManualEntryPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function getRouteErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function getManualEntryErrorStatus(message: string) {
  const clientErrorMessages = [
    "Bib number is required.",
    "Race has not been started.",
    "Invalid capture time.",
    "Capture time cannot be earlier than the official race start.",
    "Captured finish time is after the official race end.",
  ];

  return clientErrorMessages.includes(message) ? 400 : 500;
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

export async function GET() {
  try {
    return NextResponse.json(await getManualEntryFeed(), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    const message = getRouteErrorMessage(error, "Unable to read manual entry feed.");

    return NextResponse.json(
      {
        entries: [],
        updatedAt: new Date().toISOString(),
        masterlistPath: "",
        resultsPath: "",
        error: message,
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ManualEntryPayload;
    return NextResponse.json(await appendManualEntry(payload), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    const message = getRouteErrorMessage(error, "Unable to save manual entry.");

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: getManualEntryErrorStatus(message),
        headers: noStoreHeaders(),
      },
    );
  }
}
