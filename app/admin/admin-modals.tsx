"use client";

import { FormEvent, useEffect, useState } from "react";

type RejectAppointmentModalProps = {
  appointmentLabel: string;
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
};

type PurchaseModalProps = {
  memberName: string;
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { itemName: string; amount: number; purchasedAt: string; note: string }) => void | Promise<void>;
};

export function RejectAppointmentModal({
  appointmentLabel,
  open,
  submitting = false,
  onClose,
  onSubmit,
}: RejectAppointmentModalProps) {
  const [reason, setReason] = useState("時段無法安排");

  useEffect(() => {
    if (open) setReason("時段無法安排");
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    await onSubmit(trimmedReason);
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section aria-modal="true" className="adminModal" role="dialog">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Reject</p>
            <h2>拒絕預約申請</h2>
          </div>
          <button aria-label="關閉" className="iconButton" disabled={submitting} onClick={onClose} type="button">
            x
          </button>
        </div>
        <p className="modalDescription">{appointmentLabel}</p>
        <form className="bookingForm" onSubmit={submit}>
          <label>
            拒絕原因
            <textarea autoFocus rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="modalActions">
            <button className="ghostButton" disabled={submitting} onClick={onClose} type="button">
              取消
            </button>
            <button className="dangerButton" disabled={submitting || !reason.trim()} type="submit">
              {submitting ? "處理中..." : "確認拒絕"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function PurchaseModal({ memberName, open, submitting = false, onClose, onSubmit }: PurchaseModalProps) {
  const [itemName, setItemName] = useState("保養品");
  const [amount, setAmount] = useState("1200");
  const [purchasedAt, setPurchasedAt] = useState(toDateInput(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setItemName("保養品");
    setAmount("1200");
    setPurchasedAt(toDateInput(new Date()));
    setNote("");
    setError("");
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedAmount = Number(amount);
    if (!itemName.trim()) {
      setError("請輸入購買品項。");
      return;
    }
    if (Number.isNaN(normalizedAmount) || normalizedAmount < 0) {
      setError("金額格式不正確。");
      return;
    }
    await onSubmit({
      itemName: itemName.trim(),
      amount: normalizedAmount,
      purchasedAt,
      note: note.trim(),
    });
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section aria-modal="true" className="adminModal" role="dialog">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Purchase</p>
            <h2>新增購買紀錄</h2>
          </div>
          <button aria-label="關閉" className="iconButton" disabled={submitting} onClick={onClose} type="button">
            x
          </button>
        </div>
        <p className="modalDescription">會員：{memberName}</p>
        <form className="bookingForm" onSubmit={submit}>
          <label>
            購買品項
            <input autoFocus value={itemName} onChange={(event) => setItemName(event.target.value)} />
          </label>
          <div className="fieldGrid">
            <label>
              金額
              <input min="0" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <label>
              購買日期
              <input type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} />
            </label>
          </div>
          <label>
            備註
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          {error ? <div className="formMessage error">{error}</div> : null}
          <div className="modalActions">
            <button className="ghostButton" disabled={submitting} onClick={onClose} type="button">
              取消
            </button>
            <button className="primaryButton" disabled={submitting} type="submit">
              {submitting ? "儲存中..." : "新增紀錄"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
