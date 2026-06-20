import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { assertCanConfirmAppointment } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const pending = await tx.appointment.findUnique({
        where: { id },
        include: { member: true, service: true, staff: true },
      });

      if (!pending) throw new Error("找不到預約申請");
      if (pending.status !== "pending") throw new Error("只有待確認申請可以確認");

      await assertCanConfirmAppointment(tx, pending);

      const confirmed = await tx.appointment.update({
        where: { id },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
        },
        include: { member: true, service: true, staff: true },
      });

      await tx.notificationLog.create({
        data: {
          appointmentId: id,
          channel: "manual",
          status: "queued",
          message: "預約已確認，等待通知客戶。",
        },
      });

      return confirmed;
    });

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        status: appointment.status,
        memberName: appointment.member.name,
        staffName: appointment.staff.name,
        serviceName: appointment.service.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "確認預約失敗" },
      { status: 409 },
    );
  }
}
