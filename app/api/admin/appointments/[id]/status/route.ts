import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const statusSchema = z.object({
  status: z.enum(["completed", "cancelled", "no_show"]),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = statusSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "狀態不正確" }, { status: 400 });
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "找不到預約" }, { status: 404 });
  }
  if (existing.status !== "confirmed") {
    return NextResponse.json({ error: "只有已確認預約可更新為完成、取消或未到" }, { status: 409 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: parsed.data.status as AppointmentStatus },
  });

  return NextResponse.json({ appointment: { id: appointment.id, status: appointment.status } });
}
