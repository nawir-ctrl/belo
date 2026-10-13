import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createFullBackup } from "@/lib/backup";
import fs from "fs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Administrator yang dapat mengunduh backup." }, { status: 403 });
  }

  try {
    const backup = await createFullBackup();
    if (!backup.success || !backup.filePath) {
      return NextResponse.json({ error: backup.error || "Gagal membuat backup." }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(backup.filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${backup.fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
