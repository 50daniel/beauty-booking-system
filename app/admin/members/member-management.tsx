"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  price: number;
};

type Member = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  allergyNote: string | null;
  note: string | null;
  internalNote: string | null;
  appointmentCount: number;
  courseBalances: Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    totalSessions: number;
    usedSessions: number;
    reservedSessions: number;
    availableSessions: number;
    expiresAt: string | null;
    note: string | null;
  }>;
  walletBalance: number;
  walletTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    note: string | null;
    createdAt: string;
  }>;
};

const emptyForm = {
  id: "",
  name: "",
  phone: "",
  email: "",
  birthday: "",
  allergyNote: "",
  note: "",
  internalNote: "",
};

export function MemberManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [courseTarget, setCourseTarget] = useState<Member | null>(null);
  const [walletTarget, setWalletTarget] = useState<Member | null>(null);

  const loadMembers = useCallback(async () => {
    const url = query.trim() ? `/api/admin/members?q=${encodeURIComponent(query.trim())}` : "/api/admin/members";
    const response = await fetch(url);
    const data = await response.json();
    setMembers(data.members ?? []);
  }, [query]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    fetch("/api/services")
      .then((response) => response.json())
      .then((data) => setServices(data.services ?? []));
  }, []);

  function edit(member: Member) {
    setForm({
      id: member.id,
      name: member.name,
      phone: member.phone,
      email: member.email ?? "",
      birthday: member.birthday ? member.birthday.slice(0, 10) : "",
      allergyNote: member.allergyNote ?? "",
      note: member.note ?? "",
      internalNote: member.internalNote ?? "",
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const url = form.id ? `/api/admin/members/${form.id}` : "/api/admin/members";
    const method = form.id ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "會員資料儲存失敗。");
      return;
    }
    setMessage(form.id ? "會員資料已更新。" : "會員已建立，初始密碼為手機號碼後 4 碼。");
    setForm(emptyForm);
    await loadMembers();
  }

  async function addCourse(input: { serviceId: string; sessions: number; expiresAt: string; note: string }) {
    if (!courseTarget) return;
    const response = await fetch(`/api/admin/members/${courseTarget.id}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "新增療程堂數失敗。");
      return;
    }
    setMessage("療程堂數已新增。");
    setCourseTarget(null);
    await loadMembers();
  }

  async function addWallet(input: { amount: number; note: string }) {
    if (!walletTarget) return;
    const response = await fetch(`/api/admin/members/${walletTarget.id}/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "新增儲值金失敗。");
      return;
    }
    setMessage("儲值金紀錄已新增。");
    setWalletTarget(null);
    await loadMembers();
  }

  return (
    <main className="adminShell">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Members</p>
          <h1>會員管理</h1>
          <p>建立會員、管理已購療程堂數與儲值金。會員初始密碼為手機號碼後 4 碼。</p>
        </div>
        <div className="headerActions">
          <Link className="textLink" href="/admin">
            回後台
          </Link>
          <Link className="textLink secondary" href="/booking">
            會員預約
          </Link>
        </div>
      </header>

      {message ? <div className="adminMessage">{message}</div> : null}

      <div className="settingsGrid">
        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">{form.id ? "Edit" : "Create"}</p>
            <h2>{form.id ? "編輯會員" : "建立會員"}</h2>
          </div>
          <form className="bookingForm" onSubmit={submit}>
            <label>
              姓名
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              手機
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              生日
              <input type="date" value={form.birthday} onChange={(event) => setForm({ ...form, birthday: event.target.value })} />
            </label>
            <label>
              過敏 / 注意事項
              <textarea rows={3} value={form.allergyNote} onChange={(event) => setForm({ ...form, allergyNote: event.target.value })} />
            </label>
            <label>
              會員備註
              <textarea rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </label>
            <label>
              內部備註
              <textarea rows={3} value={form.internalNote} onChange={(event) => setForm({ ...form, internalNote: event.target.value })} />
            </label>
            <button className="primaryButton" type="submit">
              {form.id ? "更新會員" : "建立會員"}
            </button>
            {form.id ? (
              <button className="ghostButton" onClick={() => setForm(emptyForm)} type="button">
                改為建立新會員
              </button>
            ) : null}
          </form>
        </section>

        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">List</p>
            <h2>會員列表</h2>
          </div>
          <div className="searchRow">
            <input placeholder="搜尋姓名、手機或 Email" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="adminList spaceTop">
            {members.map((member) => (
              <article className="memberCard" key={member.id}>
                <div>
                  <h3>{member.name}</h3>
                  <p>
                    {member.phone}
                    {member.email ? ` / ${member.email}` : ""}
                  </p>
                  {member.allergyNote ? <p>注意事項：{member.allergyNote}</p> : null}
                  <div className="purchaseBlock">
                    <strong>療程堂數</strong>
                    {member.courseBalances.length === 0 ? <p>尚未新增已購療程。</p> : null}
                    {member.courseBalances.map((balance) => (
                      <p key={balance.id}>
                        {balance.serviceName}：可用 {balance.availableSessions} 堂 / 已用 {balance.usedSessions} / 保留{" "}
                        {balance.reservedSessions}
                        {balance.expiresAt ? ` / 到期 ${formatDate(balance.expiresAt)}` : ""}
                      </p>
                    ))}
                  </div>
                  <div className="purchaseBlock">
                    <strong>儲值金</strong>
                    <p>目前餘額：NT${member.walletBalance.toLocaleString("zh-TW")}</p>
                    {member.walletTransactions.slice(0, 4).map((transaction) => (
                      <p key={transaction.id}>
                        {formatDate(transaction.createdAt)} / {transaction.type} / NT$
                        {transaction.amount.toLocaleString("zh-TW")}
                        {transaction.note ? ` / ${transaction.note}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="memberActions">
                  <span>{member.appointmentCount} 筆預約</span>
                  <button className="primaryButton compact" onClick={() => edit(member)} type="button">
                    編輯
                  </button>
                  <button className="primaryButton compact" onClick={() => setCourseTarget(member)} type="button">
                    新增堂數
                  </button>
                  <button className="primaryButton compact" onClick={() => setWalletTarget(member)} type="button">
                    新增儲值
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <CourseModal
        memberName={courseTarget?.name ?? ""}
        onClose={() => setCourseTarget(null)}
        onSubmit={addCourse}
        open={Boolean(courseTarget)}
        services={services}
      />
      <WalletModal
        memberName={walletTarget?.name ?? ""}
        onClose={() => setWalletTarget(null)}
        onSubmit={addWallet}
        open={Boolean(walletTarget)}
      />
    </main>
  );
}

function CourseModal({
  memberName,
  open,
  services,
  onClose,
  onSubmit,
}: {
  memberName: string;
  open: boolean;
  services: Service[];
  onClose: () => void;
  onSubmit: (input: { serviceId: string; sessions: number; expiresAt: string; note: string }) => Promise<void>;
}) {
  const [serviceId, setServiceId] = useState("");
  const [sessions, setSessions] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setServiceId(services[0]?.id ?? "");
      setSessions("1");
      setExpiresAt("");
      setNote("");
    }
  }, [open, services]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      serviceId,
      sessions: Number(sessions),
      expiresAt,
      note,
    });
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section aria-modal="true" className="adminModal" role="dialog">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Course</p>
            <h2>新增療程堂數</h2>
          </div>
          <button aria-label="關閉" className="iconButton" onClick={onClose} type="button">
            x
          </button>
        </div>
        <p className="modalDescription">會員：{memberName}</p>
        <form className="bookingForm" onSubmit={submit}>
          <label>
            療程
            <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} / NT${service.price.toLocaleString("zh-TW")}
                </option>
              ))}
            </select>
          </label>
          <div className="fieldGrid">
            <label>
              堂數
              <input min="1" type="number" value={sessions} onChange={(event) => setSessions(event.target.value)} />
            </label>
            <label>
              期限
              <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </label>
          </div>
          <label>
            備註
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="modalActions">
            <button className="ghostButton" onClick={onClose} type="button">
              取消
            </button>
            <button className="primaryButton" type="submit">
              新增
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function WalletModal({
  memberName,
  open,
  onClose,
  onSubmit,
}: {
  memberName: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { amount: number; note: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("1000");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("1000");
      setNote("");
    }
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ amount: Number(amount), note });
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section aria-modal="true" className="adminModal" role="dialog">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Wallet</p>
            <h2>新增儲值金</h2>
          </div>
          <button aria-label="關閉" className="iconButton" onClick={onClose} type="button">
            x
          </button>
        </div>
        <p className="modalDescription">會員：{memberName}</p>
        <form className="bookingForm" onSubmit={submit}>
          <label>
            金額
            <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label>
            備註
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="modalActions">
            <button className="ghostButton" onClick={onClose} type="button">
              取消
            </button>
            <button className="primaryButton" type="submit">
              新增
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
