import { NextResponse } from "next/server";
import { ensureDatabase } from "@/lib/db";
import { withApiAuth } from "@/lib/api-auth";

export const GET = withApiAuth(async () => {
  await ensureDatabase();
  return NextResponse.json({ ok: true });
});
