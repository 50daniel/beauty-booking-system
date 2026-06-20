import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/booking";
import { addMinutes, makeDateTime } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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
    name: z.string().trim().min(1, "Name is required."),
    phone: z.string().trim().min(6, "Phone is required."),
    email: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.string().email("Invalid email.").optional()),
    birthday: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid birthday.").optional()),
    allergyNote: optionalText,
    note: optionalText,
  }),
  customerNote: optionalText,
});

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function isSlotConflict(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "BOOKING_SLOT_CONFLICT" || error.message.includes("Appointment_no_staff_overlap"))
  );
}

export async function POST(request: NextRequest) {
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

  const phone = normalizePhone(input.member.phone);
  const startAt = makeDateTime(input.date, input.startMinute);
  const endAt = addMinutes(startAt, service.durationMinutes);

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.appointment.findFirst({
        where: {
          staffId: staff.id,
          status: { in: ["pending", "confirmed", "completed"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });

      if (overlapping) {
        throw new Error("BOOKING_SLOT_CONFLICT");
      }

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
          message: "Booking request created. Please confirm manually.",
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
  } catch (error) {
    if (isSlotConflict(error)) {
      return NextResponse.json({ error: "Selected time slot is no longer available." }, { status: 409 });
    }

    throw error;
  }
}
