import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const walletSchema = z.object({
  amount: z.number().int(),
  note: z.string().optional().or(z.literal("")),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = walletSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.amount === 0) {
    return NextResponse.json({ error: "儲值金金額不正確。" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ error: "找不到會員。" }, { status: 404 });
  }

  const transaction = await prisma.walletTransaction.create({
    data: {
      memberId: id,
      type: parsed.data.amount > 0 ? "top_up" : "adjust",
      amount: parsed.data.amount,
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
