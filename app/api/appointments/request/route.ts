import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { activeAppointmentStatuses, getAvailableSlots } from "@/lib/booking";
import { addMinutes, makeDateTime } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { requireMember } from "@/lib/member-auth";
import { reserveAppointmentPayment } from "@/lib/member-billing";

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
  paymentMethod: z.enum(["course", "wallet"]),
  customerNote: optionalText,
});

function isSlotConflict(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "BOOKING_SLOT_CONFLICT" || error.message.includes("Appointment_no_staff_overlap"))
  );
}

export async function POST(request: NextRequest) {
  let member;
  try {
    member = await requireMember();
  } catch {
    return NextResponse.json({ error: "請先登入會員再預約。" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(`appointment-request:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many booking requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const json = await request.json();
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking request.", details: parsed.error.flatten() }, { status: 400 });
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
    return NextResponse.json({ error: "Selected service or staff is unavailable." }, { status: 404 });
  }

  const availableSlots = await getAvailableSlots({
    serviceId: input.serviceId,
    staffId: input.staffId,
    date: input.date,
  });
  const selectedSlot = availableSlots.find((slot) => slot.startMinute === input.startMinute);
  if (!selectedSlot) {
    return NextResponse.json({ error: "Selected time slot is no longer available." }, { status: 409 });
  }

  const startAt = makeDateTime(input.date, input.startMinute);
  const endAt = addMinutes(startAt, service.durationMinutes);

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.appointment.findFirst({
        where: {
          staffId: staff.id,
          status: { in: activeAppointmentStatuses },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });

      if (overlapping) {
        throw new Error("BOOKING_SLOT_CONFLICT");
      }

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

      await reserveAppointmentPayment(tx, {
        appointmentId: created.id,
        memberId: member.id,
        serviceId: service.id,
        method: input.paymentMethod,
        price: service.price,
      });

      await tx.notificationLog.create({
        data: {
          appointmentId: created.id,
          channel: "manual",
          status: "queued",
          message: "Booking request created. Please confirm manually.",
        },
      });

      return created;
    }, { timeout: 10000 });

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
  } catch (error) {
    if (isSlotConflict(error)) {
      return NextResponse.json({ error: "Selected time slot is no longer available." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "COURSE_BALANCE_NOT_ENOUGH") {
      return NextResponse.json({ error: "這個療程沒有可使用的剩餘堂數。" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "WALLET_BALANCE_NOT_ENOUGH") {
      return NextResponse.json({ error: "儲值金不足，無法預約這個療程。" }, { status: 409 });
    }

    throw error;
  }
}
