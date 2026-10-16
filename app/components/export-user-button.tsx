"use client";

import { useState } from "react";

import { DownloadIcon } from "./report-helpers";

export type UserExportRow = {
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: string;
};

// ส่งออกรายบุคคล (.xlsx ชีตเดียว) จากข้อมูลที่โหลดไว้แล้ว
export default function ExportUserButton({
  filename,
  rows,
}: {
  filename: string;
  rows: UserExportRow[];
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet([
        ["วันที่", "เช็กอิน", "เช็กเอาท์", "ชั่วโมงรวม", "สถานะ"],
        ...rows.map((r) => [r.date, r.checkIn, r.checkOut, r.hours, r.status]),
      ]);
      XLSX.utils.book_append_sheet(wb, sheet, "รายบุคคล");
      XLSX.writeFile(wb, filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="btn min-h-[44px] font-semibold text-white"
      style={{ background: "#0e7a3d" }}
    >
      <DownloadIcon />
      {busy ? "กำลังสร้างไฟล์…" : "ส่งออกรายคน (.xlsx)"}
    </button>
  );
}
