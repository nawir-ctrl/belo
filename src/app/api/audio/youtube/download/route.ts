import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadYouTubeAudio, validateYouTubeUrl } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { url, displayName } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL YouTube diperlukan." }, { status: 400 });
    }

    const validation = validateYouTubeUrl(url);
    if (!validation.valid || !validation.cleanUrl) {
      return NextResponse.json(
        { error: "Format link YouTube tidak valid. Gunakan format seperti https://www.youtube.com/watch?v=... atau https://youtu.be/..." },
        { status: 400 }
      );
    }

    const result = await downloadYouTubeAudio(validation.cleanUrl, displayName);
    if (!result.success || !result.asset) {
      return NextResponse.json(
        { error: result.error || "Gagal mengunduh audio dari YouTube." },
        { status: 400 }
      );
    }

    // Catat riwayat audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "AUDIO",
        entityId: result.asset.id,
        details: JSON.stringify({
          name: result.asset.name,
          sourceType: "YOUTUBE",
          sourceUrl: result.asset.sourceUrl,
        }),
      },
    });

    return NextResponse.json({ success: true, asset: result.asset }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memproses unduhan audio YouTube." },
      { status: 500 }
    );
  }
}
