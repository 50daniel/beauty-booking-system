import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/booking";
import { addMinutes, makeDateTime } from "@/lib/time";
import { prisma } from "@/lib/prisma";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const requestSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinute: z.number().int().min(0).max(24 * 60),
  member: z.object({
    name: z.string().trim().min(1, "請輸入姓名"),
    phone: z.string().trim().min(6, "請輸入手機"),
    email: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.string().email("Email 格式不正確").optional()),
    birthday: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "生日格式不正確").optional()),
    allergyNote: optionalText,
    note: optionalText,
  }),
  customerNote: optionalText,
});

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "預約資料不完整", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const [service, staff] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.serviceId, active: true } }),
    prisma.staff.findFirst({
      where: {
        id: input.staffId,
        active: true,
        services: { some: { serviceId: input.serviceId } },
      },
    }),
  ]);

  if (!service || !staff) {
    return NextResponse.json({ error: "服務或美容師不存在" }, { status: 404 });
  }

  const availableSlots = await getAvailableSlots({
    serviceId: input.serviceId,
    staffId: input.staffId,
    date: input.date,
  });
  const selectedSlot = availableSlots.find((slot) => slot.startMinute === input.startMinute);
  if (!selectedSlot) {
    return NextResponse.json({ error: "此時段目前不可申請，請重新選擇" }, { status: 409 });
  }

  const phone = normalizePhone(input.member.phone);
  const startAt = makeDateTime(input.date, input.startMinute);
  const endAt = addMinutes(startAt, service.durationMinutes);

  const appointment = await prisma.$transaction(async (tx) => {
    const member = await tx.member.upsert({
      where: { phone },
      update: {
        name: input.member.name.trim(),
        email: input.member.email || null,
        birthday: input.member.birthday ? new Date(`${input.member.birthday}T00:00:00+08:00`) : undefined,
        allergyNote: input.member.allergyNote || null,
        note: input.member.note || undefined,
      },
      create: {
        name: input.member.name.trim(),
        phone,
        email: input.member.email || null,
        birthday: input.member.birthday ? new Date(`${input.member.birthday}T00:00:00+08:00`) : null,
        allergyNote: input.member.allergyNote || null,
        note: input.member.note || null,
      },
    });

    const created = await tx.appointment.create({
      data: {
        memberId: member.id,
        staffId: staff.id,
        serviceId: service.id,
        startAt,
        endAt,
        status: "pending",
        customerNote: input.customerNote || null,
      },
      include: {
        member: true,
        staff: true,
        service: true,
      },
    });

    await tx.notificationLog.create({
      data: {
        appointmentId: created.id,
        channel: "manual",
        status: "queued",
        message: "預約申請已建立，等待美容師確認。",
      },
    });

    return created;
  });

  return NextResponse.json(
    {
      appointment: {
        id: appointment.id,
        status: appointment.status,
        memberName: appointment.member.name,
        staffName: appointment.staff.name,
        serviceName: appointment.service.name,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
      },
    },
    { status: 201 },
  );
}
