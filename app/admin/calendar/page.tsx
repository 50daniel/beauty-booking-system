import { prisma } from "@/lib/prisma";
import { requireAdminPageUser } from "@/lib/auth";
import { CalendarWorkspace } from "./calendar-workspace";

export default async function AdminCalendarPage() {
  await requireAdminPageUser();
  const staff = await prisma.staff.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  return <CalendarWorkspace staff={staff} />;
}
