import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const purchaseSchema = z.object({
  itemName: z.string().min(1),
  amount: z.number().int().min(0),
  purchasedAt: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = purchaseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "購買紀錄格式不正確" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ error: "找不到會員" }, { status: 404 });
  }

  const purchase = await prisma.purchaseRecord.create({
    data: {
      memberId: id,
      itemName: parsed.data.itemName,
      amount: parsed.data.amount,
      purchasedAt: parsed.data.purchasedAt ? new Date(`${parsed.data.purchasedAt}T00:00:00+08:00`) : new Date(),
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({ purchase }, { status: 201 });
}
