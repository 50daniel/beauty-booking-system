import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/time";
import { requireAdminPageUser } from "@/lib/auth";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const user = await requireAdminPageUser();
  const today = dateOnly(new Date());
  const [pending, confirmedToday, members] = await Promise.all([
    prisma.appointment.count({ where: { status: "pending" } }),
    prisma.appointment.count({
      where: {
        status: "confirmed",
        startAt: {
          gte: new Date(`${today}T00:00:00+08:00`),
          lte: new Date(`${today}T23:59:59+08:00`),
        },
      },
    }),
    prisma.member.count(),
  ]);

  return (
    <AdminDashboard
      currentUser={{ name: user.name, email: user.email, role: user.role }}
      initialMetrics={{ pending, confirmedToday, members }}
      today={today}
    />
  );
}
