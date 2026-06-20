import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const memberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  allergyNote: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
  internalNote: z.string().optional().or(z.literal("")),
});

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = memberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "會員資料格式不正確" }, { status: 400 });
  }

  const member = await prisma.member.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: normalizePhone(parsed.data.phone),
      email: parsed.data.email || null,
      birthday: parsed.data.birthday ? new Date(`${parsed.data.birthday}T00:00:00+08:00`) : null,
      allergyNote: parsed.data.allergyNote || null,
      note: parsed.data.note || null,
      internalNote: parsed.data.internalNote || null,
    },
  });

  return NextResponse.json({ member });
}
