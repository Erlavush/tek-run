import { NextResponse } from "next/server";
import { getRaceResponse, updateRaceState } from "@/lib/server/race-store";
import type { RaceActionPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

export async function GET() {
  try {
    return NextResponse.json(await getRaceResponse(), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load race state.",
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
    const payload = (await request.json()) as RaceActionPayload;

    return NextResponse.json(await updateRaceState(payload), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update race state.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      },
    );
  }
}
