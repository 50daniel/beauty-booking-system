import type { AppointmentPaymentMethod, Prisma } from "@prisma/client";

export async function getWalletBalance(
  tx: Prisma.TransactionClient,
  memberId: string,
) {
  const result = await tx.walletTransaction.aggregate({
    where: { memberId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function reserveAppointmentPayment(
  tx: Prisma.TransactionClient,
  input: {
    appointmentId: string;
    memberId: string;
    serviceId: string;
    method: AppointmentPaymentMethod;
    price: number;
  },
) {
  if (input.method === "course") {
    const balance = await tx.memberCourseBalance.findUnique({
      where: {
        memberId_serviceId: {
          memberId: input.memberId,
          serviceId: input.serviceId,
        },
      },
    });

    if (!balance || balance.totalSessions - balance.usedSessions - balance.reservedSessions < 1) {
      throw new Error("COURSE_BALANCE_NOT_ENOUGH");
    }

    const updated = await tx.memberCourseBalance.update({
      where: { id: balance.id },
      data: { reservedSessions: { increment: 1 } },
    });

    await tx.memberCourseTransaction.create({
      data: {
        memberId: input.memberId,
        serviceId: input.serviceId,
        courseBalanceId: updated.id,
        appointmentId: input.appointmentId,
        type: "reserve",
        sessions: -1,
        note: "預約保留 1 堂",
      },
    });

    await tx.appointmentPayment.create({
      data: {
        appointmentId: input.appointmentId,
        method: "course",
        status: "reserved",
        courseBalanceId: updated.id,
        reservedSessions: 1,
        priceSnapshot: input.price,
      },
    });
    return;
  }

  const walletBalance = await getWalletBalance(tx, input.memberId);
  if (walletBalance < input.price) {
    throw new Error("WALLET_BALANCE_NOT_ENOUGH");
  }

  await tx.walletTransaction.create({
    data: {
      memberId: input.memberId,
      appointmentId: input.appointmentId,
      type: "reserve",
      amount: -input.price,
      note: "預約保留儲值金",
    },
  });

  await tx.appointmentPayment.create({
    data: {
      appointmentId: input.appointmentId,
      method: "wallet",
      status: "reserved",
      reservedAmount: input.price,
      priceSnapshot: input.price,
    },
  });
}

export async function chargeAppointmentPayment(
  tx: Prisma.TransactionClient,
  appointmentId: string,
) {
  const payment = await tx.appointmentPayment.findUnique({
    where: { appointmentId },
    include: { appointment: true },
  });

  if (!payment || payment.status === "charged") return;
  if (payment.status !== "reserved") {
    throw new Error("PAYMENT_NOT_RESERVED");
  }

  if (payment.method === "course") {
    if (!payment.courseBalanceId) throw new Error("COURSE_PAYMENT_MISSING_BALANCE");

    await tx.memberCourseBalance.update({
      where: { id: payment.courseBalanceId },
      data: {
        reservedSessions: { decrement: payment.reservedSessions },
        usedSessions: { increment: payment.reservedSessions },
      },
    });
    await tx.memberCourseTransaction.create({
      data: {
        memberId: payment.appointment.memberId,
        serviceId: payment.appointment.serviceId,
        courseBalanceId: payment.courseBalanceId,
        appointmentId,
        type: "consume",
        sessions: -payment.reservedSessions,
        note: "預約完成扣除堂數",
      },
    });
    await tx.appointmentPayment.update({
      where: { appointmentId },
      data: {
        status: "charged",
        chargedSessions: payment.reservedSessions,
      },
    });
    return;
  }

  await tx.walletTransaction.create({
    data: {
      memberId: payment.appointment.memberId,
      appointmentId,
      type: "consume",
      amount: 0,
      note: "預約完成，儲值金保留款轉為正式扣款",
    },
  });
  await tx.appointmentPayment.update({
    where: { appointmentId },
    data: {
      status: "charged",
      chargedAmount: payment.reservedAmount,
    },
  });
}

export async function releaseAppointmentPayment(
  tx: Prisma.TransactionClient,
  appointmentId: string,
  reason: "cancelled" | "no_show" | "reversed",
) {
  const payment = await tx.appointmentPayment.findUnique({
    where: { appointmentId },
    include: { appointment: true },
  });

  if (!payment || payment.status === "released" || payment.status === "reversed") return;

  if (payment.method === "course") {
    if (!payment.courseBalanceId) throw new Error("COURSE_PAYMENT_MISSING_BALANCE");

    if (payment.status === "reserved") {
      await tx.memberCourseBalance.update({
        where: { id: payment.courseBalanceId },
        data: { reservedSessions: { decrement: payment.reservedSessions } },
      });
      await tx.memberCourseTransaction.create({
        data: {
          memberId: payment.appointment.memberId,
          serviceId: payment.appointment.serviceId,
          courseBalanceId: payment.courseBalanceId,
          appointmentId,
          type: "release",
          sessions: payment.reservedSessions,
          note: reason === "no_show" ? "未到，退回保留堂數" : "取消，退回保留堂數",
        },
      });
      await tx.appointmentPayment.update({
        where: { appointmentId },
        data: { status: "released" },
      });
      return;
    }

    await tx.memberCourseBalance.update({
      where: { id: payment.courseBalanceId },
      data: { usedSessions: { decrement: payment.chargedSessions || payment.reservedSessions } },
    });
    await tx.memberCourseTransaction.create({
      data: {
        memberId: payment.appointment.memberId,
        serviceId: payment.appointment.serviceId,
        courseBalanceId: payment.courseBalanceId,
        appointmentId,
        type: "reverse",
        sessions: payment.chargedSessions || payment.reservedSessions,
        note: "已完成預約改回取消/未到，補回堂數",
      },
    });
    await tx.appointmentPayment.update({
      where: { appointmentId },
      data: { status: "reversed" },
    });
    return;
  }

  if (payment.status === "reserved") {
    await tx.walletTransaction.create({
      data: {
        memberId: payment.appointment.memberId,
        appointmentId,
        type: "release",
        amount: payment.reservedAmount,
        note: reason === "no_show" ? "未到，退回保留儲值金" : "取消，退回保留儲值金",
      },
    });
    await tx.appointmentPayment.update({
      where: { appointmentId },
      data: { status: "released" },
    });
    return;
  }

  await tx.walletTransaction.create({
    data: {
      memberId: payment.appointment.memberId,
      appointmentId,
      type: "reverse",
      amount: payment.chargedAmount || payment.reservedAmount,
      note: "已完成預約改回取消/未到，退回儲值金",
    },
  });
  await tx.appointmentPayment.update({
    where: { appointmentId },
    data: { status: "reversed" },
  });
}
