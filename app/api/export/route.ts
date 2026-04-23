import { NextResponse } from "next/server";
import { buildEventExport, type EventExportFormat } from "@/lib/server/event-export";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function isEventExportFormat(value: string | null): value is EventExportFormat {
  return value === "xlsx" || value === "json" || value === "csv";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedFormat = searchParams.get("format");
    const format = isEventExportFormat(requestedFormat) ? requestedFormat : "xlsx";
    const exportFile = await buildEventExport(format);

    return new NextResponse(new Uint8Array(exportFile.body), {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": exportFile.contentType,
        "Content-Disposition": `attachment; filename="${exportFile.fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to export the event backup.",
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
