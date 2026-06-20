import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as getAppointments } from "@/app/api/admin/appointments/route";
import { GET as getMembers } from "@/app/api/admin/members/route";
import { POST as confirmAppointment } from "@/app/api/admin/appointments/[id]/confirm/route";
import { POST as rejectAppointment } from "@/app/api/admin/appointments/[id]/reject/route";
import { PATCH as updateAppointmentStatus } from "@/app/api/admin/appointments/[id]/status/route";

const runId = `phase3-${Date.now()}`;
const staffId = `${runId}-staff`;
const serviceId = `${runId}-service`;
const memberId = `${runId}-member`;
const pendingAppointmentId = `${runId}-pending`;
const confirmedAppointmentId = `${runId}-confirmed`;
const rejectAppointmentId = `${runId}-reject`;
const statusAppointmentId = `${runId}-status`;
const conflictAppointmentId = `${runId}-conflict`;
const conflictBlockerId = `${runId}-conflict-blocker`;
const testDate = "2026-06-08";

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

function taipeiDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`);
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

before(async () => {
  await cleanup();

  await prisma.staff.create({
    data: {
      id: staffId,
      name: "Phase 3 Staff",
      active: true,
      color: "#177e89",
      schedules: {
        create: [{ dayOfWeek: 1, startMinute: 540, endMinute: 1080 }],
      },
    },
  });

  await prisma.service.create({
    data: {
      id: serviceId,
      name: "Phase 3 Service",
      category: "Test",
      price: 1200,
      durationMinutes: 60,
      bufferMinutes: 15,
      active: true,
      color: "#177e89",
    },
  });

  await prisma.staffService.create({ data: { staffId, serviceId } });

  await prisma.member.create({
    data: {
      id: memberId,
      name: "Phase 3 Member",
      phone: `09${String(Date.now()).slice(-8)}`,
      email: `${runId}@example.com`,
      allergyNote: "No test allergy",
      note: "Phase 3 note",
    },
  });

  await prisma.appointment.createMany({
    data: [
      {
        id: pendingAppointmentId,
        memberId,
        staffId,
        serviceId,
        startAt: taipeiDateTime(testDate, "09:00"),
        endAt: taipeiDateTime(testDate, "10:00"),
        status: "pending",
        customerNote: "Waiting for admin review",
      },
      {
        id: confirmedAppointmentId,
        memberId,
        staffId,
        serviceId,
        startAt: taipeiDateTime(testDate, "11:00"),
        endAt: taipeiDateTime(testDate, "12:00"),
        status: "confirmed",
      },
      {
        id: rejectAppointmentId,
        memberId,
        staffId,
        serviceId,
        startAt: taipeiDateTime(testDate, "13:00"),
        endAt: taipeiDateTime(testDate, "14:00"),
        status: "pending",
      },
      {
        id: statusAppointmentId,
        memberId,
        staffId,
        serviceId,
        startAt: taipeiDateTime(testDate, "15:00"),
        endAt: taipeiDateTime(testDate, "16:00"),
        status: "confirmed",
      },
      {
        id: conflictAppointmentId,
        memberId,
        staffId,
        serviceId,
        startAt: taipeiDateTime(testDate, "16:30"),
        endAt: taipeiDateTime(testDate, "17:30"),
        status: "pending",
      },
      {
        id: conflictBlockerId,
        memberId,
        staffId,
        serviceId,
        startAt: taipeiDateTime(testDate, "17:00"),
        endAt: taipeiDateTime(testDate, "18:00"),
        status: "confirmed",
      },
    ],
  });
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test("admin appointment list filters by status and Taipei date", async () => {
  const pendingResponse = await getAppointments(request("http://localhost/api/admin/appointments?status=pending"));
  assert.equal(pendingResponse.status, 200);
  const pendingJson = await responseJson(pendingResponse);
  const pendingIds = (pendingJson.appointments as Array<{ id: string }>).map((appointment) => appointment.id);
  assert.ok(pendingIds.includes(pendingAppointmentId));
  assert.ok(pendingIds.includes(rejectAppointmentId));
  assert.ok(!pendingIds.includes(confirmedAppointmentId));

  const confirmedTodayResponse = await getAppointments(
    request(`http://localhost/api/admin/appointments?status=confirmed&date=${testDate}`),
  );
  assert.equal(confirmedTodayResponse.status, 200);
  const confirmedTodayJson = await responseJson(confirmedTodayResponse);
  const confirmedIds = (confirmedTodayJson.appointments as Array<{ id: string }>).map((appointment) => appointment.id);
  assert.ok(confirmedIds.includes(confirmedAppointmentId));
  assert.ok(!confirmedIds.includes(pendingAppointmentId));
});

