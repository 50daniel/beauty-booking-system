import { NextResponse } from "next/server";
import { clearMemberSession } from "@/lib/member-auth";

export async function POST() {
  await clearMemberSession();
  return NextResponse.json({ ok: true });
}
