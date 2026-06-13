import { logout } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await logout();
  return NextResponse.json({ success: true });
}
