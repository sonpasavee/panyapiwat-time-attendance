"use client";

import { useState } from "react";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
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
      className={
        compact
          ? "btn btn-outline min-h-[44px] shrink-0 px-3 text-[13px]"
          : "btn btn-outline w-full"
      }
    >
      {!compact && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="M16 8l4 4-4 4M20 12H9" /></svg>
      )}
      {isSubmitting ? "กำลังออก…" : "ออกจากระบบ"}
    </button>
  );
}
