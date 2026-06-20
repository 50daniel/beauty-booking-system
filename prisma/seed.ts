import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return createHash("sha256").update(`beauty-booking:${password}`).digest("hex");
}

async function main() {
  const lin = await prisma.staff.upsert({
    where: { id: "staff-lin" },
    update: { name: "林老師", phone: "0912-111-222", active: true, color: "#177e89" },
    create: { id: "staff-lin", name: "林老師", phone: "0912-111-222", color: "#177e89" },
  });
  const chen = await prisma.staff.upsert({
    where: { id: "staff-chen" },
    update: { name: "陳老師", phone: "0912-333-444", active: true, color: "#b74d65" },
    create: { id: "staff-chen", name: "陳老師", phone: "0912-333-444", color: "#b74d65" },
  });
  const wu = await prisma.staff.upsert({
    where: { id: "staff-wu" },
    update: { name: "吳老師", phone: "0912-555-666", active: true, color: "#1f7a4f" },
    create: { id: "staff-wu", name: "吳老師", phone: "0912-555-666", color: "#1f7a4f" },
  });

  const facial = await prisma.service.upsert({
    where: { id: "svc-facial" },
    update: {
      name: "深層保濕臉部護理",
      category: "臉部護理",
      price: 1800,
      durationMinutes: 90,
      bufferMinutes: 15,
      active: true,
      color: "#177e89",
    },
    create: {
      id: "svc-facial",
      name: "深層保濕臉部護理",
      category: "臉部護理",
      price: 1800,
      durationMinutes: 90,
      bufferMinutes: 15,
      color: "#177e89",
    },
  });
  const lash = await prisma.service.upsert({
    where: { id: "svc-lash" },
    update: {
      name: "自然款美睫設計",
      category: "美睫",
      price: 1600,
      durationMinutes: 120,
      bufferMinutes: 15,
      active: true,
      color: "#b74d65",
    },
    create: {
      id: "svc-lash",
      name: "自然款美睫設計",
      category: "美睫",
      price: 1600,
      durationMinutes: 120,
      bufferMinutes: 15,
      color: "#b74d65",
    },
  });
  const body = await prisma.service.upsert({
    where: { id: "svc-body" },
    update: {
      name: "肩頸放鬆護理",
      category: "身體護理",
      price: 2200,
      durationMinutes: 100,
      bufferMinutes: 20,
      active: true,
      color: "#1f7a4f",
    },
    create: {
      id: "svc-body",
      name: "肩頸放鬆護理",
      category: "身體護理",
      price: 2200,
      durationMinutes: 100,
      bufferMinutes: 20,
      color: "#1f7a4f",
    },
  });

  for (const [staffId, serviceId] of [
    [lin.id, facial.id],
    [lin.id, body.id],
    [chen.id, facial.id],
    [chen.id, lash.id],
    [wu.id, facial.id],
    [wu.id, lash.id],
    [wu.id, body.id],
  ]) {
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId, serviceId } },
      update: {},
      create: { staffId, serviceId },
    });
  }

  await prisma.staffSchedule.deleteMany();
  for (const staff of [
    { id: lin.id, days: [1, 2, 3, 4, 5], start: 600, end: 1140 },
    { id: chen.id, days: [2, 3, 4, 5, 6], start: 660, end: 1200 },
    { id: wu.id, days: [0, 1, 4, 5, 6], start: 570, end: 1110 },
  ]) {
    for (const dayOfWeek of staff.days) {
      await prisma.staffSchedule.create({
        data: {
          staffId: staff.id,
          dayOfWeek,
          startMinute: staff.start,
          endMinute: staff.end,
        },
      });
    }
  }

  await prisma.businessSetting.upsert({
    where: { id: "default" },
    update: {
      shopName: "美麗預約工作室",
      cancellationPolicy: "如需取消或改期，請提前與店家聯繫。",
    },
    create: {
      id: "default",
      shopName: "美麗預約工作室",
      cancellationPolicy: "如需取消或改期，請提前與店家聯繫。",
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "系統管理員",
      active: true,
      role: "admin",
    },
    create: {
      email: "admin@example.com",
      name: "系統管理員",
      passwordHash: hashPassword("admin1234"),
      role: "admin",
    },
  });

  for (const user of [
    { email: "lin@example.com", name: "林老師", staffId: lin.id },
    { email: "chen@example.com", name: "陳老師", staffId: chen.id },
    { email: "wu@example.com", name: "吳老師", staffId: wu.id },
  ]) {
    await prisma.adminUser.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        staffId: user.staffId,
        role: "staff",
        active: true,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash: hashPassword("staff1234"),
        role: "staff",
        staffId: user.staffId,
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
