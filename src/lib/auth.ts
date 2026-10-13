import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "smartbell_default_secret_key_change_me_local_only";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const SESSION_COOKIE_NAME = "smartbell_session";

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "OPERATOR";
}

// In-memory rate limiting untuk percobaan login gagal
interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  blockedUntil: number;
}
const loginRateLimits = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 menit

export function checkLoginRateLimit(identifier: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const entry = loginRateLimits.get(identifier);

  if (!entry) return { allowed: true };

  if (entry.blockedUntil > now) {
    return { allowed: false, remainingMs: entry.blockedUntil - now };
  }

  // Jika masa blokir sudah lewat lebih dari 15 menit, reset
  if (now - entry.lastAttempt > 15 * 60 * 1000) {
    loginRateLimits.delete(identifier);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(identifier: string) {
  const now = Date.now();
  const entry = loginRateLimits.get(identifier) || { attempts: 0, lastAttempt: now, blockedUntil: 0 };
  entry.attempts += 1;
  entry.lastAttempt = now;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
  }

  loginRateLimits.set(identifier, entry);
}

export function resetLoginRateLimit(identifier: string) {
  loginRateLimits.delete(identifier);
}

/**
 * Hashing password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verifikasi password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Membuat JWT session token
 */
export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Memverifikasi JWT session token
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      username: payload.username as string,
      fullName: payload.fullName as string,
      role: payload.role as "ADMIN" | "OPERATOR",
    };
  } catch {
    return null;
  }
}

/**
 * Mengambil session saat ini dari Next.js cookies
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await verifySessionToken(token);
    if (!session) return null;

    // Verifikasi user masih aktif di database
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, username: true, fullName: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as "ADMIN" | "OPERATOR",
    };
  } catch {
    return null;
  }
}
