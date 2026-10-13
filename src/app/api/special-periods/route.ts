import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const periods = await prisma.specialPeriod.findMany({
      include: {
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json({ periods });
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
    const { name, startDate, endDate, priority, isActive } = await req.json();

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Nama, tanggal mulai, dan tanggal selesai wajib diisi." }, { status: 400 });
    }

    const period = await prisma.specialPeriod.create({
      data: {
        name: name.trim(),
        startDate,
        endDate,
        priority: priority !== undefined ? Number(priority) : 10,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "SETTING",
        entityId: period.id,
        details: JSON.stringify({ name: period.name, startDate, endDate }),
      },
    });

    return NextResponse.json({ success: true, period }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
