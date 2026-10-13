import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ holidays });
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
    const { name, date, isRecurringYearly } = await req.json();

    if (!name || !date) {
      return NextResponse.json({ error: "Nama dan tanggal libur wajib diisi." }, { status: 400 });
    }

    const existing = await prisma.holiday.findUnique({ where: { date } });
    if (existing) {
      return NextResponse.json({ error: "Tanggal ini sudah terdaftar sebagai hari libur." }, { status: 400 });
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: name.trim(),
        date,
        isRecurringYearly: Boolean(isRecurringYearly),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "SETTING",
        entityId: holiday.id,
        details: JSON.stringify({ holidayName: holiday.name, date: holiday.date }),
      },
    });

    return NextResponse.json({ success: true, holiday }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
