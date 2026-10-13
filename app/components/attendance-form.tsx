"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AttendanceFormProps = {
  action: "check-in" | "check-out";
};

const MONEY_TYPES = [
  { value: "CASH", label: "เงินสด" },
  { value: "TRUEMONEY", label: "TrueMoney" },
] as const;

export default function AttendanceForm({ action }: AttendanceFormProps) {
  const router = useRouter();
  const [moneyType, setMoneyType] = useState<"CASH" | "TRUEMONEY">("TRUEMONEY");
  const [photoName, setPhotoName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCheckIn = action === "check-in";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("moneyType", moneyType);
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
            <label htmlFor={`${action}-moneyAmount`} className="field-label">
              {isCheckIn ? "เงินที่นำเข้า (บาท)" : "เงินที่นำออก (บาท)"}
            </label>
            <div className="flex h-[52px] items-center gap-2 rounded-xl border border-[#c3cfe0] bg-white px-3.5">
              <span aria-hidden="true" className="text-lg font-semibold muted">
                ฿
              </span>
              <input
                id={`${action}-moneyAmount`}
                name="moneyAmount"
                type="text"
                inputMode="decimal"
                required
                maxLength={12}
                placeholder="0.00"
                className="w-full min-w-0 border-none bg-transparent text-lg font-semibold outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span id={`${action}-moneyType-label`} className="field-label">
              ประเภทเงิน
            </span>
            <div
              role="group"
              aria-labelledby={`${action}-moneyType-label`}
              className="grid grid-cols-2 gap-1 rounded-xl bg-[#e9eef6] p-1"
            >
              {MONEY_TYPES.map((t) => {
                const pressed = moneyType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setMoneyType(t.value)}
                    className={`min-h-[44px] rounded-[9px] border-none text-[15px] ${
                      pressed
                        ? "bg-white font-semibold text-[#1750b8] shadow-[0_1px_3px_rgba(15,31,58,0.15)]"
                        : "bg-transparent font-medium text-[#33425b]"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
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
