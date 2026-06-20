import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const validStatuses = new Set<AppointmentStatus>([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
  "no_show",
]);

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const status = request.nextUrl.searchParams.get("status");
  const date = request.nextUrl.searchParams.get("date");

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(status && validStatuses.has(status as AppointmentStatus) ? { status: status as AppointmentStatus } : {}),
      ...(date
        ? {
            startAt: {
              gte: new Date(`${date}T00:00:00+08:00`),
              lte: new Date(`${date}T23:59:59+08:00`),
            },
          }
        : {}),
    },
    include: {
      member: true,
      service: true,
      staff: true,
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      customerNote: appointment.customerNote,
      internalNote: appointment.internalNote,
      rejectionReason: appointment.rejectionReason,
      createdAt: appointment.createdAt,
      member: {
        id: appointment.member.id,
        name: appointment.member.name,
        phone: appointment.member.phone,
        email: appointment.member.email,
        allergyNote: appointment.member.allergyNote,
        note: appointment.member.note,
      },
      staff: {
        id: appointment.staff.id,
        name: appointment.staff.name,
        color: appointment.staff.color,
      },
      service: {
        id: appointment.service.id,
        name: appointment.service.name,
        category: appointment.service.category,
        color: appointment.service.color,
        price: appointment.service.price,
        durationMinutes: appointment.service.durationMinutes,
      },
    })),
  });
}
