import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/time";

const dayScheduleSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["working", "time_off"]),
  start: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  end: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});

export async function PUT(request: NextRequest) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const parsed = dayScheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "每日排班資料格式不正確" }, { status: 400 });
  }

  const data = parsed.data;
  if (data.status === "working" && (!data.start || !data.end)) {
    return NextResponse.json({ error: "上班日需設定開始與結束時間" }, { status: 400 });
  }

  const date = new Date(`${data.date}T00:00:00+08:00`);
  const schedule = await prisma.staffDaySchedule.upsert({
    where: {
      staffId_date: {
        staffId: data.staffId,
        date,
      },
    },
    update: {
      status: data.status,
      startMinute: data.status === "working" && data.start ? timeToMinutes(data.start) : null,
      endMinute: data.status === "working" && data.end ? timeToMinutes(data.end) : null,
      note: data.note || null,
    },
    create: {
      staffId: data.staffId,
      date,
      status: data.status,
      startMinute: data.status === "working" && data.start ? timeToMinutes(data.start) : null,
      endMinute: data.status === "working" && data.end ? timeToMinutes(data.end) : null,
      note: data.note || null,
    },
  });

  return NextResponse.json({ schedule });
}
