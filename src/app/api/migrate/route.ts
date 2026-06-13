import { NextResponse } from "next/server";
import { checkDatabaseConnection, ensureDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

async function migrate() {
  await ensureDatabase();
  return checkDatabaseConnection();
}

export async function GET() {
  const result = await migrate();
  return NextResponse.json({ ok: result.ok, message: result.message }, { status: result.ok ? 200 : 500 });
}

export async function POST() {
  const result = await migrate();
  return NextResponse.json({ ok: result.ok, message: result.message }, { status: result.ok ? 200 : 500 });
}
