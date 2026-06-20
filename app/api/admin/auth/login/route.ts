import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "請輸入正確的 Email 與密碼" }, { status: 400 });
  }

  const user = await prisma.adminUser.findFirst({
    where: {
      email: parsed.data.email,
      active: true,
    },
    include: { staff: true },
  });

  if (!user || user.passwordHash !== hashPassword(parsed.data.password)) {
    return NextResponse.json({ error: "帳號或密碼不正確" }, { status: 401 });
  }

  await createAdminSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      staffName: user.staff?.name ?? null,
    },
  });
}
