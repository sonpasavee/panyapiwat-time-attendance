"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** นับเวลาทำงานแบบเรียลไทม์ตั้งแต่เช็กอิน (hh:mm:ss) */
export default function WorkTimer({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(
    0,
    Math.floor((now - new Date(since).getTime()) / 1000),
  );
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (
    <span role="timer" className="tabular-nums" suppressHydrationWarning>
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
