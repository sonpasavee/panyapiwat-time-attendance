"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AttendanceFormProps = {
  action: "check-in" | "check-out";
};

export default function AttendanceForm({ action }: AttendanceFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCheckIn = action === "check-in";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/attendance/${action}`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error?.message || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง",
        );
        return;
      }

      setSuccess(
        isCheckIn
          ? "เช็กอินสำเร็จ ยินดีต้อนรับเข้าทำงาน"
          : "เช็กเอาท์สำเร็จ ขอบคุณสำหรับวันนี้",
      );
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor={`${action}-image`}
          className="block text-sm font-semibold text-white/90"
        >
          รูปถ่าย{isCheckIn ? "เช็กอิน" : "เช็กเอาท์"} (jpeg/png/webp ไม่เกิน
          5MB)
        </label>
        <input
          id={`${action}-image`}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 py-3 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#0b2f5c]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor={`${action}-moneyAmount`}
            className="block text-sm font-semibold text-white/90"
          >
            จำนวนเงิน (บาท)
          </label>
          <input
            id={`${action}-moneyAmount`}
            name="moneyAmount"
            type="text"
            inputMode="decimal"
            required
            maxLength={12}
            placeholder="เช่น 150 หรือ 120.50"
            className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none placeholder:text-white/40 focus:border-blue-200"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${action}-moneyType`}
            className="block text-sm font-semibold text-white/90"
          >
            ประเภทเงิน
          </label>
          <select
            id={`${action}-moneyType`}
            name="moneyType"
            required
            defaultValue="CASH"
            className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none focus:border-blue-200"
          >
            <option value="CASH">เงินสด</option>
            <option value="TRUEMONEY">TrueMoney</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`${action}-note`}
          className="block text-sm font-semibold text-white/90"
        >
          หมายเหตุ (ไม่บังคับ)
        </label>
        <textarea
          id={`${action}-note`}
          name="note"
          rows={2}
          maxLength={1000}
          placeholder="เพิ่มเติม (ถ้ามี)"
          className="w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-blue-200"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200/30 bg-red-400/10 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
        >
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-base font-bold text-[#0b2f5c] transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting
          ? "กำลังบันทึก…"
          : isCheckIn
            ? "เช็กอินเข้างาน"
            : "เช็กเอาท์ออกงาน"}
      </button>
    </form>
  );
}
