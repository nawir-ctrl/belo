import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAllSettings, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Administrator yang dapat mengubah pengaturan." }, { status: 403 });
  }

  try {
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        await setSetting(key, value);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "SETTING",
        details: JSON.stringify(body),
      },
    });

    const updatedSettings = await getAllSettings();
    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
