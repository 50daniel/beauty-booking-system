import { prisma } from "@/lib/prisma";

export async function getMemberBookingAccount(memberId: string) {
  const [courseBalances, wallet] = await Promise.all([
    prisma.memberCourseBalance.findMany({
      where: { memberId },
      include: { service: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.walletTransaction.aggregate({
      where: { memberId },
      _sum: { amount: true },
    }),
  ]);

  return {
    courseBalances: courseBalances.map((balance) => ({
      id: balance.id,
      serviceId: balance.serviceId,
      serviceName: balance.service.name,
      availableSessions: balance.totalSessions - balance.usedSessions - balance.reservedSessions,
      expiresAt: balance.expiresAt,
    })),
    walletBalance: wallet._sum.amount ?? 0,
  };
}
