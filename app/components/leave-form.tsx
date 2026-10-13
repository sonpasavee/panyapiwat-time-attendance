"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LeaveForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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

      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leave-type" className="field-label">
            ประเภทการลา
          </label>
          <select id="leave-type" name="leaveType" required defaultValue="SICK" className="input">
            <option value="SICK">ลาป่วย</option>
            <option value="PERSONAL">ลากิจ</option>
            <option value="HOLIDAY">วันหยุด</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leave-start" className="field-label">
            ตั้งแต่วันที่
          </label>
          <input id="leave-start" name="startDate" type="date" required className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leave-end" className="field-label">
            ถึงวันที่
          </label>
          <input id="leave-end" name="endDate" type="date" required className="input" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="leave-reason" className="field-label">
          เหตุผล <span className="field-hint">(ไม่บังคับ)</span>
        </label>
        <input
          id="leave-reason"
          name="reason"
          type="text"
          maxLength={1000}
          placeholder="พิมพ์เหตุผล"
          className="input"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-submit w-full">
        {isSubmitting ? "กำลังบันทึก…" : "บันทึกใบลา"}
      </button>
    </form>
  );
}
