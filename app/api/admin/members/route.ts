import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const query = request.nextUrl.searchParams.get("q")?.trim();

  const members = await prisma.member.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      appointments: {
        include: {
          service: true,
          staff: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      purchases: {
        orderBy: { purchasedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      phone: member.phone,
      email: member.email,
      birthday: member.birthday,
      allergyNote: member.allergyNote,
      note: member.note,
      internalNote: member.internalNote,
      appointmentCount: member.appointments.length,
      latestAppointments: member.appointments.map((appointment) => ({
        id: appointment.id,
        status: appointment.status,
        startAt: appointment.startAt,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
      })),
      purchases: member.purchases.map((purchase) => ({
        id: purchase.id,
        itemName: purchase.itemName,
        amount: purchase.amount,
        purchasedAt: purchase.purchasedAt,
        note: purchase.note,
      })),
    })),
  });
}
