import { randomBytes, scryptSync } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const text = {
  lin: "\u6797\u8001\u5e2b",
  chen: "\u9673\u8001\u5e2b",
  wu: "\u5433\u8001\u5e2b",
  facialName: "\u6df1\u5c64\u4fdd\u6fd5\u81c9\u90e8\u8b77\u7406",
  facialCategory: "\u81c9\u90e8\u8b77\u7406",
  lashName: "\u81ea\u7136\u6b3e\u7f8e\u776b\u8a2d\u8a08",
  lashCategory: "\u7f8e\u776b",
  bodyName: "\u80a9\u9838\u653e\u9b06\u8b77\u7406",
  bodyCategory: "\u8eab\u9ad4\u8b77\u7406",
  shopName: "\u7f8e\u9e97\u9810\u7d04\u5de5\u4f5c\u5ba4",
  cancellationPolicy: "\u5982\u9700\u53d6\u6d88\u6216\u6539\u671f\uff0c\u8acb\u63d0\u524d\u8207\u5e97\u5bb6\u806f\u7e6b\u3002",
  adminName: "\u7cfb\u7d71\u7ba1\u7406\u54e1",
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(`beauty-booking:${password}`, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function main() {
  const lin = await prisma.staff.upsert({
    where: { id: "staff-lin" },
    update: { name: text.lin, phone: "0912-111-222", active: true, color: "#177e89" },
    create: { id: "staff-lin", name: text.lin, phone: "0912-111-222", color: "#177e89" },
  });
  const chen = await prisma.staff.upsert({
    where: { id: "staff-chen" },
    update: { name: text.chen, phone: "0912-333-444", active: true, color: "#b74d65" },
    create: { id: "staff-chen", name: text.chen, phone: "0912-333-444", color: "#b74d65" },
  });
  const wu = await prisma.staff.upsert({
    where: { id: "staff-wu" },
    update: { name: text.wu, phone: "0912-555-666", active: true, color: "#1f7a4f" },
    create: { id: "staff-wu", name: text.wu, phone: "0912-555-666", color: "#1f7a4f" },
  });

  const facial = await prisma.service.upsert({
    where: { id: "svc-facial" },
    update: {
      name: text.facialName,
      category: text.facialCategory,
      price: 1800,
      durationMinutes: 90,
      bufferMinutes: 15,
      active: true,
      color: "#177e89",
    },
    create: {
      id: "svc-facial",
      name: text.facialName,
      category: text.facialCategory,
      price: 1800,
      durationMinutes: 90,
      bufferMinutes: 15,
      color: "#177e89",
    },
  });
  const lash = await prisma.service.upsert({
    where: { id: "svc-lash" },
    update: {
      name: text.lashName,
      category: text.lashCategory,
      price: 1600,
      durationMinutes: 120,
      bufferMinutes: 15,
      active: true,
      color: "#b74d65",
    },
    create: {
      id: "svc-lash",
      name: text.lashName,
      category: text.lashCategory,
      price: 1600,
      durationMinutes: 120,
      bufferMinutes: 15,
      color: "#b74d65",
    },
  });
  const body = await prisma.service.upsert({
    where: { id: "svc-body" },
    update: {
      name: text.bodyName,
      category: text.bodyCategory,
      price: 2200,
      durationMinutes: 100,
      bufferMinutes: 20,
      active: true,
      color: "#1f7a4f",
    },
    create: {
      id: "svc-body",
      name: text.bodyName,
      category: text.bodyCategory,
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
      shopName: text.shopName,
      cancellationPolicy: text.cancellationPolicy,
    },
    create: {
      id: "default",
      shopName: text.shopName,
      cancellationPolicy: text.cancellationPolicy,
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: text.adminName,
      passwordHash: hashPassword("admin1234"),
      active: true,
      role: "admin",
    },
    create: {
      email: "admin@example.com",
      name: text.adminName,
      passwordHash: hashPassword("admin1234"),
      role: "admin",
    },
  });

  for (const user of [
    { email: "lin@example.com", name: text.lin, staffId: lin.id },
    { email: "chen@example.com", name: text.chen, staffId: chen.id },
    { email: "wu@example.com", name: text.wu, staffId: wu.id },
  ]) {
    await prisma.adminUser.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: hashPassword("staff1234"),
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
