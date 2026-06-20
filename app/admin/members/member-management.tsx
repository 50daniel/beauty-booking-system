"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PurchaseModal } from "../admin-modals";

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
  latestAppointments: Array<{
    id: string;
    status: string;
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
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [purchaseTarget, setPurchaseTarget] = useState<Member | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    const url = query.trim() ? `/api/admin/members?q=${encodeURIComponent(query.trim())}` : "/api/admin/members";
    const response = await fetch(url);
    const data = await response.json();
    setMembers(data.members ?? []);
  }, [query]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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
    if (!form.id) {
      setMessage("請先從右側選擇會員。");
      return;
    }
    const response = await fetch(`/api/admin/members/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "會員資料儲存失敗");
      return;
    }
    setMessage("會員資料已更新。");
    setForm(emptyForm);
    await loadMembers();
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
    await loadMembers();
  }

  return (
    <main className="adminShell">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Members</p>
          <h1>會員管理</h1>
          <p>集中管理會員基本資料、過敏禁忌、內部備註、預約紀錄與購買紀錄。</p>
        </div>
        <div className="headerActions">
          <Link className="textLink" href="/admin">
            後台首頁
          </Link>
          <Link className="textLink secondary" href="/booking">
            前台預約
          </Link>
        </div>
      </header>

      {message ? <div className="adminMessage">{message}</div> : null}

      <div className="settingsGrid">
        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">Edit</p>
            <h2>{form.id ? "編輯會員" : "請選擇會員"}</h2>
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
              過敏 / 禁忌
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
              儲存會員
            </button>
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
                  {member.allergyNote ? <p>過敏/禁忌：{member.allergyNote}</p> : null}
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
                  <button className="primaryButton compact" onClick={() => edit(member)} type="button">
                    編輯
                  </button>
                  <button className="primaryButton compact" onClick={() => setPurchaseTarget(member)} type="button">
                    新增購買
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
