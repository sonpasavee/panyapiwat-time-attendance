"use client";

import { useEffect, useState } from "react";

import { DownloadIcon } from "./report-helpers";

export type DailyExportRow = {
  name: string;
  code: string;
  shop: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: string;
  photo: string;
};

export type MonthlyExportRow = {
  name: string;
  code: string;
  shop: string;
  attendanceDays: number;
  completeDays: number;
  leaveDays: number;
  hours: string;
  avgPerDay: string;
};

type ReportType = "daily" | "monthly" | "both";

const COLUMN_OPTIONS = [
  { id: "name", label: "ชื่อ-นามสกุล" },
  { id: "code", label: "รหัสนักศึกษา" },
  { id: "shop", label: "ร้าน" },
  { id: "times", label: "เช็กอิน / เช็กเอาท์" },
  { id: "hours", label: "ชั่วโมงรวม" },
  { id: "status", label: "สถานะ" },
  { id: "photo", label: "ลิงก์รูปถ่าย" },
] as const;

type ColumnId = (typeof COLUMN_OPTIONS)[number]["id"];

// สร้างไฟล์ .xlsx ฝั่ง client จากข้อมูลที่โหลดไว้แล้ว (ไม่เพิ่ม API ใหม่)
export default function ExportExcelModal({
  daily,
  monthly,
  defaultType,
  dailyLabel,
  monthlyLabel,
  monthFilename,
  dayFilename,
  personCount,
  triggerLabel = "ส่งออก Excel (.xlsx)",
}: {
  daily: DailyExportRow[];
  monthly: MonthlyExportRow[];
  defaultType: "daily" | "monthly";
  dailyLabel: string;
  monthlyLabel: string;
  monthFilename: string;
  dayFilename: string;
  personCount: number;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>(defaultType);
  const [columns, setColumns] = useState<ColumnId[]>([
    "name",
    "code",
    "shop",
    "times",
    "hours",
    "status",
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function toggleColumn(id: ColumnId) {
    setColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const sheetCount = reportType === "both" ? 2 : 1;
  const sheetNames =
    reportType === "daily"
      ? "รายวัน"
      : reportType === "monthly"
        ? "รายเดือน"
        : "รายวัน, รายเดือน";
  const filename = reportType === "daily" ? dayFilename : monthFilename;

  async function handleDownload() {
    if (columns.length === 0 || busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      if (reportType === "daily" || reportType === "both") {
        const header: string[] = [];
        if (columns.includes("name")) header.push("ชื่อ-นามสกุล");
        if (columns.includes("code")) header.push("รหัสนักศึกษา");
        if (columns.includes("shop")) header.push("ร้าน");
        if (columns.includes("times")) header.push("เช็กอิน", "เช็กเอาท์");
        if (columns.includes("hours")) header.push("ชั่วโมงรวม");
        if (columns.includes("status")) header.push("สถานะ");
        if (columns.includes("photo")) header.push("ลิงก์รูปถ่าย");
        const body = daily.map((r) => {
          const row: (string | number)[] = [];
          if (columns.includes("name")) row.push(r.name);
          if (columns.includes("code")) row.push(r.code);
          if (columns.includes("shop")) row.push(r.shop);
          if (columns.includes("times")) row.push(r.checkIn, r.checkOut);
          if (columns.includes("hours")) row.push(r.hours);
          if (columns.includes("status")) row.push(r.status);
          if (columns.includes("photo")) row.push(r.photo);
          return row;
        });
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.aoa_to_sheet([header, ...body]),
          "รายวัน",
        );
      }

      if (reportType === "monthly" || reportType === "both") {
        // ชีตรายเดือน: "เช็กอิน/เช็กเอาท์" แทนด้วย วันมา+ครบกะ; ลาและเฉลี่ย/วันแถมให้เสมอ
        const header: string[] = [];
        if (columns.includes("name")) header.push("ชื่อ-นามสกุล");
        if (columns.includes("code")) header.push("รหัสนักศึกษา");
        if (columns.includes("shop")) header.push("ร้าน");
        if (columns.includes("times")) header.push("วันมา", "ครบกะ");
        header.push("ลา (วัน)");
        if (columns.includes("hours")) header.push("ชั่วโมงรวม", "เฉลี่ย/วัน");
        const body = monthly.map((r) => {
          const row: (string | number)[] = [];
          if (columns.includes("name")) row.push(r.name);
          if (columns.includes("code")) row.push(r.code);
          if (columns.includes("shop")) row.push(r.shop);
          if (columns.includes("times"))
            row.push(r.attendanceDays, r.completeDays);
          row.push(r.leaveDays);
          if (columns.includes("hours")) row.push(r.hours, r.avgPerDay);
          return row;
        });
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.aoa_to_sheet([header, ...body]),
          "รายเดือน",
        );
      }

      XLSX.writeFile(wb, filename);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn min-h-[44px] font-semibold text-white"
        style={{ background: "#0e7a3d" }}
      >
        <DownloadIcon />
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1f3a]/45 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
            className="card max-h-[calc(100dvh-2rem)] w-full max-w-[560px] overflow-y-auto p-5 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="export-title" className="m-0 text-[22px] font-bold">
                  ส่งออกรายงานเป็น Excel
                </h2>
                <p className="muted mt-1 text-sm">
                  เลือกข้อมูลที่ต้องการในไฟล์ .xlsx
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิดหน้าต่างส่งออก"
                className="btn btn-outline min-h-[44px] min-w-[44px] px-3"
              >
                ✕
              </button>
            </div>

            <p className="field-label mt-6">ประเภทรางาน</p>
            <div
              role="radiogroup"
              aria-label="ประเภทรางาน"
              className="mt-2 grid grid-cols-1 gap-2 rounded-2xl bg-[#f1f5fb] p-2 min-[420px]:grid-cols-3"
            >
              {(
                [
                  { id: "daily", label: "รายวัน" },
                  { id: "monthly", label: "รายเดือน" },
                  { id: "both", label: "ทั้งสองแผ่นงาน" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={reportType === opt.id}
                  onClick={() => setReportType(opt.id)}
                  className={`min-h-[44px] rounded-xl text-sm font-semibold ${
                    reportType === opt.id
                      ? "bg-white text-[#1750b8] shadow-sm"
                      : "text-[#5b6b82]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="field-label mt-5">ช่วงเวลา</p>
            <div className="mt-2 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <div className="input flex min-h-[44px] items-center text-[15px]">
                {dailyLabel}
              </div>
              <div className="input flex min-h-[44px] items-center text-[15px]">
                {monthlyLabel}
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="field-label">คอลัมน์ที่ต้องการ</legend>
              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-3 min-[420px]:grid-cols-2">
                {COLUMN_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px]"
                  >
                    <input
                      type="checkbox"
                      checked={columns.includes(opt.id)}
                      onChange={() => toggleColumn(opt.id)}
                      className="h-5 w-5 accent-[#1d63d8]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#bfe3cd] bg-[#eefaf2] px-4 py-3">
              <span
                aria-hidden="true"
                className="text-[22px] font-extrabold text-[#0e7a3d]"
              >
                XLS
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-bold text-[#0e7a3d]">
                  {filename}
                </p>
                <p className="m-0 text-[13px] text-[#2c6b45]">
                  {personCount} คน · {sheetCount} แผ่นงาน ({sheetNames})
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 min-[420px]:flex-row min-[420px]:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-outline w-full min-[420px]:w-auto"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy || columns.length === 0}
                className="btn w-full font-semibold text-white disabled:opacity-60 min-[420px]:w-auto"
                style={{ background: "#0e7a3d" }}
              >
                <DownloadIcon />
                {busy ? "กำลังสร้างไฟล์…" : "ดาวน์โหลด Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
