"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// นับเวลาทำงานต่อเนื่องตั้งแต่ checkInAt (อัปเดตทุกวินาที)
export default function WorkTimer({
  checkInAt,
  initialNow,
}: {
  checkInAt: string;
  initialNow: number;
}) {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p
      aria-live="off"
      className="m-0 mt-1 text-[clamp(2rem,9vw,3rem)] font-bold leading-[1.15] tabular-nums break-all"
    >
      {parts(now - new Date(checkInAt).getTime())}
    </p>
  );
}
