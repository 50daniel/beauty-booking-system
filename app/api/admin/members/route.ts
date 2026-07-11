import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { initialMemberPassword, normalizePhone } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

const memberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  allergyNote: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
  internalNote: z.string().optional().or(z.literal("")),
});

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
      courseBalances: {
        include: { service: true },
        orderBy: { updatedAt: "desc" },
      },
      walletTransactions: {
        orderBy: { createdAt: "desc" },
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
      courseBalances: member.courseBalances.map((balance) => ({
        id: balance.id,
        serviceId: balance.serviceId,
        serviceName: balance.service.name,
        totalSessions: balance.totalSessions,
        usedSessions: balance.usedSessions,
        reservedSessions: balance.reservedSessions,
        availableSessions: balance.totalSessions - balance.usedSessions - balance.reservedSessions,
        expiresAt: balance.expiresAt,
        note: balance.note,
      })),
      walletBalance: member.walletTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      walletTransactions: member.walletTransactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        note: transaction.note,
        createdAt: transaction.createdAt,
      })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const parsed = memberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "會員資料不正確。" }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  const existing = await prisma.member.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: "這個手機號碼已經有會員。" }, { status: 409 });
  }

  const member = await prisma.member.create({
    data: {
      name: parsed.data.name,
      phone,
      email: parsed.data.email || null,
      birthday: parsed.data.birthday ? new Date(`${parsed.data.birthday}T00:00:00+08:00`) : null,
      allergyNote: parsed.data.allergyNote || null,
      note: parsed.data.note || null,
      internalNote: parsed.data.internalNote || null,
      credential: {
        create: {
          passwordHash: hashPassword(initialMemberPassword(phone)),
        },
      },
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
