import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scheduleSchema } from "@/lib/validations/schedule";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const day = searchParams.get("day");
  const bellType = searchParams.get("bellType");
  const isActive = searchParams.get("isActive");

  try {
    const schedules = await prisma.bellSchedule.findMany({
      where: {
        ...(search
          ? {
              name: { contains: search },
            }
          : {}),
        ...(bellType ? { bellType } : {}),
        ...(isActive !== null && isActive !== undefined && isActive !== ""
          ? { isActive: isActive === "true" }
          : {}),
      },
      include: {
        audioAsset: {
          select: { id: true, name: true, originalFileName: true, storedFileName: true },
        },
        specialPeriod: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ time: "asc" }, { priority: "desc" }],
    });

    // Filter day of week jika diminta (karena disimpan sebagai JSON string di SQLite)
    let filtered = schedules;
    if (day) {
      const dayNum = parseInt(day, 10);
      filtered = schedules.filter((s) => {
        try {
          const days = JSON.parse(s.daysOfWeek);
          return Array.isArray(days) && days.includes(dayNum);
        } catch {
          return true;
        }
      });
    }

    // Resolve all audioAssets for each schedule
    const allAssetIds = new Set<string>();
    for (const s of filtered) {
      if (s.audioAssetId) allAssetIds.add(s.audioAssetId);
      if (s.audioAssetIds) {
        try {
          const ids = JSON.parse(s.audioAssetIds);
          if (Array.isArray(ids)) ids.forEach((id) => allAssetIds.add(id));
        } catch {}
      }
    }

    const assetsMap = new Map();
    if (allAssetIds.size > 0) {
      const fetched = await prisma.audioAsset.findMany({
        where: { id: { in: Array.from(allAssetIds) } },
        select: { id: true, name: true, originalFileName: true, storedFileName: true, sourceType: true },
      });
      fetched.forEach((a) => assetsMap.set(a.id, a));
    }

    const enriched = filtered.map((s) => {
      let sequenceIds: string[] = [];
      if (s.audioAssetIds) {
        try {
          const parsed = JSON.parse(s.audioAssetIds);
          if (Array.isArray(parsed)) sequenceIds = parsed;
        } catch {}
      }
      if (sequenceIds.length === 0 && s.audioAssetId) {
        sequenceIds = [s.audioAssetId];
      }
      const audioAssets = sequenceIds.map((id) => assetsMap.get(id)).filter(Boolean);

      return {
        ...s,
        audioAssets,
      };
    });

    return NextResponse.json({ schedules: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = scheduleSchema.parse(body);

    const audioAssetIdsJson =
      parsed.audioAssetIds && parsed.audioAssetIds.length > 0
        ? JSON.stringify(parsed.audioAssetIds)
        : parsed.audioAssetId
        ? JSON.stringify([parsed.audioAssetId])
        : null;

    const primaryAudioId =
      parsed.audioAssetIds && parsed.audioAssetIds.length > 0
        ? parsed.audioAssetIds[0]
        : parsed.audioAssetId || null;

    const schedule = await prisma.bellSchedule.create({
      data: {
        name: parsed.name,
        time: parsed.time,
        daysOfWeek: JSON.stringify(parsed.daysOfWeek),
        bellType: parsed.bellType,
        audioAssetId: primaryAudioId,
        audioAssetIds: audioAssetIdsJson,
        volume: parsed.volume,
        repeatCount: parsed.repeatCount,
        repeatIntervalSec: parsed.repeatIntervalSec,
        isActive: parsed.isActive,
        startDate: parsed.startDate || null,
        endDate: parsed.endDate || null,
        priority: parsed.priority,
        specialPeriodId: parsed.specialPeriodId || null,
        notes: parsed.notes || null,
      },
      include: {
        audioAsset: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "SCHEDULE",
        entityId: schedule.id,
        details: JSON.stringify({ name: schedule.name, time: schedule.time, type: schedule.bellType }),
      },
    });

    return NextResponse.json({ success: true, schedule }, { status: 201 });
  } catch (err: any) {
    if (err.errors) {
      return NextResponse.json({ error: err.errors[0]?.message || "Validasi gagal" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
