import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const staffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  color: z.string().min(4),
  active: z.boolean(),
  serviceIds: z.array(z.string()).default([]),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = staffSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "美容師資料格式不正確" }, { status: 400 });
  }

  const staff = await prisma.$transaction(async (tx) => {
    const updated = await tx.staff.update({
      where: { id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        color: parsed.data.color,
        active: parsed.data.active,
      },
    });

    await tx.staffService.deleteMany({ where: { staffId: id } });
    if (parsed.data.serviceIds.length) {
      await tx.staffService.createMany({
        data: parsed.data.serviceIds.map((serviceId) => ({ staffId: id, serviceId })),
      });
    }

    return updated;
  });

  return NextResponse.json({ staff });
}
