import type { AppointmentStatus, Prisma, Service, Staff } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addMinutes, endOfLocalDay, getDayOfWeek, makeDateTime, startOfLocalDay } from "@/lib/time";

export async function getAvailableSlots(input: {
  serviceId: string;
  staffId: string;
  date: string;
}) {
  const [service, staff] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.serviceId, active: true } }),
    prisma.staff.findFirst({
      where: { id: input.staffId, active: true },
      include: { schedules: true, services: true },
    }),
  ]);

  if (!service || !staff) return [];

  const canDoService = staff.services.some((item) => item.serviceId === service.id);
  if (!canDoService) return [];

  const dayStart = startOfLocalDay(input.date);
  const dayEnd = endOfLocalDay(input.date);
  const [daySchedule, setting, confirmed, timeOff] = await Promise.all([
    prisma.staffDaySchedule.findUnique({
      where: {
        staffId_date: {
          staffId: staff.id,
          date: dayStart,
        },
      },
    }),
    prisma.businessSetting.findUnique({ where: { id: "default" } }),
    prisma.appointment.findMany({
      where: {
        staffId: staff.id,
        status: { in: activeAppointmentStatuses },
        startAt: { lte: dayEnd },
        endAt: { gte: dayStart },
      },
      include: { service: true },
    }),
    prisma.staffTimeOff.findMany({
      where: {
        staffId: staff.id,
        startAt: { lte: dayEnd },
        endAt: { gte: dayStart },
      },
    }),
  ]);

  if (daySchedule?.status === "time_off") return [];

  const dayOfWeek = getDayOfWeek(input.date);
  const schedules = daySchedule?.status === "working"
    ? [
        {
          startMinute: daySchedule.startMinute ?? 0,
          endMinute: daySchedule.endMinute ?? 0,
        },
      ]
    : staff.schedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek);
  if (!schedules.length) return [];

  if (setting?.closedDates.includes(input.date)) return [];

  const slots: Array<{ startMinute: number; endMinute: number; label: string }> = [];
  for (const schedule of schedules) {
    for (
      let startMinute = schedule.startMinute;
      startMinute + service.durationMinutes <= schedule.endMinute;
      startMinute += 30
    ) {
      const startAt = makeDateTime(input.date, startMinute);
      const endAt = addMinutes(startAt, service.durationMinutes);
      const blockingEnd = addMinutes(endAt, service.bufferMinutes);

      const hasAppointmentConflict = confirmed.some((appointment) => {
        const appointmentBlockEnd = addMinutes(appointment.endAt, appointment.service.bufferMinutes);
        return startAt < appointmentBlockEnd && appointment.startAt < blockingEnd;
      });
      const hasTimeOffConflict = timeOff.some((item) => startAt < item.endAt && item.startAt < endAt);

      if (!hasAppointmentConflict && !hasTimeOffConflict) {
        slots.push({
          startMinute,
          endMinute: startMinute + service.durationMinutes,
          label: `${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}`,
        });
      }
    }
  }

  return slots;
}

export async function assertCanConfirmAppointment(
  tx: Prisma.TransactionClient | typeof prisma,
  appointment: {
    id: string;
    staffId: string;
    serviceId: string;
    startAt: Date;
    endAt: Date;
  },
) {
  const [service, staff] = await Promise.all([
    tx.service.findUnique({ where: { id: appointment.serviceId } }),
    tx.staff.findUnique({
      where: { id: appointment.staffId },
      include: { schedules: true, timeOff: true, services: true },
    }),
  ]);

  if (!service || !staff?.active) throw new Error("服務或美容師不存在");
  if (!staff.services.some((item) => item.serviceId === service.id)) {
    throw new Error("美容師不可執行此服務");
  }

  const dateText = appointment.startAt.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
  const startMinute =
    Number(appointment.startAt.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "Asia/Taipei" })) *
      60 +
    Number(appointment.startAt.toLocaleString("en-US", { minute: "2-digit", timeZone: "Asia/Taipei" }));
  const dayOfWeek = getDayOfWeek(dateText);
  const matchingSchedule = staff.schedules.find((schedule) => {
    return (
      schedule.dayOfWeek === dayOfWeek &&
      startMinute >= schedule.startMinute &&
      startMinute + service.durationMinutes <= schedule.endMinute
    );
  });
  if (!matchingSchedule) throw new Error("不符合美容師排班");

  const setting = await tx.businessSetting.findUnique({ where: { id: "default" } });
  if (setting?.closedDates.includes(dateText)) throw new Error("店休日不可預約");

  const blockEnd = addMinutes(appointment.endAt, service.bufferMinutes);
  const conflicting = await tx.appointment.findFirst({
    where: {
      id: { not: appointment.id },
      staffId: appointment.staffId,
      status: "confirmed",
      startAt: { lt: blockEnd },
      endAt: { gt: appointment.startAt },
    },
  });
  if (conflicting) throw new Error("此時段已有正式預約");

  const timeOffConflict = staff.timeOff.some((item) => appointment.startAt < item.endAt && item.startAt < appointment.endAt);
  if (timeOffConflict) throw new Error("美容師休假時段不可預約");
}

export const activeAppointmentStatuses: AppointmentStatus[] = ["pending", "confirmed"];
