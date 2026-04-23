import { NextResponse } from "next/server";
import {
  deleteFinisherReview,
  updateFinisherReview,
} from "@/lib/server/race-store";
import type { FinisherReviewUpdatePayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ finisherId: string }> },
) {
  try {
    const { finisherId } = await context.params;
    const payload = (await request.json()) as FinisherReviewUpdatePayload;

    return NextResponse.json(await updateFinisherReview(finisherId, payload), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update finisher.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ finisherId: string }> },
) {
  try {
    const { finisherId } = await context.params;

    return NextResponse.json(await deleteFinisherReview(finisherId), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete finisher.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      },
    );
  }
}
