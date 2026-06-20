import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  price: z.number().int().min(0),
  durationMinutes: z.number().int().min(15),
  bufferMinutes: z.number().int().min(0),
  color: z.string().min(4),
  active: z.boolean(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const parsed = serviceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "服務資料格式不正確" }, { status: 400 });
  }

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
    },
  });

  return NextResponse.json({ service });
}
