import { NextResponse } from "next/server";
import { z } from "zod";
import { createMemberSession, verifyMemberLogin } from "@/lib/member-auth";

const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(4),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "請輸入手機號碼與密碼。" }, { status: 400 });
  }

  const member = await verifyMemberLogin(parsed.data.phone, parsed.data.password);
  if (!member) {
    return NextResponse.json({ error: "手機號碼或密碼不正確。" }, { status: 401 });
  }

  await createMemberSession(member.id);
  return NextResponse.json({
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
    },
  });
}
