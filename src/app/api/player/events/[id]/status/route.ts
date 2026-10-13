import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status, errorMessage } = await req.json();

    if (!["PLAYING", "PLAYED", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    }

    const now = new Date();
    const updateData: any = {
      status,
      updatedAt: now,
    };

    if (status === "PLAYING") {
      updateData.startedAt = now;
    } else if (status === "PLAYED") {
      updateData.finishedAt = now;
    } else if (status === "FAILED") {
      updateData.errorMessage = errorMessage || "Gagal memutar audio di browser player.";
    }

    const updated = await prisma.bellExecution.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, execution: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
