import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Papa from "papaparse";
import { ensureDefaultChime } from "@/lib/default-sound";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File CSV tidak ditemukan." }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json({ error: `Gagal membaca CSV: ${parsed.errors[0]?.message}` }, { status: 400 });
    }

    const defaultAudioId = await ensureDefaultChime();
    let importedCount = 0;

    for (const row of parsed.data as any[]) {
      if (!row.name || !row.time) continue;

      let days = [1, 2, 3, 4, 5];
      if (row.daysOfWeek) {
        try {
          days = JSON.parse(row.daysOfWeek);
        } catch {
          days = [1, 2, 3, 4, 5];
        }
      }

      await prisma.bellSchedule.create({
        data: {
          name: String(row.name).trim(),
          time: String(row.time).trim(),
          daysOfWeek: JSON.stringify(days),
          bellType: row.bellType || "KHUSUS",
          audioAssetId: defaultAudioId,
          volume: parseInt(row.volume, 10) || 80,
          repeatCount: parseInt(row.repeatCount, 10) || 1,
          repeatIntervalSec: parseInt(row.repeatIntervalSec, 10) || 2,
          isActive: row.isActive === "1" || row.isActive === "true",
          startDate: row.startDate || null,
          endDate: row.endDate || null,
          notes: row.notes || null,
        },
      });
      importedCount++;
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "IMPORT",
        entityType: "SCHEDULE",
        details: JSON.stringify({ count: importedCount, fileName: file.name }),
      },
    });

    return NextResponse.json({ success: true, count: importedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
