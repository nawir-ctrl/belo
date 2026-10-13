import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSetting } from "@/lib/settings";

export async function GET() {
  try {
    const now = new Date();
    // Catat detak interaksi halaman player
    await setSetting("LAST_PLAYER_SEEN", now.toISOString(), "PLAYER");

    // Ambil event yang berstatus TRIGGERED dan belum dimainkan
    const events = await prisma.bellExecution.findMany({
      where: {
        status: "TRIGGERED",
      },
      include: {
        audioAsset: {
          select: {
            id: true,
            name: true,
            storedFileName: true,
            mimeType: true,
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 10,
    });

    return NextResponse.json({
      events,
      serverTime: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