test("admin can confirm a pending appointment and a notification log is queued", async () => {
  const response = await confirmAppointment(request("http://localhost/api/admin/appointments/confirm"), routeContext(pendingAppointmentId));
  assert.equal(response.status, 200);

  const json = await responseJson(response);
  assert.deepEqual(json.appointment, {
    id: pendingAppointmentId,
    status: "confirmed",
    memberName: "Phase 3 Member",
    staffName: "Phase 3 Staff",
    serviceName: "Phase 3 Service",
  });

  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: pendingAppointmentId } });
  assert.equal(appointment.status, "confirmed");
  assert.ok(appointment.confirmedAt);

  const log = await prisma.notificationLog.findFirst({ where: { appointmentId: pendingAppointmentId } });
  assert.equal(log?.channel, "manual");
  assert.equal(log?.status, "queued");
});

test("admin confirm rejects appointments that conflict with confirmed bookings", async () => {
  const response = await confirmAppointment(request("http://localhost/api/admin/appointments/confirm"), routeContext(conflictAppointmentId));
  assert.equal(response.status, 409);

  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: conflictAppointmentId } });
  assert.equal(appointment.status, "pending");
});

test("admin can reject a pending appointment with a reason", async () => {
  const response = await rejectAppointment(
    request("http://localhost/api/admin/appointments/reject", {
      method: "POST",
      body: JSON.stringify({ reason: "Customer requested another time" }),
      headers: { "content-type": "application/json" },
    }),
    routeContext(rejectAppointmentId),
  );
  assert.equal(response.status, 200);

  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: rejectAppointmentId } });
  assert.equal(appointment.status, "rejected");
  assert.equal(appointment.rejectionReason, "Customer requested another time");
  assert.ok(appointment.rejectedAt);
});

test("admin reject validates reason and current appointment status", async () => {
  const invalidReason = await rejectAppointment(
    request("http://localhost/api/admin/appointments/reject", {
      method: "POST",
      body: JSON.stringify({ reason: "" }),
      headers: { "content-type": "application/json" },
    }),
    routeContext(pendingAppointmentId),
  );
  assert.equal(invalidReason.status, 400);

  const nonPending = await rejectAppointment(
    request("http://localhost/api/admin/appointments/reject", {
      method: "POST",
      body: JSON.stringify({ reason: "Already confirmed" }),
      headers: { "content-type": "application/json" },
    }),
    routeContext(confirmedAppointmentId),
  );
  assert.equal(nonPending.status, 409);
});

test("admin can update confirmed appointment status and invalid statuses are rejected", async () => {
  const invalid = await updateAppointmentStatus(
    request("http://localhost/api/admin/appointments/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "pending" }),
      headers: { "content-type": "application/json" },
    }),
    routeContext(statusAppointmentId),
  );
  assert.equal(invalid.status, 400);

  const completed = await updateAppointmentStatus(
    request("http://localhost/api/admin/appointments/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
      headers: { "content-type": "application/json" },
    }),
    routeContext(statusAppointmentId),
  );
  assert.equal(completed.status, 200);

  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: statusAppointmentId } });
  assert.equal(appointment.status, "completed");
});

test("admin member list supports text search and includes appointment summaries", async () => {
  const response = await getMembers(request(`http://localhost/api/admin/members?q=${runId}`));
  assert.equal(response.status, 200);

  const json = await responseJson(response);
  const members = json.members as Array<{
    id: string;
    appointmentCount: number;
    latestAppointments: Array<{ id: string; serviceName: string; staffName: string }>;
  }>;
  const member = members.find((item) => item.id === memberId);
  assert.ok(member);
  assert.ok(member.appointmentCount > 0);
  assert.ok(member.latestAppointments.some((appointment) => appointment.serviceName === "Phase 3 Service"));
  assert.ok(member.latestAppointments.some((appointment) => appointment.staffName === "Phase 3 Staff"));
});

async function cleanup() {
  await prisma.notificationLog.deleteMany({
    where: { appointmentId: { in: testAppointmentIds() } },
  });
  await prisma.appointment.deleteMany({ where: { id: { in: testAppointmentIds() } } });
  await prisma.staffService.deleteMany({ where: { staffId } });
  await prisma.staffSchedule.deleteMany({ where: { staffId } });
  await prisma.staffTimeOff.deleteMany({ where: { staffId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.member.deleteMany({ where: { id: memberId } });
  await prisma.staff.deleteMany({ where: { id: staffId } });
}

function testAppointmentIds() {
  return [
    pendingAppointmentId,
    confirmedAppointmentId,
    rejectAppointmentId,
    statusAppointmentId,
    conflictAppointmentId,
    conflictBlockerId,
  ];
}
