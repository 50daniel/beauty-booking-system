import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/time";
import { BookingFlow } from "./booking-flow";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      price: true,
      durationMinutes: true,
      bufferMinutes: true,
      color: true,
    },
  });

  return <BookingFlow initialServices={services} today={dateOnly(new Date())} />;
}
