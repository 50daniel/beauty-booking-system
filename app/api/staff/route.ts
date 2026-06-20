import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId");

  const staff = await prisma.staff.findMany({
    where: {
      active: true,
      ...(serviceId
        ? {
            services: {
              some: { serviceId },
            },
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      services: {
        select: {
          serviceId: true,
        },
      },
    },
  });

  return NextResponse.json({ staff });
}
