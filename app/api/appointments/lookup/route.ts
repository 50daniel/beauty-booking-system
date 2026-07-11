import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/member-auth";
import { makeDateTime } from "@/lib/time";
import { prisma } from "@/lib/prisma";

const lookupSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinute: z.coerce.number().int().min(0).max(24 * 60),
});

export async function GET(request: NextRequest) {
  let member;
  try {
    member = await requireMember();
  } catch {
    return NextResponse.json({ error: "請先登入會員。" }, { status: 401 });
  }

  const parsed = lookupSchema.safeParse({
    serviceId: request.nextUrl.searchParams.get("serviceId"),
    staffId: request.nextUrl.searchParams.get("staffId"),
    date: request.nextUrl.searchParams.get("date"),
    startMinute: request.nextUrl.searchParams.get("startMinute"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "查詢資料不正確。" }, { status: 400 });
  }

  const input = parsed.data;
  const startAt = makeDateTime(input.date, input.startMinute);
  const createdAfter = new Date(Date.now() - 10 * 60 * 1000);

  const appointment = await prisma.appointment.findFirst({
    where: {
      memberId: member.id,
      serviceId: input.serviceId,
      staffId: input.staffId,
      startAt,
      createdAt: { gte: createdAfter },
      status: { in: ["pending", "confirmed"] },
    },
    include: {
      service: true,
      staff: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    appointment: appointment
      ? {
          id: appointment.id,
          status: appointment.status,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
        }
      : null,
  });
}
