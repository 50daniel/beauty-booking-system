import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const staffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  color: z.string().min(4),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).default([]),
});

export async function GET() {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const [staff, services] = await Promise.all([
    prisma.staff.findMany({
      include: {
        services: {
          include: { service: true },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    staff: staff.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      email: item.email,
      color: item.color,
      active: item.active,
      services: item.services.map((entry) => ({ id: entry.service.id, name: entry.service.name })),
    })),
    services,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const parsed = staffSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "美容師資料格式不正確" }, { status: 400 });
  }

  const staff = await prisma.$transaction(async (tx) => {
    const created = await tx.staff.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        color: parsed.data.color,
        active: parsed.data.active ?? true,
      },
    });

    if (parsed.data.serviceIds.length) {
      await tx.staffService.createMany({
        data: parsed.data.serviceIds.map((serviceId) => ({ staffId: created.id, serviceId })),
      });
    }

    return created;
  });

  return NextResponse.json({ staff }, { status: 201 });
}
