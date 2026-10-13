import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureDefaultChime } from "@/lib/default-sound";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Boleh dijalankan oleh user terautentikasi atau operator lokal
    let audioAssetId: string | null = null;
    let volume = 85;
    let repeatCount = 1;

    try {
      const body = await req.json();
      audioAssetId = body.audioAssetId || null;
      volume = body.volume !== undefined ? body.volume : 85;
      repeatCount = body.repeatCount || 1;
    } catch {}

    if (!audioAssetId) {
      audioAssetId = await ensureDefaultChime();
    }

    const now = new Date();
    const occurrenceKey = `MANUAL_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const execution = await prisma.bellExecution.create({
      data: {
        occurrenceKey,
        bellName: "Uji Coba Suara (Manual)",
        bellType: "KHUSUS",
        scheduledFor: now,
        triggeredAt: now,
        status: "TRIGGERED",
        isManual: true,
        audioAssetId,
        volume,
        repeatCount,
        repeatIntervalSec: 2,
      },
      include: {
        audioAsset: true,
      },
    });

    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "SOUND_TEST",
          entityType: "SYSTEM",
          details: JSON.stringify({ executionId: execution.id, volume }),
        },
      });
    }

    return NextResponse.json({ success: true, execution }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
