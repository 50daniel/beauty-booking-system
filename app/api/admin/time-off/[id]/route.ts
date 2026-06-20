import { NextRequest, NextResponse } from "next/server";
import { requireApiManager } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireApiManager();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  await prisma.staffTimeOff.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
