import { NextResponse } from "next/server";
import { createVideoAccessToken } from "@/lib/server/livekit";
import type { VideoTokenRequest } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as VideoTokenRequest;

    return NextResponse.json(await createVideoAccessToken(payload), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create a video token.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      },
    );
  }
}
