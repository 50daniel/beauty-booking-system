import { prisma } from "@/lib/prisma";
import { requireAdminPageUser } from "@/lib/auth";
import { ScheduleSettings } from "./schedule-settings";

export default async function SchedulesPage() {
  const user = await requireAdminPageUser();
  const staff = await prisma.staff.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  return <ScheduleSettings currentUser={{ role: user.role, staffId: user.staffId }} staff={staff} />;
}
