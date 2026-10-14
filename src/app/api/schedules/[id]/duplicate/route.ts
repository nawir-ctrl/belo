import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const original = await prisma.bellSchedule.findUnique({
      where: { id: params.id },
    });

    if (!original) {
      return NextResponse.json({ error: "Jadwal asli tidak ditemukan." }, { status: 404 });
    }

    const duplicated = await prisma.bellSchedule.create({
      data: {
        name: `${original.name} (Salinan)`,
        time: original.time,
        daysOfWeek: original.daysOfWeek,
        bellType: original.bellType,
        audioAssetId: original.audioAssetId,
        audioAssetIds: original.audioAssetIds,
        volume: original.volume,
        repeatCount: original.repeatCount,
        repeatIntervalSec: original.repeatIntervalSec,
        isActive: false, // Default nonaktifkan salinan agar user meninjau dulu
        startDate: original.startDate,
        endDate: original.endDate,
        priority: original.priority,
        specialPeriodId: original.specialPeriodId,
        notes: original.notes,
      },
      include: {
        audioAsset: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DUPLICATE",
        entityType: "SCHEDULE",
        entityId: duplicated.id,
        details: JSON.stringify({ originalId: original.id, newName: duplicated.name }),
      },
    });

    return NextResponse.json({ success: true, schedule: duplicated }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
