"use client";

import { useState } from "react";

// ส่งออก .xlsx ฝั่ง client จากข้อมูลที่โหลดไว้แล้ว (ไม่เพิ่ม API ใหม่)
export default function ExportMoneyButton({
  filename,
  headers,
  rows,
  label = "ส่งออก Excel (.xlsx)",
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([headers, ...rows]),
        "sheet1",
      );
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
      className="btn min-h-[44px]"
      style={{ background: "#15803d", color: "#fff" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></svg>
      {busy ? "กำลังส่งออก…" : label}
    </button>
  );
}
