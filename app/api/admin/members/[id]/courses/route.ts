import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const courseSchema = z.object({
  serviceId: z.string().min(1),
  sessions: z.number().int().min(1),
  expiresAt: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = courseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "療程堂數資料不正確。" }, { status: 400 });
  }

  const [member, service] = await Promise.all([
    prisma.member.findUnique({ where: { id } }),
    prisma.service.findUnique({ where: { id: parsed.data.serviceId } }),
  ]);
  if (!member) return NextResponse.json({ error: "找不到會員。" }, { status: 404 });
  if (!service) return NextResponse.json({ error: "找不到療程。" }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.memberCourseBalance.upsert({
      where: {
        memberId_serviceId: {
          memberId: id,
          serviceId: parsed.data.serviceId,
        },
      },
      update: {
        totalSessions: { increment: parsed.data.sessions },
        expiresAt: parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T00:00:00+08:00`) : undefined,
        note: parsed.data.note || undefined,
      },
      create: {
        memberId: id,
        serviceId: parsed.data.serviceId,
        totalSessions: parsed.data.sessions,
        expiresAt: parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T00:00:00+08:00`) : null,
        note: parsed.data.note || null,
      },
    });

    await tx.memberCourseTransaction.create({
      data: {
        memberId: id,
        serviceId: parsed.data.serviceId,
        courseBalanceId: balance.id,
        type: "purchase",
        sessions: parsed.data.sessions,
        note: parsed.data.note || "後台新增購買堂數",
      },
    });

    await tx.purchaseRecord.create({
      data: {
        memberId: id,
        itemName: `${service.name} x ${parsed.data.sessions} 堂`,
        amount: service.price * parsed.data.sessions,
        note: parsed.data.note || null,
      },
    });

    return balance;
  });

  return NextResponse.json({ courseBalance: result }, { status: 201 });
}
