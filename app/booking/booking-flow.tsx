"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  color: string;
};

type Staff = {
  id: string;
  name: string;
  color: string;
};

type Slot = {
  startMinute: number;
  endMinute: number;
  label: string;
};

type CourseBalance = {
  id: string;
  serviceId: string;
  serviceName: string;
  availableSessions: number;
  expiresAt: Date | string | null;
};

type BookingFlowProps = {
  initialMember: {
    id: string;
    name: string;
    phone: string;
  };
  initialServices: Service[];
  courseBalances: CourseBalance[];
  walletBalance: number;
  today: string;
};

type PaymentMethod = "course" | "wallet";

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string; appointmentId: string }
  | { status: "error"; message: string };

export function BookingFlow({
  initialMember,
  initialServices,
  courseBalances,
  walletBalance,
  today,
}: BookingFlowProps) {
  const resultRef = useRef<HTMLDivElement>(null);
  const [serviceId, setServiceId] = useState(initialServices[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("course");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });

  const selectedService = useMemo(
    () => initialServices.find((service) => service.id === serviceId),
    [initialServices, serviceId],
  );
  const selectedStaff = useMemo(() => staff.find((item) => item.id === staffId), [staff, staffId]);
  const selectedBalance = useMemo(
    () => courseBalances.find((balance) => balance.serviceId === serviceId),
    [courseBalances, serviceId],
  );
  const canUseCourse = Boolean(selectedBalance && selectedBalance.availableSessions > 0);
  const canUseWallet = Boolean(selectedService && walletBalance >= selectedService.price);

  useEffect(() => {
    if (!serviceId) return;
    setLoadingStaff(true);
    setStaff([]);
    setStaffId("");
    setSelectedSlot(null);

    fetch(`/api/staff?serviceId=${serviceId}`)
      .then((response) => response.json())
      .then((data: { staff: Staff[] }) => {
        setStaff(data.staff);
        setStaffId(data.staff[0]?.id ?? "");
      })
      .finally(() => setLoadingStaff(false));
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId || !staffId || !date) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);

    fetch(`/api/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`)
      .then((response) => response.json())
      .then((data: { slots: Slot[] }) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, staffId, date]);

  useEffect(() => {
    if (paymentMethod === "course" && !canUseCourse && canUseWallet) {
      setPaymentMethod("wallet");
    }
  }, [canUseCourse, canUseWallet, paymentMethod]);

  async function logout() {
    await fetch("/api/member/auth/logout", { method: "POST" });
    window.location.href = "/member/login";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot || !selectedService || !selectedStaff) {
      setSubmitState({ status: "error", message: "請先選擇療程、老師與預約時間。" });
      return;
    }
    if (paymentMethod === "course" && !canUseCourse) {
      setSubmitState({ status: "error", message: "這個療程沒有可使用的剩餘堂數。" });
      return;
    }
    if (paymentMethod === "wallet" && !canUseWallet) {
      setSubmitState({ status: "error", message: "儲值金不足，無法使用儲值金預約這個療程。" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    setSubmitState({ status: "loading", message: "正在送出預約..." });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25000);
    let response: Response;
    let data: Awaited<ReturnType<typeof readJsonResponse>>;

    try {
      response = await fetch("/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          serviceId,
          staffId,
          date,
          startMinute: selectedSlot.startMinute,
          paymentMethod,
          customerNote: getFormValue(formData, "customerNote"),
        }),
      });
      data = await readJsonResponse(response);
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof DOMException && error.name === "AbortError"
            ? "預約送出時間較久，後台可能已收到預約。請先不要重複送出，請刷新頁面或聯絡店家確認。"
            : "預約送出時連線中斷，後台可能已收到預約。請先不要重複送出，請刷新頁面或聯絡店家確認。",
      });
      return;
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (!response.ok) {
      setSubmitState({ status: "error", message: data?.error ?? "預約送出失敗，請稍後再試。" });
      return;
    }

    event.currentTarget.reset();
    setSubmitState({
      status: "success",
      appointmentId: data?.appointment?.id ?? "",
      message: `已送出 ${data?.appointment?.serviceName ?? selectedService.name} 預約，等待店家確認。`,
    });
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <main className="bookingShell">
      <header className="bookingHeader">
        <div>
          <p className="eyebrow">Online Reservation</p>
          <h1>會員預約</h1>
          <p>
            {initialMember.name}，請選擇療程、老師與時間。預約成立後會先保留堂數或儲值金，完成服務後才正式扣除。
          </p>
        </div>
        <div className="headerActions">
          <button className="ghostButton" onClick={logout} type="button">
            登出
          </button>
          <Link className="textLink" href="/">
            回首頁
          </Link>
        </div>
      </header>

      <div className="bookingGrid">
        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">Step 1</p>
            <h2>選擇療程</h2>
          </div>
          <div className="servicePicker">
            {initialServices.map((service) => {
              const balance = courseBalances.find((item) => item.serviceId === service.id);
              return (
                <button
                  className={`selectCard ${service.id === serviceId ? "isActive" : ""}`}
                  key={service.id}
                  onClick={() => setServiceId(service.id)}
                  type="button"
                >
                  <span className="colorDot" style={{ background: service.color }} />
                  <strong>{service.name}</strong>
                  <span>
                    {service.category} / {service.durationMinutes} 分鐘 / NT${service.price.toLocaleString("zh-TW")}
                  </span>
                  <span>剩餘堂數：{balance?.availableSessions ?? 0}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">Step 2</p>
            <h2>選擇老師與時間</h2>
          </div>
          <div className="fieldGrid">
            <label>
              老師
              <select disabled={loadingStaff || !staff.length} value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                {staff.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              日期
              <input min={today} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>

          <div className="slotPanel">
            {loadingSlots ? <div className="emptyState">讀取可預約時間...</div> : null}
            {!loadingSlots && slots.length === 0 ? <div className="emptyState">這一天目前沒有可預約時段。</div> : null}
            {!loadingSlots && slots.length > 0 ? (
              <div className="slotGrid">
                {slots.map((slot) => (
                  <button
                    className={`slotButton ${selectedSlot?.startMinute === slot.startMinute ? "isActive" : ""}`}
                    key={slot.startMinute}
                    onClick={() => setSelectedSlot(slot)}
                    type="button"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel requestPanel">
          <div className="sectionHeading">
            <p className="eyebrow">Step 3</p>
            <h2>付款方式</h2>
          </div>
          <div className="selectedSummary">
            {selectedService && selectedStaff && selectedSlot ? (
              <>
                <strong>{selectedService.name}</strong>
                <span>
                  {date} {selectedSlot.label} / {selectedStaff.name}
                </span>
              </>
            ) : (
              <span>請先選擇療程、老師與時間。</span>
            )}
          </div>

          <div className="paymentOptions">
            <label className={`selectCard ${paymentMethod === "course" ? "isActive" : ""}`}>
              <input
                checked={paymentMethod === "course"}
                disabled={!canUseCourse}
                name="paymentMethod"
                onChange={() => setPaymentMethod("course")}
                type="radio"
              />
              <strong>使用已購療程</strong>
              <span>此療程剩餘 {selectedBalance?.availableSessions ?? 0} 堂</span>
            </label>
            <label className={`selectCard ${paymentMethod === "wallet" ? "isActive" : ""}`}>
              <input
                checked={paymentMethod === "wallet"}
                disabled={!canUseWallet}
                name="paymentMethod"
                onChange={() => setPaymentMethod("wallet")}
                type="radio"
              />
              <strong>使用儲值金</strong>
              <span>
                餘額 NT${walletBalance.toLocaleString("zh-TW")}
                {selectedService ? ` / 本次 NT${selectedService.price.toLocaleString("zh-TW")}` : ""}
              </span>
            </label>
          </div>

          <div ref={resultRef}>
            {submitState.message ? (
              <div className={`formMessage ${submitState.status}`} role={submitState.status === "error" ? "alert" : "status"}>
                <strong>{submitState.status === "success" ? "預約已送出" : submitState.status === "error" ? "無法預約" : "處理中"}</strong>
                <span>{submitState.message}</span>
                {submitState.status === "success" ? <small>預約編號：{submitState.appointmentId}</small> : null}
              </div>
            ) : null}
          </div>

          <form className="bookingForm" onSubmit={handleSubmit}>
            <label>
              備註
              <textarea name="customerNote" rows={4} />
            </label>
            <button className="primaryButton" disabled={submitState.status === "loading"} type="submit">
              送出預約
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
