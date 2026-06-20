"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  color: string;
  active: boolean;
  staff: Array<{ id: string; name: string }>;
};

const emptyForm = {
  id: "",
  name: "",
  category: "臉部保養",
  description: "",
  price: 0,
  durationMinutes: 60,
  bufferMinutes: 15,
  color: "#177e89",
  active: true,
};

export function ServiceSettings() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const loadServices = useCallback(async () => {
    const response = await fetch("/api/admin/services");
    const data = await response.json();
    setServices(data.services ?? []);
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      category: form.category,
      description: form.description,
      price: Number(form.price),
      durationMinutes: Number(form.durationMinutes),
      bufferMinutes: Number(form.bufferMinutes),
      color: form.color,
      active: form.active,
    };
    const response = await fetch(form.id ? `/api/admin/services/${form.id}` : "/api/admin/services", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "儲存服務失敗");
      return;
    }
    setMessage(form.id ? "服務已更新。" : "服務已新增。");
    setForm(emptyForm);
    await loadServices();
  }

  function edit(service: Service) {
    setForm({
      id: service.id,
      name: service.name,
      category: service.category,
      description: service.description ?? "",
      price: service.price,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      color: service.color,
      active: service.active,
    });
  }

  return (
    <main className="adminShell">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Services</p>
          <h1>服務項目設定</h1>
          <p>管理服務名稱、分類、價格、服務時間、緩衝時間與啟用狀態。</p>
        </div>
        <div className="headerActions">
          <Link className="textLink" href="/admin">
            後台首頁
          </Link>
          <Link className="textLink secondary" href="/admin/settings/staff">
            美容師設定
          </Link>
        </div>
      </header>

      {message ? <div className="adminMessage">{message}</div> : null}

      <div className="settingsGrid">
        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">{form.id ? "Edit" : "Create"}</p>
            <h2>{form.id ? "編輯服務" : "新增服務"}</h2>
          </div>
          <form className="bookingForm" onSubmit={submit}>
            <label>
              服務名稱
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              分類
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
            </label>
            <label>
              說明
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
            </label>
            <div className="fieldGrid">
              <label>
                價格
                <input min={0} type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} />
              </label>
              <label>
                顏色
                <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
              </label>
            </div>
            <div className="fieldGrid">
              <label>
                服務分鐘
                <input min={15} step={5} type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} />
              </label>
              <label>
                緩衝分鐘
                <input min={0} step={5} type="number" value={form.bufferMinutes} onChange={(event) => setForm({ ...form, bufferMinutes: Number(event.target.value) })} />
              </label>
            </div>
            <label className="checkLabel">
              <input checked={form.active} type="checkbox" onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              啟用
            </label>
            <button className="primaryButton" type="submit">
              {form.id ? "儲存服務" : "新增服務"}
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
            <h2>服務列表</h2>
          </div>
          <div className="adminList">
            {services.map((service) => (
              <article className="adminCard" key={service.id}>
                <span className={`statusBadge ${service.active ? "confirmed" : "cancelled"}`}>{service.active ? "啟用" : "停用"}</span>
                <h3>{service.name}</h3>
                <p>
                  {service.category} / NT${service.price.toLocaleString("zh-TW")} / {service.durationMinutes} 分鐘 / 緩衝 {service.bufferMinutes} 分鐘
                </p>
                <p>可服務美容師：{service.staff.length ? service.staff.map((item) => item.name).join("、") : "尚未指定"}</p>
                <button className="primaryButton" onClick={() => edit(service)} type="button">
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
