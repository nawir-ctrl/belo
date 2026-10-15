import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    // Catat detak interaksi halaman player
    await setSetting("LAST_PLAYER_SEEN", now.toISOString(), "PLAYER");

    // Ambil event yang berstatus TRIGGERED dan belum dimainkan
    const rawEvents = await prisma.bellExecution.findMany({
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

    // Validasi usia event terhadap batas toleransi catch-up (default 5 menit)
    const catchupMinutes = parseInt(await getSetting("CATCHUP_MAX_MINUTES", "5"), 10);
    const events: typeof rawEvents = [];

    for (const ev of rawEvents) {
      if (!ev.isManual && ev.scheduledFor) {
        const ageMs = now.getTime() - new Date(ev.scheduledFor).getTime();
        const ageMinutes = ageMs / (1000 * 60);

        if (ageMinutes > catchupMinutes) {
          // Event kadaluarsa karena player tertidur/mati lebih lama dari toleransi
          await prisma.bellExecution.update({
            where: { id: ev.id },
            data: {
              status: "SKIPPED",
              errorMessage: `Dilewati oleh player karena jadwal sudah terlewat ${Math.round(ageMinutes)} menit (batas toleransi: ${catchupMinutes} menit).`,
            },
          });
          continue;
        }
      }
      events.push(ev);
    }

    // Kumpulkan semua asset ID yang dibutuhkan untuk urutan suara
    const allAssetIds = new Set<string>();
    for (const ev of events) {
      if (ev.audioAssetId) allAssetIds.add(ev.audioAssetId);
      if (ev.audioAssetIds) {
        try {
          const ids = JSON.parse(ev.audioAssetIds);
          if (Array.isArray(ids)) ids.forEach((id) => allAssetIds.add(id));
        } catch {}
      }
    }

    const assetsMap = new Map();
    if (allAssetIds.size > 0) {
      const fetched = await prisma.audioAsset.findMany({
        where: { id: { in: Array.from(allAssetIds) } },
        select: {
          id: true,
          name: true,
          storedFileName: true,
          mimeType: true,
        },
      });
      fetched.forEach((a) => assetsMap.set(a.id, a));
    }

    const enrichedEvents = events.map((ev) => {
      let sequenceIds: string[] = [];
      if (ev.audioAssetIds) {
        try {
          const parsed = JSON.parse(ev.audioAssetIds);
          if (Array.isArray(parsed)) sequenceIds = parsed;
        } catch {}
      }
      if (sequenceIds.length === 0 && ev.audioAssetId) {
        sequenceIds = [ev.audioAssetId];
      }

      const audioAssets = sequenceIds.map((id) => assetsMap.get(id)).filter(Boolean);

      return {
        ...ev,
        audioAssets: audioAssets.length > 0 ? audioAssets : (ev.audioAsset ? [ev.audioAsset] : []),
      };
    });

    return NextResponse.json({
      events: enrichedEvents,
      serverTime: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
