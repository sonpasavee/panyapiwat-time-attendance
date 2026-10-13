"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const LEAVE_TYPES = [
  { value: "SICK", label: "ลาป่วย" },
  { value: "PERSONAL", label: "ลากิจ" },
  { value: "HOLIDAY", label: "วันหยุด" },
] as const;

export default function LeavePanel() {
  const router = useRouter();
  const [leaveType, setLeaveType] = useState<"SICK" | "PERSONAL" | "HOLIDAY">("SICK");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const body = {
        leaveType,
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
      setLeaveType("SICK");
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span id="leave-panel-type-label" className="field-label">
          ประเภทการลา
        </span>
        <div
          role="group"
          aria-labelledby="leave-panel-type-label"
          className="grid grid-cols-3 gap-1 rounded-xl bg-[#e9eef6] p-1"
        >
          {LEAVE_TYPES.map((t) => {
            const pressed = leaveType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={pressed}
                onClick={() => setLeaveType(t.value)}
                className={`min-h-[48px] rounded-[9px] border-none text-[15px] ${
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leave-panel-start" className="field-label">
            ตั้งแต่วันที่
          </label>
          <input
            id="leave-panel-start"
            name="startDate"
            type="date"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leave-panel-end" className="field-label">
            ถึงวันที่
          </label>
          <input
            id="leave-panel-end"
            name="endDate"
            type="date"
            required
            className="input"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="leave-panel-reason" className="field-label">
          เหตุผล <span className="field-hint">(ไม่บังคับ)</span>
        </label>
        <textarea
          id="leave-panel-reason"
          name="reason"
          rows={4}
          maxLength={1000}
          placeholder="พิมพ์เหตุผล"
          className="input min-h-[110px] resize-y py-3 leading-relaxed"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary min-h-[52px] w-full rounded-xl text-[16px]"
      >
        {isSubmitting ? "กำลังบันทึก…" : "บันทึกใบลา"}
      </button>
    </form>
  );
}
