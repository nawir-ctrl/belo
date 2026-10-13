import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: "LOGOUT",
          entityType: "USER",
          entityId: currentUser.id,
        },
      });
    } catch {}
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
