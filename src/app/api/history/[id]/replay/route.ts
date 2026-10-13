import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const original = await prisma.bellExecution.findUnique({
      where: { id: params.id },
    });

    if (!original) {
      return NextResponse.json({ error: "Data riwayat bel tidak ditemukan." }, { status: 404 });
    }

    const now = new Date();
    const occurrenceKey = `REPLAY_${params.id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    const replayExecution = await prisma.bellExecution.create({
      data: {
        scheduleId: original.scheduleId,
        occurrenceKey,
        bellName: `${original.bellName} (Putar Ulang Manual)`,
        bellType: original.bellType,
        scheduledFor: now,
        triggeredAt: now,
        status: "TRIGGERED",
        isManual: true,
        audioAssetId: original.audioAssetId,
        volume: original.volume,
        repeatCount: original.repeatCount,
        repeatIntervalSec: original.repeatIntervalSec,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY",
        entityType: "SCHEDULE",
        entityId: original.id,
        details: JSON.stringify({ replayExecutionId: replayExecution.id, bellName: original.bellName }),
      },
    });

    return NextResponse.json({ success: true, execution: replayExecution });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
