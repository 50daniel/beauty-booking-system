import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return createHash("sha256").update(`beauty-booking:${password}`).digest("hex");
}

async function main() {
  const lin = await prisma.staff.upsert({
    where: { id: "staff-lin" },
    update: {},
    create: { id: "staff-lin", name: "林佳瑜", phone: "0912-111-222", color: "#177e89" },
  });
  const chen = await prisma.staff.upsert({
    where: { id: "staff-chen" },
    update: {},
    create: { id: "staff-chen", name: "陳品妍", phone: "0912-333-444", color: "#b74d65" },
  });
  const wu = await prisma.staff.upsert({
    where: { id: "staff-wu" },
    update: {},
    create: { id: "staff-wu", name: "吳柔安", phone: "0912-555-666", color: "#1f7a4f" },
  });

  const facial = await prisma.service.upsert({
    where: { id: "svc-facial" },
    update: {},
    create: {
      id: "svc-facial",
      name: "深層保濕臉部護理",
      category: "臉部保養",
      price: 1800,
      durationMinutes: 90,
      bufferMinutes: 15,
      color: "#177e89",
    },
  });
  const lash = await prisma.service.upsert({
    where: { id: "svc-lash" },
    update: {},
    create: {
      id: "svc-lash",
      name: "日系自然美睫",
      category: "美睫",
      price: 1600,
      durationMinutes: 120,
      bufferMinutes: 15,
      color: "#b74d65",
    },
  });
  const body = await prisma.service.upsert({
    where: { id: "svc-body" },
    update: {},
    create: {
      id: "svc-body",
      name: "肩頸舒壓芳療",
      category: "身體課程",
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
    update: {},
    create: { id: "default", shopName: "美容預約中心" },
  });

  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "系統管理員",
      passwordHash: hashPassword("admin1234"),
      role: "admin",
    },
  });

  for (const user of [
    { email: "lin@example.com", name: "林佳瑜", staffId: lin.id },
    { email: "chen@example.com", name: "陳品妍", staffId: chen.id },
    { email: "wu@example.com", name: "吳柔安", staffId: wu.id },
  ]) {
    await prisma.adminUser.upsert({
      where: { email: user.email },
      update: {
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
