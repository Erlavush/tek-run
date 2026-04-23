import { NextResponse } from "next/server";
import { getFinisherReviewFeed } from "@/lib/server/race-store";

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
    return NextResponse.json(await getFinisherReviewFeed(), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        entries: [],
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unable to load finisher review feed.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      },
    );
  }
}
