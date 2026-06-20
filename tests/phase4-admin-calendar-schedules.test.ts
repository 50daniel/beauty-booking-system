import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as getCalendarEvents } from "@/app/api/admin/calendar/route";
import { GET as getSchedules, PUT as updateSchedules } from "@/app/api/admin/schedules/route";
import { POST as createTimeOff } from "@/app/api/admin/time-off/route";
import { DELETE as deleteTimeOff } from "@/app/api/admin/time-off/[id]/route";

const runId = `phase4-${Date.now()}`;
const staffAId = `${runId}-staff-a`;
const staffBId = `${runId}-staff-b`;
const inactiveStaffId = `${runId}-staff-inactive`;
const serviceAId = `${runId}-service-a`;
const serviceBId = `${runId}-service-b`;
const memberId = `${runId}-member`;
const confirmedAId = `${runId}-confirmed-a`;
const confirmedBId = `${runId}-confirmed-b`;
const pendingId = `${runId}-pending`;
const cancelledId = `${runId}-cancelled`;
const initialTimeOffId = `${runId}-time-off-initial`;
const deleteTimeOffId = `${runId}-time-off-delete`;
const date = "2026-06-10";
const memberPhone = `08${String(Date.now()).slice(-8)}`;

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function taipeiDateTime(dateText: string, time: string) {
  return new Date(`${dateText}T${time}:00+08:00`);
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

before(async () => {
  await cleanup();

  await prisma.staff.createMany({
    data: [
      { id: staffAId, name: "Phase 4 Staff A", active: true, color: "#177e89" },
      { id: staffBId, name: "Phase 4 Staff B", active: true, color: "#b74d65" },
      { id: inactiveStaffId, name: "Phase 4 Inactive Staff", active: false, color: "#777777" },
    ],
  });

  await prisma.service.createMany({
    data: [
      {
        id: serviceAId,
        name: "Phase 4 Service A",
        category: "Calendar",
        price: 1500,
        durationMinutes: 60,
        bufferMinutes: 15,
        active: true,
        color: "#123456",
      },
      {
        id: serviceBId,
        name: "Phase 4 Service B",
        category: "Calendar",
        price: 1800,
        durationMinutes: 90,
        bufferMinutes: 15,
        active: true,
        color: "#654321",
      },
    ],
  });

  await prisma.member.create({
    data: {
      id: memberId,
      name: "Phase 4 Member",
      phone: memberPhone,
      email: `${runId}@example.com`,
      allergyNote: "Phase 4 allergy note",
    },
  });

  await prisma.staffSchedule.createMany({
    data: [
      { staffId: staffAId, dayOfWeek: 1, startMinute: 600, endMinute: 1080 },
      { staffId: staffAId, dayOfWeek: 3, startMinute: 600, endMinute: 1080 },
      { staffId: staffBId, dayOfWeek: 3, startMinute: 660, endMinute: 1140 },
    ],
  });

  await prisma.staffTimeOff.createMany({
    data: [
      {
        id: initialTimeOffId,
        staffId: staffAId,
        startAt: taipeiDateTime(date, "00:00"),
        endAt: taipeiDateTime(date, "23:59"),
        reason: "Initial phase 4 time off",
      },
      {
        id: deleteTimeOffId,
        staffId: staffAId,
        startAt: taipeiDateTime("2026-06-11", "00:00"),
        endAt: taipeiDateTime("2026-06-11", "23:59"),
        reason: "Delete me",
      },
    ],
  });

  await prisma.appointment.createMany({
    data: [
      {
        id: confirmedAId,
        memberId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: taipeiDateTime(date, "10:00"),
        endAt: taipeiDateTime(date, "11:00"),
        status: "confirmed",
        customerNote: "Confirmed A note",
      },
      {
        id: confirmedBId,
        memberId,
        staffId: staffBId,
        serviceId: serviceBId,
        startAt: taipeiDateTime(date, "12:00"),
        endAt: taipeiDateTime(date, "13:30"),
        status: "confirmed",
      },
      {
        id: pendingId,
        memberId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: taipeiDateTime(date, "14:00"),
        endAt: taipeiDateTime(date, "15:00"),
        status: "pending",
      },
      {
        id: cancelledId,
        memberId,
        staffId: staffAId,
        serviceId: serviceAId,
        startAt: taipeiDateTime(date, "16:00"),
        endAt: taipeiDateTime(date, "17:00"),
        status: "cancelled",
      },
    ],
  });
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test("admin calendar returns confirmed events in range with event metadata", async () => {
  const response = await getCalendarEvents(
    request(`http://localhost/api/admin/calendar?staffId=all&start=${date}T00:00:00%2B08:00&end=${date}T23:59:59%2B08:00`),
  );
  assert.equal(response.status, 200);

  const json = await responseJson(response);
  const events = json.events as Array<{
    id: string;
    title: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: Record<string, string | null>;
  }>;
  const ids = events.map((event) => event.id);

  assert.ok(ids.includes(confirmedAId));
  assert.ok(ids.includes(confirmedBId));
  assert.ok(!ids.includes(pendingId));
  assert.ok(!ids.includes(cancelledId));

  const event = events.find((item) => item.id === confirmedAId);
  assert.equal(event?.title, "Phase 4 Member / Phase 4 Service A");
  assert.equal(event?.backgroundColor, "#123456");
  assert.equal(event?.borderColor, "#177e89");
  assert.equal(event?.extendedProps.memberPhone, memberPhone);
  assert.equal(event?.extendedProps.staffName, "Phase 4 Staff A");
  assert.equal(event?.extendedProps.serviceName, "Phase 4 Service A");
});

test("admin calendar staff filter limits events to the selected staff", async () => {
  const response = await getCalendarEvents(
    request(`http://localhost/api/admin/calendar?staffId=${staffAId}&start=${date}T00:00:00%2B08:00&end=${date}T23:59:59%2B08:00`),
  );
  assert.equal(response.status, 200);

  const json = await responseJson(response);
  const ids = (json.events as Array<{ id: string }>).map((event) => event.id);
  assert.ok(ids.includes(confirmedAId));
  assert.ok(!ids.includes(confirmedBId));
});

test("admin schedules GET returns active staff with weekly schedules and time off", async () => {
  const response = await getSchedules(request("http://localhost/api/admin/schedules?month=2026-06"));
  assert.equal(response.status, 200);

  const json = await responseJson(response);
  const staff = json.staff as Array<{
    id: string;
    schedules: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }>;
    daySchedules: Array<{ date: string; status: string; startMinute: number | null; endMinute: number | null }>;
    timeOff: Array<{ id: string; reason: string | null }>;
  }>;

  const active = staff.find((item) => item.id === staffAId);
  assert.ok(active);
  assert.ok(!staff.some((item) => item.id === inactiveStaffId));
  assert.ok(active.schedules.some((schedule) => schedule.dayOfWeek === 3 && schedule.startMinute === 600));
  assert.ok(active.timeOff.some((timeOff) => timeOff.id === initialTimeOffId));
});

test("admin schedules PUT validates payloads and unknown staff", async () => {
  const invalidPayload = await updateSchedules(
    request("http://localhost/api/admin/schedules", {
      method: "PUT",
      body: JSON.stringify({ staffId: staffAId, schedules: [{ dayOfWeek: 8, start: "10:00", end: "19:00", enabled: true }] }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(invalidPayload.status, 400);

  const unknownStaff = await updateSchedules(
    request("http://localhost/api/admin/schedules", {
      method: "PUT",
      body: JSON.stringify({ staffId: `${runId}-missing`, schedules: [] }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(unknownStaff.status, 404);
});

test("admin schedules PUT replaces existing schedules with enabled rows only", async () => {
  const response = await updateSchedules(
    request("http://localhost/api/admin/schedules", {
      method: "PUT",
      body: JSON.stringify({
        staffId: staffAId,
        schedules: [
          { dayOfWeek: 2, start: "09:30", end: "18:30", enabled: true },
          { dayOfWeek: 4, start: "10:00", end: "19:00", enabled: false },
        ],
      }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(response.status, 200);

  const schedules = await prisma.staffSchedule.findMany({ where: { staffId: staffAId }, orderBy: { dayOfWeek: "asc" } });
  assert.deepEqual(
    schedules.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startMinute: schedule.startMinute,
      endMinute: schedule.endMinute,
    })),
    [{ dayOfWeek: 2, startMinute: 570, endMinute: 1110 }],
  );
});

test("admin time off POST validates payloads, unknown staff, and creates a full Taipei day", async () => {
  const invalidPayload = await createTimeOff(
    request("http://localhost/api/admin/time-off", {
      method: "POST",
      body: JSON.stringify({ staffId: staffAId, date: "2026/06/12" }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(invalidPayload.status, 400);

  const unknownStaff = await createTimeOff(
    request("http://localhost/api/admin/time-off", {
      method: "POST",
      body: JSON.stringify({ staffId: `${runId}-missing`, date: "2026-06-12" }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(unknownStaff.status, 404);

  const created = await createTimeOff(
    request("http://localhost/api/admin/time-off", {
      method: "POST",
      body: JSON.stringify({ staffId: staffAId, date: "2026-06-12", reason: "Training" }),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(created.status, 201);

  const json = await responseJson(created);
  const timeOff = json.timeOff as { id: string; startAt: string; endAt: string; reason: string };
  assert.equal(timeOff.reason, "Training");
  assert.equal(new Date(timeOff.startAt).toISOString(), "2026-06-11T16:00:00.000Z");
  assert.equal(new Date(timeOff.endAt).toISOString(), "2026-06-12T15:59:59.000Z");
});

test("admin time off DELETE removes an existing time-off record", async () => {
  const response = await deleteTimeOff(request("http://localhost/api/admin/time-off/delete"), routeContext(deleteTimeOffId));
  assert.equal(response.status, 200);

  const deleted = await prisma.staffTimeOff.findUnique({ where: { id: deleteTimeOffId } });
  assert.equal(deleted, null);
});

async function cleanup() {
  await prisma.notificationLog.deleteMany({ where: { appointmentId: { in: appointmentIds() } } });
  await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds() } } });
  await prisma.staffTimeOff.deleteMany({ where: { staffId: { in: staffIds() } } });
  await prisma.staffSchedule.deleteMany({ where: { staffId: { in: staffIds() } } });
  await prisma.staffService.deleteMany({ where: { staffId: { in: staffIds() } } });
  await prisma.service.deleteMany({ where: { id: { in: [serviceAId, serviceBId] } } });
  await prisma.member.deleteMany({ where: { id: memberId } });
  await prisma.staff.deleteMany({ where: { id: { in: staffIds() } } });
}

function appointmentIds() {
  return [confirmedAId, confirmedBId, pendingId, cancelledId];
}

function staffIds() {
  return [staffAId, staffBId, inactiveStaffId];
}
