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

type BookingFlowProps = {
  initialServices: Service[];
  today: string;
};

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string; appointmentId: string }
  | { status: "error"; message: string };

export function BookingFlow({ initialServices, today }: BookingFlowProps) {
  const resultRef = useRef<HTMLDivElement>(null);
  const [serviceId, setServiceId] = useState(initialServices[0]?.id ?? "");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!selectedSlot || !selectedService || !selectedStaff) {
      setSubmitState({ status: "error", message: "請先選擇服務、美容師與預約時段。" });
      return;
    }

    const formData = new FormData(form);
    const member = {
      name: getFormValue(formData, "name"),
      phone: getFormValue(formData, "phone"),
      email: getFormValue(formData, "email"),
      birthday: getFormValue(formData, "birthday"),
      allergyNote: getFormValue(formData, "allergyNote"),
      note: getFormValue(formData, "memberNote"),
    };
    setSubmitState({ status: "loading", message: "正在送出預約申請..." });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);
    let data: Awaited<ReturnType<typeof readJsonResponse>>;

    try {
      const response = await fetch("/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          serviceId,
          staffId,
          date,
          startMinute: selectedSlot.startMinute,
          member,
          customerNote: getFormValue(formData, "customerNote"),
        }),
      });

      data = await readJsonResponse(response);
      if (!response.ok) {
        setSubmitState({ status: "error", message: data?.error ?? "預約申請失敗，請稍後再試。" });
        return;
      }
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof DOMException && error.name === "AbortError"
            ? "送出等待時間過長，請到後台確認是否已有建立資料，或稍後再試。"
            : "預約申請送出時發生連線問題，請稍後再試。",
      });
      return;
    } finally {
      window.clearTimeout(timeoutId);
    }

    form.reset();
    setSubmitState({
      status: "success",
      appointmentId: data?.appointment?.id ?? "已建立",
      message: `預約申請已送出：${data?.appointment?.serviceName ?? selectedService.name} / ${
        data?.appointment?.staffName ?? selectedStaff.name
      }。美容師確認後才會正式成立。`,
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
          <h1>線上預約申請</h1>
          <p>選擇服務、美容師與可預約時段。送出後會先進入待確認，美容師確認後才會正式排入日曆。</p>
        </div>
        <Link className="textLink" href="/">
          回首頁
        </Link>
      </header>

      <div className="bookingGrid">
        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">Step 1</p>
            <h2>選擇服務</h2>
          </div>
          <div className="servicePicker">
            {initialServices.map((service) => (
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
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="sectionHeading">
            <p className="eyebrow">Step 2</p>
            <h2>選擇美容師與日期</h2>
          </div>
          <div className="fieldGrid">
            <label>
              美容師
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
            {loadingSlots ? <div className="emptyState">讀取可預約時段...</div> : null}
            {!loadingSlots && slots.length === 0 ? <div className="emptyState">這天沒有可預約空檔</div> : null}
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
            <h2>會員資料與備註</h2>
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
              <span>尚未選擇完整預約資訊</span>
            )}
          </div>

          <div ref={resultRef}>
            {submitState.message ? (
              <div className={`formMessage ${submitState.status}`} role={submitState.status === "error" ? "alert" : "status"}>
                <strong>{submitState.status === "success" ? "預約申請送出成功" : submitState.status === "error" ? "預約申請未送出" : "處理中"}</strong>
                <span>{submitState.message}</span>
                {submitState.status === "success" ? <small>申請編號：{submitState.appointmentId}</small> : null}
              </div>
            ) : null}
          </div>

          <form className="bookingForm" onSubmit={handleSubmit}>
            <label>
              姓名 <span className="requiredMark" aria-label="必填">*</span>
              <input name="name" required type="text" />
            </label>
            <label>
              手機 <span className="requiredMark" aria-label="必填">*</span>
              <input name="phone" required type="tel" />
            </label>
            <label>
              Email
              <input name="email" type="email" />
            </label>
            <label>
              生日
              <input name="birthday" type="date" />
            </label>
            <label>
              過敏 / 禁忌
              <textarea name="allergyNote" rows={3} />
            </label>
            <label>
              會員備註
              <textarea name="memberNote" rows={3} />
            </label>
            <label>
              本次預約備註
              <textarea name="customerNote" rows={3} />
            </label>
            <p className="formHint">標示 * 的欄位為必填，其餘可留空。</p>
            <button className="primaryButton" disabled={submitState.status === "loading"} type="submit">
              送出預約申請
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
