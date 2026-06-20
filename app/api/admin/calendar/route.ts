import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const staffId = request.nextUrl.searchParams.get("staffId");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "confirmed",
      ...(staffId && staffId !== "all" ? { staffId } : {}),
      ...(start && end
        ? {
            startAt: { lt: new Date(end) },
            endAt: { gt: new Date(start) },
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
    events: appointments.map((appointment) => ({
      id: appointment.id,
      title: `${appointment.staff.name} / ${appointment.member.name} / ${appointment.service.name}`,
      start: appointment.startAt,
      end: appointment.endAt,
      resourceId: appointment.staffId,
      backgroundColor: appointment.service.color || appointment.staff.color,
      borderColor: appointment.staff.color,
      extendedProps: {
        status: appointment.status,
        memberName: appointment.member.name,
        memberPhone: appointment.member.phone,
        staffName: appointment.staff.name,
        serviceName: appointment.service.name,
        customerNote: appointment.customerNote,
      },
    })),
  });
}
