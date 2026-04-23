import { NextResponse } from "next/server";
import { getVideoState, updateVideoState } from "@/lib/server/race-store";
import type { VideoStateUpdatePayload } from "@/lib/types";

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
    return NextResponse.json(await getVideoState(), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load video state.",
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
    const payload = (await request.json()) as VideoStateUpdatePayload;

    return NextResponse.json(await updateVideoState(payload), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update video state.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      },
    );
  }
}
