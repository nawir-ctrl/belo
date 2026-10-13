import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Papa from "papaparse";

export async function GET() {
  try {
    const schedules = await prisma.bellSchedule.findMany({
      include: {
        audioAsset: true,
      },
      orderBy: { time: "asc" },
    });

    const rows = schedules.map((s) => ({
      name: s.name,
      time: s.time,
      daysOfWeek: s.daysOfWeek,
      bellType: s.bellType,
      volume: s.volume,
      repeatCount: s.repeatCount,
      repeatIntervalSec: s.repeatIntervalSec,
      isActive: s.isActive ? "1" : "0",
      startDate: s.startDate || "",
      endDate: s.endDate || "",
      notes: s.notes || "",
    }));

    const csvString = Papa.unparse(rows);

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="smartbell_schedules_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
