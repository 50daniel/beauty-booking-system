"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PurchaseModal, RejectAppointmentModal } from "./admin-modals";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rejected" | "no_show";

type Appointment = {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  customerNote: string | null;
  rejectionReason: string | null;
  member: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    allergyNote: string | null;
    note: string | null;
  };
  staff: {
    id: string;
    name: string;
    color: string;
  };
  service: {
    id: string;
    name: string;
    category: string;
    color: string;
    price: number;
    durationMinutes: number;
  };
};

type Member = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  allergyNote: string | null;
  note: string | null;
  internalNote: string | null;
  appointmentCount: number;
  latestAppointments: Array<{
    id: string;
    status: AppointmentStatus;
    startAt: string;
    serviceName: string;
    staffName: string;
  }>;
  purchases: Array<{
    id: string;
    itemName: string;
    amount: number;
    purchasedAt: string;
    note: string | null;
  }>;
};

type AdminDashboardProps = {
  today: string;
  currentUser: {
    name: string;
    email: string;
    role: "admin" | "staff";
  };
  initialMetrics: {
    pending: number;
    confirmedToday: number;
    members: number;
  };
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "待確認",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
  rejected: "已拒絕",
  no_show: "未到",
};

export function AdminDashboard({ today, currentUser, initialMetrics }: AdminDashboardProps) {
  const [pending, setPending] = useState<Appointment[]>([]);
  const [confirmed, setConfirmed] = useState<Appointment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Appointment | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<Member | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const metrics = useMemo(
    () => [
      { label: "待確認申請", value: pending.length || initialMetrics.pending },
      { label: "今日已確認", value: confirmed.length || initialMetrics.confirmedToday },
      { label: "會員數", value: members.length || initialMetrics.members },
    ],
    [confirmed.length, initialMetrics.confirmedToday, initialMetrics.members, initialMetrics.pending, members.length, pending.length],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pendingRes, confirmedRes, membersRes] = await Promise.all([
      fetch("/api/admin/appointments?status=pending"),
      fetch(`/api/admin/appointments?status=confirmed&date=${today}`),
      fetch("/api/admin/members"),
    ]);
    const [pendingData, confirmedData, membersData] = await Promise.all([
      pendingRes.json(),
      confirmedRes.json(),
      membersRes.json(),
    ]);
    setPending(pendingData.appointments ?? []);
    setConfirmed(confirmedData.appointments ?? []);
    setMembers(membersData.members ?? []);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function confirmAppointment(id: string) {
    setMessage("正在確認預約...");
    const response = await fetch(`/api/admin/appointments/${id}/confirm`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "確認失敗");
      return;
    }
    setMessage("預約已確認，已正式進入日曆資料。");
    await loadData();
  }

  async function rejectAppointment(appointment: Appointment, reason: string) {
    setModalSubmitting(true);
    setMessage("正在拒絕預約...");
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
    setMessage("預約已拒絕，並保存拒絕原因。");
    setRejectTarget(null);
    setModalSubmitting(false);
    await loadData();
  }

  async function updateStatus(id: string, status: "completed" | "cancelled" | "no_show") {
    setMessage("正在更新預約狀態...");
    const response = await fetch(`/api/admin/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "更新失敗");
      return;
    }
    setMessage(`預約已更新為「${statusLabels[status]}」。`);
    await loadData();
  }

  async function addPurchase(member: Member, input: { itemName: string; amount: number; purchasedAt: string; note: string }) {
    setModalSubmitting(true);
    const response = await fetch(`/api/admin/members/${member.id}/purchases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "新增購買紀錄失敗");
      setModalSubmitting(false);
      return;
    }
    setMessage("購買紀錄已新增。");
    setPurchaseTarget(null);
    setModalSubmitting(false);
    await loadData();
  }

  return (
    <main className="adminShell">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>後台管理</h1>
          <p>
            {currentUser.name}（{currentUser.role === "admin" ? "管理員" : "美容師"}）已登入。美容師可處理預約，管理員可進入系統設定。
          </p>
        </div>
        <Link className="textLink" href="/booking">
          前台預約
        </Link>
        <Link className="textLink secondary" href="/admin/calendar">
          正式日曆
        </Link>
        <Link className="textLink secondary" href="/admin/members">
          會員管理
        </Link>
        <Link className="textLink secondary" href="/admin/schedules">
          排班/休假
        </Link>
        {currentUser.role === "admin" ? (
          <>
            <Link className="textLink secondary" href="/admin/settings/services">
              服務設定
            </Link>
            <Link className="textLink secondary" href="/admin/settings/staff">
              美容師設定
            </Link>
          </>
        ) : null}
        <button className="ghostButton" onClick={logout} type="button">
          登出
        </button>
      </header>

      <section className="metricGrid">
        {metrics.map((item) => (
          <article className="metricCard" key={item.label}>
            <strong>{loading ? "..." : item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </section>

      {message ? <div className="adminMessage">{message}</div> : null}

      <div className="adminGrid">
        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">Review</p>
            <h2>待確認申請</h2>
          </div>
          <div className="adminList">
            {pending.length === 0 ? <div className="emptyState">目前沒有待確認申請</div> : null}
            {pending.map((appointment) => (
              <article className="adminCard" key={appointment.id}>
                <AppointmentSummary appointment={appointment} />
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
        </section>

        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">Today</p>
            <h2>今日已確認預約</h2>
          </div>
          <div className="adminList">
            {confirmed.length === 0 ? <div className="emptyState">今日沒有已確認預約</div> : null}
            {confirmed.map((appointment) => (
              <article className="adminCard" key={appointment.id}>
                <AppointmentSummary appointment={appointment} />
                <div className="buttonRow three">
                  <button className="primaryButton" onClick={() => updateStatus(appointment.id, "completed")} type="button">
                    完成
                  </button>
                  <button className="warningButton" onClick={() => updateStatus(appointment.id, "no_show")} type="button">
                    未到
                  </button>
                  <button className="dangerButton" onClick={() => updateStatus(appointment.id, "cancelled")} type="button">
                    取消
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel memberPanel">
          <div className="sectionHeading">
            <p className="eyebrow">Members</p>
            <h2>會員資料</h2>
          </div>
          <div className="memberList">
            {members.length === 0 ? <div className="emptyState">尚無會員資料</div> : null}
            {members.map((member) => (
              <article className="memberCard" key={member.id}>
                <div>
                  <h3>{member.name}</h3>
                  <p>{member.phone}{member.email ? ` / ${member.email}` : ""}</p>
                  {member.allergyNote ? <p>過敏/禁忌：{member.allergyNote}</p> : null}
                  {member.note ? <p>備註：{member.note}</p> : null}
                  <div className="purchaseBlock">
                    <strong>購買紀錄</strong>
                    {member.purchases.length === 0 ? <p>尚無購買紀錄</p> : null}
                    {member.purchases.map((purchase) => (
                      <p key={purchase.id}>
                        {formatDate(purchase.purchasedAt)} / {purchase.itemName} / NT$
                        {purchase.amount.toLocaleString("zh-TW")}
                        {purchase.note ? ` / ${purchase.note}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="memberActions">
                  <span>{member.appointmentCount} 筆近期預約</span>
                  <button className="primaryButton compact" onClick={() => setPurchaseTarget(member)} type="button">
                    新增購買
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
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
      <PurchaseModal
        memberName={purchaseTarget?.name ?? ""}
        onClose={() => setPurchaseTarget(null)}
        onSubmit={(input) => {
          if (!purchaseTarget) return;
          return addPurchase(purchaseTarget, input);
        }}
        open={Boolean(purchaseTarget)}
        submitting={modalSubmitting}
      />
    </main>
  );
}

async function logout() {
  await fetch("/api/admin/auth/logout", { method: "POST" });
  window.location.href = "/admin/login";
}

function AppointmentSummary({ appointment }: { appointment: Appointment }) {
  return (
    <div className="appointmentSummary">
      <span className={`statusBadge ${appointment.status}`}>{statusLabels[appointment.status]}</span>
      <h3>
        {formatDateTime(appointment.startAt)} / {appointment.member.name}
      </h3>
      <p>
        {appointment.service.name} / {appointment.staff.name} / {appointment.member.phone}
      </p>
      {appointment.member.allergyNote ? <p>過敏/禁忌：{appointment.member.allergyNote}</p> : null}
      {appointment.customerNote ? <p>預約備註：{appointment.customerNote}</p> : null}
    </div>
  );
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
