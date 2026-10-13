"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LeaveForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const body = {
        leaveType: formData.get("leaveType"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        reason: formData.get("reason") || undefined,
      };
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || "บันทึกใบลาไม่สำเร็จ");
        return;
      }

      setSuccess("บันทึกใบลาเรียบร้อยแล้ว");
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label
            htmlFor="leave-type"
            className="block text-sm font-semibold text-white/90"
          >
            ประเภทการลา
          </label>
          <select
            id="leave-type"
            name="leaveType"
            required
            defaultValue="SICK"
            className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none focus:border-blue-200"
          >
            <option value="SICK">ลาป่วย</option>
            <option value="PERSONAL">ลากิจ</option>
            <option value="HOLIDAY">วันหยุด</option>
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="leave-start"
            className="block text-sm font-semibold text-white/90"
          >
            ตั้งแต่วันที่
          </label>
          <input
            id="leave-start"
            name="startDate"
            type="date"
            required
            className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none focus:border-blue-200"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="leave-end"
            className="block text-sm font-semibold text-white/90"
          >
            ถึงวันที่
          </label>
          <input
            id="leave-end"
            name="endDate"
            type="date"
            required
            className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none focus:border-blue-200"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="leave-reason"
          className="block text-sm font-semibold text-white/90"
        >
          เหตุผล (ไม่บังคับ)
        </label>
        <textarea
          id="leave-reason"
          name="reason"
          rows={2}
          maxLength={1000}
          placeholder="ระบุเหตุผล (ถ้ามี)"
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
        {isSubmitting ? "กำลังบันทึก…" : "บันทึกใบลา"}
      </button>
    </form>
  );
}
