import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  verifyPassword,
  hashPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fullName, username, currentPassword, newPassword, confirmPassword } = body;

    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const dataToUpdate: any = {};
    const auditDetails: any = {};

    // 1. Validasi & Ubah Nama Lengkap
    if (fullName !== undefined) {
      const trimmedName = String(fullName).trim();
      if (trimmedName.length < 2) {
        return NextResponse.json(
          { error: "Nama lengkap minimal 2 karakter." },
          { status: 400 }
        );
      }
      dataToUpdate.fullName = trimmedName;
      auditDetails.fullName = trimmedName;
    }

    // 2. Validasi & Ubah Username
    if (username !== undefined && username.trim().toLowerCase() !== dbUser.username.toLowerCase()) {
      const trimmedUsername = String(username).trim().toLowerCase();
      if (trimmedUsername.length < 3) {
        return NextResponse.json(
          { error: "Username minimal 3 karakter." },
          { status: 400 }
        );
      }

      // Cek apakah username sudah dipakai akun lain
      const existing = await prisma.user.findFirst({
        where: {
          username: trimmedUsername,
          NOT: { id: currentUser.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Username tersebut sudah digunakan oleh akun lain." },
          { status: 400 }
        );
      }

      dataToUpdate.username = trimmedUsername;
      auditDetails.username = trimmedUsername;
    }

    // 3. Validasi & Ubah Password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Password saat ini wajib diisi untuk mengubah password." },
          { status: 400 }
        );
      }

      const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Password saat ini tidak sesuai." },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password baru minimal 6 karakter." },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: "Konfirmasi password baru tidak cocok." },
          { status: 400 }
        );
      }

      dataToUpdate.passwordHash = await hashPassword(newPassword);
      auditDetails.passwordChanged = true;
    }

    // Jika tidak ada data yang diubah
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data perubahan yang dikirim." },
        { status: 400 }
      );
    }

    // Simpan ke database
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Catat log audit
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "USER",
        entityId: currentUser.id,
        details: JSON.stringify(auditDetails),
      },
    });

    // Perbarui session cookie dengan username / fullName baru
    const newSessionToken = await createSessionToken({
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      role: updatedUser.role as "ADMIN" | "OPERATOR",
    });

    const response = NextResponse.json({
      success: true,
      message: "Profil dan akun berhasil diperbarui.",
      user: updatedUser,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
