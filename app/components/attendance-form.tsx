"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AttendanceFormProps = {
  action: "check-in" | "check-out";
  blockedMessage?: string;
};

// โลโก้เงินสด: ธนบัตรสีเขียว (ตกแต่ง — label ของ input อ่านชื่อฟิลด์อยู่แล้ว)
function CashLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="2" y="8" width="28" height="16" rx="3" fill="#dcfce7" />
      <rect x="2" y="8" width="28" height="16" rx="3" stroke="#16a34a" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="4.6" fill="#16a34a" />
      <text x="16" y="19.4" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#ffffff" fontFamily="inherit">฿</text>
    </svg>
  );
}

// โลโก้ TrueMoney: ใช้รูปที่ import ไว้ใน public/ (ตกแต่ง — label ของ input อ่านชื่อฟิลด์อยู่แล้ว)
function TrueMoneyLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/TrueMoneyWallet-Icon.png"
      alt=""
      aria-hidden="true"
      width={26}
      height={26}
      className="flex-none rounded-full"
    />
  );
}

export default function AttendanceForm({
  action,
  blockedMessage,
}: AttendanceFormProps) {
  const router = useRouter();
  const [photoName, setPhotoName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCheckIn = action === "check-in";

  if (blockedMessage) {
    return (
      <p
        role="status"
        className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        {blockedMessage}
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const cash = String(formData.get("cashAmount") ?? "").trim();
    const truemoney = String(formData.get("truemoneyAmount") ?? "").trim();
    if (!cash && !truemoney) {
      setError("กรุณากรอกเงินสดหรือ TrueMoney อย่างน้อยหนึ่งช่อง");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/attendance/${action}`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }

      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span id={`${action}-photo-label`} className="field-label">
            {isCheckIn ? "ถ่ายรูปเข้างาน" : "ถ่ายรูปออกงาน"}
          </span>
          <label
            htmlFor={`${action}-image`}
            aria-labelledby={`${action}-photo-label`}
            className="mt-1.5 flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#b3c2d8] bg-[#f8fafd] px-4 py-6 text-center transition hover:border-[#1d63d8]"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="ตัวอย่างรูปที่แนบ"
                className="max-h-40 rounded-lg object-contain"
              />
            ) : (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1d63d8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.6" /></svg>
            )}
            <span className="text-[15px] font-semibold">
              {photoName || (isCheckIn ? "ถ่ายรูปเข้างาน" : "ถ่ายรูปออกงาน")}
            </span>
            <span className="muted text-[13px]">ต้องแนบรูปก่อนยืนยัน</span>
          </label>
          <input
            id={`${action}-image`}
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPhotoName(file?.name ?? "");
              setPhotoUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return file ? URL.createObjectURL(file) : "";
              });
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${action}-cashAmount`} className="field-label">
              {isCheckIn ? "เงินสดที่นำเข้า (บาท)" : "เงินสดคงเหลือ (บาท)"}
            </label>
            <div className="flex h-[52px] items-center gap-2.5 rounded-xl border border-[#c3cfe0] bg-white px-3.5">
              <span aria-hidden="true" className="flex flex-none items-center">
                <CashLogo />
              </span>
              <input
                id={`${action}-cashAmount`}
                name="cashAmount"
                type="text"
                inputMode="decimal"
                maxLength={12}
                placeholder="0.00"
                className="w-full min-w-0 border-none bg-transparent text-lg font-semibold outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${action}-truemoneyAmount`} className="field-label">
              {isCheckIn ? "TrueMoney ที่นำเข้า (บาท)" : "TrueMoney คงเหลือ (บาท)"}
            </label>
            <div className="flex h-[52px] items-center gap-2.5 rounded-xl border border-[#c3cfe0] bg-white px-3.5">
              <span aria-hidden="true" className="flex flex-none items-center">
                <TrueMoneyLogo />
              </span>
              <input
                id={`${action}-truemoneyAmount`}
                name="truemoneyAmount"
                type="text"
                inputMode="decimal"
                maxLength={12}
                placeholder="0.00"
                className="w-full min-w-0 border-none bg-transparent text-lg font-semibold outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${action}-note`} className="field-label">
          หมายเหตุ <span className="field-hint">(ไม่บังคับ)</span>
        </label>
        <input
          id={`${action}-note`}
          name="note"
          type="text"
          maxLength={1000}
          placeholder="พิมพ์ข้อความ"
          className="input"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary btn-submit w-full"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        {isSubmitting
          ? "กำลังบันทึก…"
          : isCheckIn
            ? "ยืนยันเช็กอิน"
            : "ยืนยันเช็กเอาท์"}
      </button>
    </form>
  );
}
