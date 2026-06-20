"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventSourceFunc, EventSourceFuncArg } from "@fullcalendar/core";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RejectAppointmentModal } from "../admin-modals";

type Staff = {
  id: string;
  name: string;
  color: string;
};

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rejected" | "no_show";

type Appointment = {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  customerNote: string | null;
  member: {
    name: string;
    phone: string;
    allergyNote: string | null;
  };
  staff: {
    id: string;
    name: string;
    color: string;
  };
  service: {
    name: string;
    color: string;
    durationMinutes: number;
  };
};

type CalendarWorkspaceProps = {
  staff: Staff[];
};

export function CalendarWorkspace({ staff }: CalendarWorkspaceProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [staffId, setStaffId] = useState("all");
  const [view, setView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("timeGridWeek");
  const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
  const [pending, setPending] = useState<Appointment[]>([]);
  const [confirmedDay, setConfirmedDay] = useState<Appointment[]>([]);
  const [message, setMessage] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Appointment | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const filteredStaff = useMemo(() => {
    if (staffId === "all") return staff;
    return staff.filter((item) => item.id === staffId);
  }, [staff, staffId]);

  const appointmentsByStaff = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filteredStaff.forEach((item) => map.set(item.id, []));
    confirmedDay.forEach((appointment) => {
      if (staffId !== "all" && appointment.staff.id !== staffId) return;
      map.get(appointment.staff.id)?.push(appointment);
    });
    return map;
  }, [confirmedDay, filteredStaff, staffId]);

  const loadPending = useCallback(async () => {
    const response = await fetch("/api/admin/appointments?status=pending");
    const data = await response.json();
    setPending(data.appointments ?? []);
  }, []);

  const loadConfirmedDay = useCallback(async () => {
    const response = await fetch(`/api/admin/appointments?status=confirmed&date=${selectedDate}`);
    const data = await response.json();
    setConfirmedDay(data.appointments ?? []);
  }, [selectedDate]);

  const loadCalendarEvents: EventSourceFunc = useCallback(
    async (info: EventSourceFuncArg) => {
      const params = new URLSearchParams();
      params.set("staffId", staffId);
      params.set("start", info.startStr);
      params.set("end", info.endStr);
      const response = await fetch(`/api/admin/calendar?${params.toString()}`);
      const data = await response.json();
      return data.events ?? [];
    },
    [staffId],
  );

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    loadConfirmedDay();
  }, [loadConfirmedDay]);

  function changeView(nextView: "dayGridMonth" | "timeGridWeek" | "timeGridDay") {
    setView(nextView);
    calendarRef.current?.getApi().changeView(nextView);
  }

  async function refreshCalendar() {
    await Promise.all([loadPending(), loadConfirmedDay()]);
    calendarRef.current?.getApi().refetchEvents();
  }

  async function confirmAppointment(id: string) {
    setMessage("正在確認預約...");
    const response = await fetch(`/api/admin/appointments/${id}/confirm`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "確認失敗");
      return;
    }
    setMessage("預約已確認，已加入正式日曆。");
    await refreshCalendar();
  }

  async function rejectAppointment(appointment: Appointment, reason: string) {
    setModalSubmitting(true);
    const response = await fetch(`/api/admin/appointments/${appointment.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "拒絕失敗");
      setModalSubmitting(false);
      return;
    }
    setMessage("預約申請已拒絕。");
    setRejectTarget(null);
    setModalSubmitting(false);
    await refreshCalendar();
  }

  return (
    <main className="calendarShell">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1>正式預約日曆</h1>
          <p>只有已確認預約會進入正式日曆。每日排程會依美容師分組顯示，方便查看每位美容師當天安排。</p>
        </div>
        <div className="headerActions">
          <Link className="textLink" href="/admin">
            回後台首頁
          </Link>
          <Link className="textLink secondary" href="/admin/schedules">
            排班休假
          </Link>
        </div>
      </header>

      {message ? <div className="adminMessage">{message}</div> : null}

      <div className="calendarLayout">
        <section className="panel calendarMain">
          <div className="calendarToolbar">
            <label>
              美容師
              <select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                <option value="all">全部美容師</option>
                {staff.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              每日排程日期
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <div className="calendarViewSwitch" aria-label="Calendar view">
              <button
                className={view === "dayGridMonth" ? "isActive" : ""}
                onClick={() => changeView("dayGridMonth")}
                type="button"
              >
                月
              </button>
              <button
                className={view === "timeGridWeek" ? "isActive" : ""}
                onClick={() => changeView("timeGridWeek")}
                type="button"
              >
                週
              </button>
              <button
                className={view === "timeGridDay" ? "isActive" : ""}
                onClick={() => changeView("timeGridDay")}
                type="button"
              >
                日
              </button>
            </div>
          </div>

          <FullCalendar
            key={staffId}
            ref={calendarRef}
            allDaySlot={false}
            dateClick={(info) => setSelectedDate(info.dateStr.slice(0, 10))}
            events={loadCalendarEvents}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            height="auto"
            initialView={view}
            locale="zh-tw"
            nowIndicator
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            slotMinTime="09:00:00"
            slotMaxTime="21:00:00"
          />

          <section className="staffDayBoard">
            <div className="sectionHeading">
              <p className="eyebrow">Daily Board</p>
              <h2>{formatDate(selectedDate)} 每日美容師排程</h2>
            </div>
            <div className="staffScheduleColumns">
              {filteredStaff.map((item) => {
                const appointments = appointmentsByStaff.get(item.id) ?? [];
                return (
                  <article className="staffScheduleColumn" key={item.id}>
                    <div className="staffScheduleHeader" style={{ borderColor: item.color }}>
                      <span style={{ background: item.color }} />
                      <h3>{item.name}</h3>
                      <small>{appointments.length} 筆預約</small>
                    </div>
                    {appointments.length === 0 ? <div className="emptyState compact">當天沒有已確認預約</div> : null}
                    {appointments.map((appointment) => (
                      <div className="dayAppointment" key={appointment.id} style={{ borderColor: appointment.service.color }}>
                        <strong>
                          {formatTime(appointment.startAt)}-{formatTime(appointment.endAt)}
                        </strong>
                        <span>{appointment.member.name}</span>
                        <small>
                          {appointment.service.name} / {appointment.member.phone}
                        </small>
                        {appointment.customerNote ? <small>客戶備註：{appointment.customerNote}</small> : null}
                      </div>
                    ))}
                  </article>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="panel pendingSidebar">
          <div className="sectionHeading">
            <p className="eyebrow">Pending</p>
            <h2>待確認申請</h2>
          </div>
          <div className="adminList">
            {pending.length === 0 ? <div className="emptyState">目前沒有待確認申請</div> : null}
            {pending.map((appointment) => (
              <article className="adminCard" key={appointment.id}>
                <span className="statusBadge pending">待確認</span>
                <h3>
                  {formatDateTime(appointment.startAt)} / {appointment.member.name}
                </h3>
                <p>
                  {appointment.service.name} / {appointment.staff.name} / {appointment.member.phone}
                </p>
                {appointment.member.allergyNote ? <p>過敏/禁忌：{appointment.member.allergyNote}</p> : null}
                {appointment.customerNote ? <p>客戶備註：{appointment.customerNote}</p> : null}
                <div className="buttonRow">
                  <button className="primaryButton" onClick={() => confirmAppointment(appointment.id)} type="button">
                    確認
                  </button>
                  <button className="dangerButton" onClick={() => setRejectTarget(appointment)} type="button">
                    拒絕
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
      <RejectAppointmentModal
        appointmentLabel={rejectTarget ? `${formatDateTime(rejectTarget.startAt)} / ${rejectTarget.member.name} / ${rejectTarget.service.name}` : ""}
        onClose={() => setRejectTarget(null)}
        onSubmit={(reason) => {
          if (!rejectTarget) return;
          return rejectAppointment(rejectTarget, reason);
        }}
        open={Boolean(rejectTarget)}
        submitting={modalSubmitting}
      />
    </main>
  );
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
