import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const timeOffSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const parsed = timeOffSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "休假資料格式不正確" }, { status: 400 });
  }

  const staff = await prisma.staff.findUnique({ where: { id: parsed.data.staffId } });
  if (!staff) {
    return NextResponse.json({ error: "找不到美容師" }, { status: 404 });
  }

  const timeOff = await prisma.staffTimeOff.create({
    data: {
      staffId: parsed.data.staffId,
      startAt: new Date(`${parsed.data.date}T00:00:00+08:00`),
      endAt: new Date(`${parsed.data.date}T23:59:59+08:00`),
      reason: parsed.data.reason || "休假",
    },
  });

  return NextResponse.json({ timeOff }, { status: 201 });
}
