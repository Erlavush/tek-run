import { NextResponse } from "next/server";
import { importMasterlist } from "@/lib/server/race-store";

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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Upload an .xlsx masterlist file.");
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new Error("Only .xlsx files are supported for masterlist import.");
    }

    return NextResponse.json(await importMasterlist(await file.arrayBuffer()), {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to import masterlist.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      },
    );
  }
}
