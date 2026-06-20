import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  price: z.number().int().min(0),
  durationMinutes: z.number().int().min(15),
  bufferMinutes: z.number().int().min(0),
  color: z.string().min(4),
  active: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const services = await prisma.service.findMany({
    include: {
      staff: {
        include: { staff: true },
      },
    },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      description: service.description,
      price: service.price,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      active: service.active,
      color: service.color,
      staff: service.staff.map((item) => ({ id: item.staff.id, name: item.staff.name })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const parsed = serviceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "服務資料格式不正確" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
