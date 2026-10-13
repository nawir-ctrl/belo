import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const schedule = await prisma.bellSchedule.findUnique({
      where: { id: params.id },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    const updated = await prisma.bellSchedule.update({
      where: { id: params.id },
      data: { isActive: !schedule.isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TOGGLE",
        entityType: "SCHEDULE",
        entityId: params.id,
        details: JSON.stringify({ name: updated.name, isActive: updated.isActive }),
      },
    });

    return NextResponse.json({ success: true, schedule: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
