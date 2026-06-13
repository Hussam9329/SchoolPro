import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth";

export const GET = withApiAuth(async () => {
  return NextResponse.json({ message: "Use /api/payments instead" });
});
