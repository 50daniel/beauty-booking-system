import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "beauty_admin_session";

function getSecret() {
  return process.env.SESSION_SECRET || "dev-session-secret-change-me";
}

export function hashPassword(password: string) {
  return createHash("sha256").update(`beauty-booking:${password}`).digest("hex");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function verifySignature(value: string, signature: string) {
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createAdminSession(userId: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12;
  const payload = `${userId}.${expiresAt}`;
  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAt, signature] = parts;
  const payload = `${userId}.${expiresAt}`;
  if (!verifySignature(payload, signature)) return null;
  if (Number(expiresAt) < Date.now()) return null;

  return prisma.adminUser.findFirst({
    where: { id: userId, active: true },
    include: { staff: true },
  });
}

export async function requireAdminUser() {
  const user = await getCurrentAdminUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}

export async function requireAdminPageUser() {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function requireManagerPageUser() {
  const user = await requireAdminPageUser();
  if (user.role !== "admin") redirect("/admin");
  return user;
}
