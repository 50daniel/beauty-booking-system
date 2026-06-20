"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "登入失敗");
      setLoading(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="loginShell">
      <section className="panel loginPanel">
        <p className="eyebrow">Admin Login</p>
        <h1>後台登入</h1>
        <p>只有管理員與美容師可以登入後台。管理設定功能僅管理員可使用。</p>
        <form className="bookingForm" onSubmit={submit}>
          <label>
            Email
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            密碼
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          <button className="primaryButton" disabled={loading} type="submit">
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
        {message ? <div className="formMessage error">{message}</div> : null}
        <div className="loginHint">
          <strong>測試帳號</strong>
          <p>管理員：admin@example.com / admin1234</p>
          <p>美容師：lin@example.com / staff1234</p>
        </div>
      </section>
    </main>
  );
}
