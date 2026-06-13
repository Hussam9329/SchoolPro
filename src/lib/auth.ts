import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, ensureDatabase } from "@/lib/db";

/**
 * JWT secret — no fallback in production.
 * In development, a dev-only key is used for convenience.
 * In production, JWT_SECRET MUST be set in environment variables.
 * Lazy initialization: only checks at first use, not at module load time
 * (avoids build failures since next build runs in production mode).
 */
let _jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (_jwtSecret) return _jwtSecret;

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable is required in production. " +
        "Set a strong random string (32+ characters) in your Vercel environment variables."
      );
    }
    // Dev-only fallback — never used in production
    console.warn(
      "[auth] WARNING: JWT_SECRET not set. Using dev-only key. Set JWT_SECRET in .env for security."
    );
    _jwtSecret = new TextEncoder().encode("schoolpro-dev-only-secret-key-not-for-production");
    return _jwtSecret;
  }

  _jwtSecret = new TextEncoder().encode(secret);
  return _jwtSecret;
}

const SESSION_COOKIE_NAME = "schoolpro_session";
const DEFAULT_SESSION_SECONDS = 8 * 60 * 60;
const REMEMBER_ME_SESSION_SECONDS = 30 * 24 * 60 * 60;

export async function verifyAdmin(username: string, password: string) {
  try {
    // Ensure database is initialized (especially on Vercel)
    await ensureDatabase();

    const admin = await db.admin.findUnique({ where: { username } });
    if (!admin) return null;
    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) return null;
    return admin;
  } catch (error) {
    console.error("[verifyAdmin] Error:", error);
    return null;
  }
}

/**
 * Generate a unique session identifier (jti) for revocable sessions.
 */
function generateJti(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const extra = Math.random().toString(36).substring(2, 6);
  return `ses_${timestamp}_${random}${extra}`;
}

/**
 * Create a new session with jti for revocation support.
 * Stores the session in admin_sessions table for later revocation.
 */
export async function createSession(adminId: string, rememberMe = false) {
  const sessionSeconds = rememberMe ? REMEMBER_ME_SESSION_SECONDS : DEFAULT_SESSION_SECONDS;
  const jti = generateJti();

  const token = await new SignJWT({ adminId, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionSeconds}s`)
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: sessionSeconds,
    path: "/",
  });

  // Store session in admin_sessions table for revocation support.
  try {
    await ensureDatabase();
    await db.adminSession.create({
      data: {
        id: jti,
        adminId,
        jti,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + sessionSeconds * 1000),
        userAgent: null,
        ip: null,
      },
    });
  } catch (error) {
    // Non-blocking: login still works if the session audit insert fails.
    console.warn("[createSession] Could not store session in admin_sessions:", error);
  }
}

export type SessionPayload = {
  adminId: string;
  jti?: string;
};

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * In-memory revocation cache — avoids a PostgreSQL DB round-trip on every page load.
 * Key: jti, Value: true = revoked. TTL = 30 seconds (matches middleware JWT cache).
 */
const revocationCache = new Map<string, { revoked: boolean; expiresAt: number }>();
const REVOCATION_CACHE_TTL_MS = 30_000;

/**
 * Verify session and check if it's been revoked.
 * Uses an in-memory cache to avoid hitting PostgreSQL on every request.
 * Used by withApiAuth and any code that needs to ensure the session is still valid.
 */
export async function verifySession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session?.adminId) return null;

  // Check session revocation if jti is present
  if (session.jti) {
    const cached = revocationCache.get(session.jti);
    const now = Date.now();

    // Use cached result if still fresh
    if (cached && cached.expiresAt > now) {
      if (cached.revoked) return null;
      return session;
    }

    // Cache miss or expired — check PostgreSQL
    try {
      await ensureDatabase();
      const data = await db.adminSession.findUnique({
        where: { jti: session.jti },
        select: { revokedAt: true },
      });

      const isRevoked = Boolean(data && data.revokedAt !== null);

      // Update cache
      revocationCache.set(session.jti, {
        revoked: Boolean(isRevoked),
        expiresAt: now + REVOCATION_CACHE_TTL_MS,
      });

      // Periodically clean up old entries (every ~100 checks)
      if (revocationCache.size > 100) {
        for (const [key, val] of revocationCache) {
          if (val.expiresAt <= now) revocationCache.delete(key);
        }
      }

      if (isRevoked) return null;
    } catch {
      // admin_sessions table may not exist yet — don't block
    }
  }

  return session;
}

/**
 * Invalidate the revocation cache for a given jti (call after logout/revocation).
 */
export function invalidateRevocationCache(jti?: string) {
  if (jti) {
    revocationCache.delete(jti);
  }
}

export async function requireAdmin() {
  // Ensure database is initialized (especially on Vercel)
  await ensureDatabase();

  const session = await verifySession();
  if (!session?.adminId) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session;
}

/**
 * Logout: revoke the current session and clear the cookie.
 */
export async function logout() {
  const session = await getSession();

  // Revoke session in admin_sessions table
  if (session?.jti) {
    invalidateRevocationCache(session.jti);
    try {
      await ensureDatabase();
      await db.adminSession.updateMany({
        where: { jti: session.jti },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Session row may not exist yet.
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Revoke all sessions for a given admin (e.g., on password change).
 */
export async function revokeAllAdminSessions(adminId: string) {
  try {
    await ensureDatabase();
    await db.adminSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Session rows may not exist yet.
  }
}
