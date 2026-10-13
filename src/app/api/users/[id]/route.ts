import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const { id } = params;
  try {
    const { fullName, role, isActive, password } = await req.json();

    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (role !== undefined) dataToUpdate.role = role === "ADMIN" ? "ADMIN" : "OPERATOR";
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (password && password.length >= 6) {
      dataToUpdate.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, username: true, fullName: true, role: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "USER",
        entityId: id,
        details: JSON.stringify(dataToUpdate),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const { id } = params;
  if (id === currentUser.id) {
    return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "DELETE",
        entityType: "USER",
        entityId: id,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
