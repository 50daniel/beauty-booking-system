import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

const COOKIE_NAME = "beauty_member_session";

function getSecret() {
  return process.env.SESSION_SECRET || "dev-session-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function verifySignature(value: string, signature: string) {
  const expected = sign(value);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function initialMemberPassword(phone: string) {
  const normalized = normalizePhone(phone);
  return normalized.slice(-4).padStart(4, "0");
}

export async function ensureMemberCredential(memberId: string, phone: string) {
  const existing = await prisma.memberCredential.findUnique({ where: { memberId } });
  if (existing) return existing;

  return prisma.memberCredential.create({
    data: {
      memberId,
      passwordHash: hashPassword(initialMemberPassword(phone)),
    },
  });
}

export async function createMemberSession(memberId: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const payload = `${memberId}.${expiresAt}`;
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

export async function clearMemberSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentMember() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [memberId, expiresAt, signature] = parts;
  const payload = `${memberId}.${expiresAt}`;
  if (!verifySignature(payload, signature)) return null;
  if (Number(expiresAt) < Date.now()) return null;

  return prisma.member.findUnique({
    where: { id: memberId },
  });
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return member;
}

export async function requireMemberPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/member/login");
  return member;
}

export async function verifyMemberLogin(phone: string, password: string) {
  const normalizedPhone = normalizePhone(phone);
  const member = await prisma.member.findUnique({
    where: { phone: normalizedPhone },
    include: { credential: true },
  });
  if (!member) return null;

  const credential = member.credential ?? (await ensureMemberCredential(member.id, member.phone));
  if (!verifyPassword(password, credential.passwordHash)) return null;

  return member;
}
