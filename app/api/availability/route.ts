import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/booking";

const availabilityQuery = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  const parsed = availabilityQuery.safeParse({
    serviceId: request.nextUrl.searchParams.get("serviceId"),
    staffId: request.nextUrl.searchParams.get("staffId"),
    date: request.nextUrl.searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "查詢條件不完整" }, { status: 400 });
  }

  const slots = await getAvailableSlots(parsed.data);
  return NextResponse.json({ slots });
}
