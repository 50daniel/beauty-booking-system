"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Service = {
  id: string;
  name: string;
};

type Staff = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  color: string;
  active: boolean;
  services: Service[];
};

const emptyForm = {
  id: "",
  name: "",
  phone: "",
  email: "",
  color: "#177e89",
  active: true,
  serviceIds: [] as string[],
};

export function StaffSettings() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const selectedServiceSet = useMemo(() => new Set(form.serviceIds), [form.serviceIds]);

  const loadData = useCallback(async () => {
    const response = await fetch("/api/admin/staff");
    const data = await response.json();
    setStaff(data.staff ?? []);
    setServices(data.services ?? []);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      color: form.color,
      active: form.active,
      serviceIds: form.serviceIds,
    };
    const response = await fetch(form.id ? `/api/admin/staff/${form.id}` : "/api/admin/staff", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "儲存美容師失敗");
      return;
    }
    setMessage(form.id ? "美容師已更新。" : "美容師已新增。");
    setForm(emptyForm);
    await loadData();
  }

  function edit(item: Staff) {
    setForm({
      id: item.id,
      name: item.name,
      phone: item.phone ?? "",
      email: item.email ?? "",
      color: item.color,
      active: item.active,
      serviceIds: item.services.map((service) => service.id),
    });
  }

  function toggleService(serviceId: string) {
    setForm((current) => ({
      ...current,
      serviceIds: selectedServiceSet.has(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId],
    }));
  }

  return (
    <main className="adminShell">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Staff</p>
          <h1>美容師設定</h1>
          <p>管理美容師資料、啟用狀態與可提供的服務項目。</p>
        </div>
        <div className="headerActions">
          <Link className="textLink" href="/admin">
            後台首頁
          </Link>
          <Link className="textLink secondary" href="/admin/settings/services">
            服務設定
          </Link>
        </div>
      </header>

      {message ? <div className="adminMessage">{message}</div> : null}

      <div className="settingsGrid">
        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">{form.id ? "Edit" : "Create"}</p>
            <h2>{form.id ? "編輯美容師" : "新增美容師"}</h2>
          </div>
          <form className="bookingForm" onSubmit={submit}>
            <label>
              姓名
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              手機
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              顏色
              <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
            </label>
            <label className="checkLabel">
              <input checked={form.active} type="checkbox" onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              啟用
            </label>
            <div>
              <p className="formLabel">可服務項目</p>
              <div className="checkboxGrid">
                {services.map((service) => (
                  <label className="checkLabel" key={service.id}>
                    <input checked={selectedServiceSet.has(service.id)} type="checkbox" onChange={() => toggleService(service.id)} />
                    {service.name}
                  </label>
                ))}
              </div>
            </div>
            <button className="primaryButton" type="submit">
              {form.id ? "儲存美容師" : "新增美容師"}
            </button>
            {form.id ? (
              <button className="ghostButton" onClick={() => setForm(emptyForm)} type="button">
                取消編輯
              </button>
            ) : null}
          </form>
        </section>

        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">List</p>
            <h2>美容師列表</h2>
          </div>
          <div className="adminList">
            {staff.map((item) => (
              <article className="adminCard" key={item.id}>
                <span className={`statusBadge ${item.active ? "confirmed" : "cancelled"}`}>{item.active ? "啟用" : "停用"}</span>
                <h3>{item.name}</h3>
                <p>
                  {item.phone || "未填手機"}
                  {item.email ? ` / ${item.email}` : ""}
                </p>
                <p>可服務：{item.services.length ? item.services.map((service) => service.name).join("、") : "尚未指定"}</p>
                <button className="primaryButton" onClick={() => edit(item)} type="button">
                  編輯
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
