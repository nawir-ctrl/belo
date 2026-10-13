import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveAudioFile, isAudioInUse } from "@/lib/audio-storage";

export async function GET() {
  try {
    const assets = await prisma.audioAsset.findMany({
      orderBy: { createdAt: "desc" },
    });

    const assetsWithUsage = await Promise.all(
      assets.map(async (asset) => {
        const usage = await isAudioInUse(asset.id);
        return {
          ...asset,
          inUse: usage.inUse,
          schedules: usage.schedules,
        };
      })
    );

    return NextResponse.json({ assets: assetsWithUsage });
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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const displayName = (formData.get("displayName") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "File audio tidak ditemukan." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await saveAudioFile(
      displayName || file.name,
      file.name,
      file.type,
      buffer
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "AUDIO",
        entityId: result.asset.id,
        details: JSON.stringify({ name: result.asset.name, originalFileName: result.asset.originalFileName }),
      },
    });

    return NextResponse.json({ success: true, asset: result.asset }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
