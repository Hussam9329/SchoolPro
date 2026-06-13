/**
 * API Authentication Middleware
 *
 * Provides `withApiAuth` — a wrapper that verifies the admin session
 * for API routes before allowing the handler to execute.
 *
 * Usage:
 *   export const GET = withApiAuth(async (req, ctx, session) => { ... });
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export type ApiSession = {
  adminId: string;
  jti?: string;
};

type HandlerFn = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  session: ApiSession,
) => Promise<NextResponse> | Promise<Response>;

type HandlerWithoutCtx = (
  req: NextRequest,
  session: ApiSession,
) => Promise<NextResponse> | Promise<Response>;

/**
 * Wrap an API route handler with authentication.
 *
 * - Verifies the JWT session cookie.
 * - Checks session revocation status (via admin_sessions table).
 * - Returns 401 JSON if unauthorized.
 * - Passes the decoded session to the handler as the last argument.
 */
export function withApiAuth(handler: HandlerFn | HandlerWithoutCtx) {
  return async (
    req: NextRequest,
    ctx?: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const session = await verifySession();

      if (!session?.adminId) {
        return NextResponse.json(
          { ok: false, message: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى." },
          { status: 401 },
        );
      }

      // Check if session has been revoked
      if (session.jti) {
        const isRevoked = await isSessionRevoked(session.jti);
        if (isRevoked) {
          return NextResponse.json(
            { ok: false, message: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى." },
            { status: 401 },
          );
        }
      }

      const apiSession: ApiSession = {
        adminId: session.adminId,
        jti: session.jti,
      };

      // Call handler with or without ctx depending on signature
      if (ctx) {
        return (handler as HandlerFn)(req, ctx, apiSession);
      }
      return (handler as HandlerWithoutCtx)(req, apiSession);
    } catch (error) {
      console.error("[withApiAuth] Error:", error);
      return NextResponse.json(
        { ok: false, message: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى." },
        { status: 401 },
      );
    }
  };
}

/**
 * Check if a session has been revoked in the admin_sessions table.
 */
async function isSessionRevoked(jti: string): Promise<boolean> {
  try {
    const { db, ensureDatabase } = await import("@/lib/db");
    await ensureDatabase();
    const data = await db.adminSession.findUnique({
      where: { jti },
      select: { revokedAt: true },
    });

    if (!data) {
      return false;
    }

    return data.revokedAt !== null;
  } catch {
    return false;
  }
}
