import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/time";
import { requireMemberPage } from "@/lib/member-auth";
import { BookingFlow } from "./booking-flow";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const member = await requireMemberPage();
  const [services, courseBalances, wallet] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        price: true,
        durationMinutes: true,
        bufferMinutes: true,
        color: true,
      },
    }),
    prisma.memberCourseBalance.findMany({
      where: { memberId: member.id },
      include: { service: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.walletTransaction.aggregate({
      where: { memberId: member.id },
      _sum: { amount: true },
    }),
  ]);

  return (
    <BookingFlow
      courseBalances={courseBalances.map((balance) => ({
        id: balance.id,
        serviceId: balance.serviceId,
        serviceName: balance.service.name,
        availableSessions: balance.totalSessions - balance.usedSessions - balance.reservedSessions,
        expiresAt: balance.expiresAt,
      }))}
      initialMember={{ id: member.id, name: member.name, phone: member.phone }}
      initialServices={services}
      today={dateOnly(new Date())}
      walletBalance={wallet._sum.amount ?? 0}
    />
  );
}
