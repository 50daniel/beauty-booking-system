"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Staff = {
  id: string;
  name: string;
  color: string;
};

type WeeklySchedule = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

type DaySchedule = {
  id: string;
  date: string;
  status: "working" | "time_off";
  startMinute: number | null;
  endMinute: number | null;
  note: string | null;
};

type StaffScheduleData = Staff & {
  schedules: WeeklySchedule[];
  daySchedules: DaySchedule[];
};

type DayStaffState = {
  staff: StaffScheduleData;
  status: "working" | "time_off" | "unset";
  startMinute: number | null;
  endMinute: number | null;
  note: string | null;
  source: "monthly" | "weekly" | "unset";
};

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

export function ScheduleSettings({
  currentUser,
  staff,
}: {
  currentUser: { role: "admin" | "staff"; staffId: string | null };
  staff: Staff[];
}) {
  const isAdmin = currentUser.role === "admin";
  const defaultStaffId = currentUser.role === "staff" && currentUser.staffId ? currentUser.staffId : staff[0]?.id ?? "";
  const [staffId, setStaffId] = useState<"all" | string>("all");
  const [month, setMonth] = useState(currentMonthInput());
  const [scheduleData, setScheduleData] = useState<StaffScheduleData[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [status, setStatus] = useState<"working" | "time_off">("working");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("19:00");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const selectedStaffId = staffId === "all" ? defaultStaffId : staffId;
  const selectedStaff = useMemo(() => scheduleData.find((item) => item.id === selectedStaffId), [scheduleData, selectedStaffId]);
  const monthDays = useMemo(() => buildMonthDays(month), [month]);
  const isAllView = staffId === "all";

  const scheduleMap = useMemo(() => {
    const map = new Map<string, DaySchedule>();
    selectedStaff?.daySchedules.forEach((item) => {
      map.set(toDateInput(new Date(item.date)), item);
    });
    return map;
  }, [selectedStaff]);

  const loadSchedules = useCallback(async () => {
    const response = await fetch(`/api/admin/schedules?month=${month}`);
    const data = await response.json();
    setScheduleData(data.staff ?? []);
  }, [month]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  function selectDate(date: string) {
    setSelectedDate(date);
    if (isAllView) return;

    const existing = scheduleMap.get(date);
    if (existing) {
      setStatus(existing.status);
      setStart(existing.startMinute != null ? minutesToTime(existing.startMinute) : "10:00");
      setEnd(existing.endMinute != null ? minutesToTime(existing.endMinute) : "19:00");
      setNote(existing.note ?? "");
      return;
    }

    const fallback = getWeeklySchedule(selectedStaff, date);
    setStatus("working");
    setStart(fallback ? minutesToTime(fallback.startMinute) : "10:00");
    setEnd(fallback ? minutesToTime(fallback.endMinute) : "19:00");
    setNote("");
  }

  async function saveDaySchedule() {
    if (!isAdmin) {
      setMessage("你沒有排班設定權限。");
      return;
    }
    if (isAllView) {
      setMessage("請先選擇單一美容師，再設定該美容師的上班或休假。");
      return;
    }
    if (!selectedDate) {
      setMessage("請先選擇日期。");
      return;
    }
    const response = await fetch("/api/admin/day-schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, date: selectedDate, status, start, end, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "儲存排班失敗");
      return;
    }
    setMessage(status === "working" ? "上班時間已儲存。" : "休假設定已儲存。");
    await loadSchedules();
  }

  return (
    <main className="adminShell">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Monthly Schedule</p>
          <h1>月排班與休假日曆</h1>
          <p>
            選擇全部美容師時，可以在月曆上查看每天誰上班、誰休假。選擇單一美容師時，管理員可以直接設定該日上班時間或整天休假。
          </p>
        </div>
        <div className="headerActions">
          <Link className="textLink" href="/admin">
            回後台首頁
          </Link>
          <Link className="textLink secondary" href="/admin/calendar">
            正式日曆
          </Link>
        </div>
      </header>

      {message ? <div className="adminMessage">{message}</div> : null}

      <section className="panel monthlyControls">
        <label>
          檢視
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
          月份
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <div className="scheduleLegend">
          <span className="legendItem working">上班</span>
          <span className="legendItem timeOff">休假</span>
          <span className="legendItem unset">未設定</span>
          <span className="legendItem mixed">多人狀態</span>
        </div>
      </section>

      <div className="monthlyScheduleLayout">
        <section className="panel">
          <div className="monthCalendar">
            {weekdayLabels.map((label) => (
              <div className="weekdayHeader" key={label}>
                {label}
              </div>
            ))}
            {monthDays.map((day) => {
              if (!day.date) {
                return <button className="monthDay blank" disabled key={day.key} type="button" />;
              }

              if (isAllView) {
                const states = scheduleData.map((item) => getStaffStateForDate(item, day.date));
                const working = states.filter((item) => item.status === "working");
                const timeOff = states.filter((item) => item.status === "time_off");
                const className = working.length && timeOff.length ? "mixed" : working.length ? "working" : timeOff.length ? "timeOff" : "unset";
                return (
                  <button
                    className={`monthDay allStaffDay ${className} ${selectedDate === day.date ? "selected" : ""}`}
                    key={day.key}
                    onClick={() => selectDate(day.date)}
                    type="button"
                  >
                    <strong>{day.dayNumber}</strong>
                    <span className="daySummary">上班 {working.length} 人 / 休假 {timeOff.length} 人</span>
                    <div className="staffPills">
                      {working.slice(0, 4).map((item) => (
                        <span className="staffPill workingPill" key={`working-${item.staff.id}`} style={{ borderColor: item.staff.color }}>
                          {item.staff.name} {item.startMinute != null ? minutesToTime(item.startMinute) : ""}
                        </span>
                      ))}
                      {timeOff.slice(0, 3).map((item) => (
                        <span className="staffPill timeOffPill" key={`off-${item.staff.id}`}>
                          {item.staff.name}休
                        </span>
                      ))}
                      {working.length + timeOff.length > 7 ? <span className="staffPill morePill">+{working.length + timeOff.length - 7}</span> : null}
                    </div>
                  </button>
                );
              }

              const state = getStaffStateForDate(selectedStaff, day.date);
              return (
                <button
                  className={`monthDay ${state.status === "time_off" ? "timeOff" : state.status === "working" ? "working" : "unset"} ${
                    selectedDate === day.date ? "selected" : ""
                  }`}
                  key={day.key}
                  onClick={() => selectDate(day.date)}
                  type="button"
                >
                  <strong>{day.dayNumber}</strong>
                  {state.status === "working" ? (
                    <span>
                      {minutesToTime(state.startMinute ?? 0)}-{minutesToTime(state.endMinute ?? 0)}
                      {state.source === "weekly" ? " 週排" : ""}
                    </span>
                  ) : null}
                  {state.status === "time_off" ? <span>{state.note || "整天休假"}</span> : null}
                  {state.status === "unset" ? <span>未設定</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">{isAllView ? "Day Summary" : "Edit Day"}</p>
            <h2>{selectedDate || "請選擇日期"}</h2>
          </div>

          {!selectedDate ? <div className="emptyState">請點選月曆上的日期。</div> : null}

          {selectedDate && isAllView ? (
            <div className="allStaffDetail">
              {scheduleData.map((item) => {
                const state = getStaffStateForDate(item, selectedDate);
                return (
                  <article className={`staffDayRow ${state.status}`} key={item.id}>
                    <span className="staffColorDot" style={{ background: item.color }} />
                    <div>
                      <strong>{item.name}</strong>
                      <p>
                        {state.status === "working"
                          ? `${minutesToTime(state.startMinute ?? 0)}-${minutesToTime(state.endMinute ?? 0)}${state.source === "weekly" ? "（週排）" : ""}`
                          : state.status === "time_off"
                            ? `休假${state.note ? `：${state.note}` : ""}`
                            : "未設定"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {selectedDate && !isAllView ? (
            <div className="bookingForm">
              <label>
                狀態
                <select disabled={!isAdmin} value={status} onChange={(event) => setStatus(event.target.value as "working" | "time_off")}>
                  <option value="working">上班</option>
                  <option value="time_off">整天休假</option>
                </select>
              </label>
              {status === "working" ? (
                <div className="fieldGrid">
                  <label>
                    上班時間
                    <input disabled={!isAdmin} type="time" value={start} onChange={(event) => setStart(event.target.value)} />
                  </label>
                  <label>
                    下班時間
                    <input disabled={!isAdmin} type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
                  </label>
                </div>
              ) : null}
              <label>
                備註
                <input disabled={!isAdmin} value={note} onChange={(event) => setNote(event.target.value)} placeholder={status === "time_off" ? "休假原因" : "特殊班別備註"} />
              </label>
              {isAdmin ? (
                <button className="primaryButton" onClick={saveDaySchedule} type="button">
                  儲存當日設定
                </button>
              ) : (
                <div className="emptyState compact">你可以查看排班與休假，但不能修改設定。</div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function currentMonthInput() {
  return toDateInput(new Date()).slice(0, 7);
}

function buildMonthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const last = new Date(year, monthNumber, 0);
  const days: Array<{ key: string; date: string; dayNumber: number | "" }> = [];
  for (let index = 0; index < first.getDay(); index += 1) {
    days.push({ key: `blank-${index}`, date: "", dayNumber: "" });
  }
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, monthNumber - 1, day);
    days.push({ key: toDateInput(date), date: toDateInput(date), dayNumber: day });
  }
  return days;
}

function getStaffStateForDate(staff: StaffScheduleData | undefined, date: string): DayStaffState {
  if (!staff) {
    return { staff: emptyStaff(), status: "unset", startMinute: null, endMinute: null, note: null, source: "unset" };
  }

  const monthly = staff.daySchedules.find((item) => toDateInput(new Date(item.date)) === date);
  if (monthly) {
    return {
      staff,
      status: monthly.status,
      startMinute: monthly.startMinute,
      endMinute: monthly.endMinute,
      note: monthly.note,
      source: "monthly",
    };
  }

  const weekly = getWeeklySchedule(staff, date);
  if (weekly) {
    return {
      staff,
      status: "working",
      startMinute: weekly.startMinute,
      endMinute: weekly.endMinute,
      note: null,
      source: "weekly",
    };
  }

  return { staff, status: "unset", startMinute: null, endMinute: null, note: null, source: "unset" };
}

function getWeeklySchedule(staff: StaffScheduleData | undefined, date: string) {
  if (!staff) return null;
  const dayOfWeek = new Date(`${date}T00:00:00+08:00`).getDay();
  return staff.schedules.find((item) => item.dayOfWeek === dayOfWeek) ?? null;
}

function emptyStaff(): StaffScheduleData {
  return {
    id: "",
    name: "",
    color: "#999",
    schedules: [],
    daySchedules: [],
  };
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesToTime(minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}
