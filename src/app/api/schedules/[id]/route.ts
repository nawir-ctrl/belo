import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scheduleSchema } from "@/lib/validations/schedule";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const schedule = await prisma.bellSchedule.findUnique({
      where: { id: params.id },
      include: {
        audioAsset: true,
        specialPeriod: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = scheduleSchema.parse(body);

    const updated = await prisma.bellSchedule.update({
      where: { id: params.id },
      data: {
        name: parsed.name,
        time: parsed.time,
        daysOfWeek: JSON.stringify(parsed.daysOfWeek),
        bellType: parsed.bellType,
        audioAssetId: parsed.audioAssetId || null,
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
        action: "UPDATE",
        entityType: "SCHEDULE",
        entityId: params.id,
        details: JSON.stringify({ name: updated.name, time: updated.time }),
      },
    });

    return NextResponse.json({ success: true, schedule: updated });
  } catch (err: any) {
    if (err.errors) {
      return NextResponse.json({ error: err.errors[0]?.message || "Validasi gagal" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const existing = await prisma.bellSchedule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    await prisma.bellSchedule.delete({
      where: { id: params.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "SCHEDULE",
        entityId: params.id,
        details: JSON.stringify({ name: existing.name, time: existing.time }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
