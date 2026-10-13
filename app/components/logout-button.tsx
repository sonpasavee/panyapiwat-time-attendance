"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ออกจากระบบฝั่ง client ต่อให้ยิง API ไม่สำเร็จ
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-70"
    >
      {isSubmitting ? "กำลังออก…" : "ออกจากระบบ"}
    </button>
  );
}
