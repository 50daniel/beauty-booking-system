import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/time";

const scheduleSchema = z.object({
  staffId: z.string().min(1),
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      enabled: z.boolean(),
    }),
  ),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const now = new Date();
  const month = request.nextUrl.searchParams.get("month") || now.toISOString().slice(0, 7);
  const startAt = new Date(`${month}-01T00:00:00+08:00`);
  const endAt = new Date(startAt);
  endAt.setMonth(endAt.getMonth() + 1);

  const staff = await prisma.staff.findMany({
    where: { active: true },
    include: {
      schedules: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
      daySchedules: {
        where: {
          date: {
            gte: startAt,
            lt: endAt,
          },
        },
        orderBy: { date: "asc" },
      },
      timeOff: { orderBy: { startAt: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    staff: staff.map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      schedules: item.schedules.map((schedule) => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startMinute: schedule.startMinute,
        endMinute: schedule.endMinute,
      })),
      daySchedules: item.daySchedules.map((schedule) => ({
        id: schedule.id,
        date: schedule.date,
        status: schedule.status,
        startMinute: schedule.startMinute,
        endMinute: schedule.endMinute,
        note: schedule.note,
      })),
      timeOff: item.timeOff.map((timeOff) => ({
        id: timeOff.id,
        startAt: timeOff.startAt,
        endAt: timeOff.endAt,
        reason: timeOff.reason,
      })),
    })),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const parsed = scheduleSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "排班資料格式不正確" }, { status: 400 });
  }

  const staff = await prisma.staff.findUnique({ where: { id: parsed.data.staffId } });
  if (!staff) {
    return NextResponse.json({ error: "找不到美容師" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffSchedule.deleteMany({ where: { staffId: parsed.data.staffId } });
    const enabledSchedules = parsed.data.schedules.filter((schedule) => schedule.enabled);
    if (enabledSchedules.length) {
      await tx.staffSchedule.createMany({
        data: enabledSchedules.map((schedule) => ({
          staffId: parsed.data.staffId,
          dayOfWeek: schedule.dayOfWeek,
          startMinute: timeToMinutes(schedule.start),
          endMinute: timeToMinutes(schedule.end),
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
