import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || "local";
    const rateLimitKey = `${clientIp}_${username}`;
    const rateLimit = checkLoginRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.remainingMs || 0) / 60000);
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan gagal. Silakan tunggu ${waitMinutes} menit sebelum mencoba lagi.`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      recordFailedLogin(rateLimitKey);
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedLogin(rateLimitKey);
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    resetLoginRateLimit(rateLimitKey);

    const sessionToken = await createSessionToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as "ADMIN" | "OPERATOR",
    });

    // Catat log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entityType: "USER",
        entityId: user.id,
        details: JSON.stringify({ ip: clientIp, username: user.username }),
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Kesalahan server: ${err.message}` },
      { status: 500 }
    );
  }
}
