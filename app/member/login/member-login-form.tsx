"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function MemberLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/member/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: String(formData.get("phone") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "登入失敗，請再試一次。");
      return;
    }

    router.push("/booking");
    router.refresh();
  }

  return (
    <form className="bookingForm" onSubmit={submit}>
      <label>
        手機號碼
        <input autoComplete="tel" name="phone" required type="tel" />
      </label>
      <label>
        密碼
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      {message ? <div className="formMessage error">{message}</div> : null}
      <button className="primaryButton" disabled={loading} type="submit">
        {loading ? "登入中..." : "登入並預約"}
      </button>
    </form>
  );
}
