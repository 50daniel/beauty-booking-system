import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const rejectSchema = z.object({
  reason: z.string().min(1).max(200),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = rejectSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "請輸入拒絕原因" }, { status: 400 });
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "找不到預約申請" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "只有待確認申請可以拒絕" }, { status: 409 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: "rejected",
      rejectedAt: new Date(),
      rejectionReason: parsed.data.reason,
    },
  });

  await prisma.notificationLog.create({
    data: {
      appointmentId: id,
      channel: "manual",
      status: "queued",
      message: `預約已拒絕：${parsed.data.reason}`,
    },
  });

  return NextResponse.json({ appointment: { id: appointment.id, status: appointment.status } });
}
