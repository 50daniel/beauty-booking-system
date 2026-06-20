import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/auth";

export async function requireApiUser() {
  const user = await getCurrentAdminUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "尚未登入" }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireApiManager() {
  const result = await requireApiUser();
  if (result.response) return result;
  if (result.user.role !== "admin") {
    return { user: result.user, response: NextResponse.json({ error: "需要管理員權限" }, { status: 403 }) };
  }
  return result;
}
