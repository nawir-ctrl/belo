import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { restoreFromBackup } from "@/lib/backup";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Administrator yang dapat memulihkan data backup." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File backup zip wajib diunggah." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await restoreFromBackup(buffer);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "RESTORE",
          entityType: "SYSTEM",
          details: JSON.stringify({ fileName: file.name }),
        },
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Data berhasil dipulihkan secara penuh." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
