import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deleteAudioFile } from "@/lib/audio-storage";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Nama audio tidak boleh kosong." }, { status: 400 });
    }

    const updated = await prisma.audioAsset.update({
      where: { id: params.id },
      data: { name: name.trim() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "AUDIO",
        entityId: params.id,
        details: JSON.stringify({ newName: updated.name }),
      },
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  try {
    const result = await deleteAudioFile(params.id, force);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          inUseSchedules: result.inUseSchedules,
        },
        { status: 400 }
      );
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "AUDIO",
        entityId: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
