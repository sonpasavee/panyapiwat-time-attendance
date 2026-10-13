"use client";

import { useState } from "react";

export type CsvRow = {
  name: string;
  shop: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

// ส่งออก CSV จากข้อมูลที่โหลดไว้แล้ว (ไม่ต้องเพิ่ม API)
export default function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: string[][];
}) {
  const [busy, setBusy] = useState(false);

  function handleClick() {
    setBusy(true);
    try {
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const csv =
        "\uFEFF" +
        [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={busy} className="btn btn-primary">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></svg>
      {busy ? "กำลังส่งออก…" : "ส่งออก CSV"}
    </button>
  );
}
