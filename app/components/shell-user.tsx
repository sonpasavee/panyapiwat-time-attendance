import { cache } from "react";
import Link from "next/link";

import { currentUser } from "@/lib/auth";
import { getUserProfile } from "@/services/user.service";

// อ่าน session + โปรไฟล์สำหรับ sidebar (dedupe ภายใน render เดียวกัน)
const getShellUser = cache(async () => {
  const session = await currentUser();
  if (!session) return null;
  try {
    const profile = await getUserProfile(session.id);
    return {
      name: `${profile.firstName} ${profile.lastName}`,
      roleLabel:
        session.role === "ADMIN" ? "เจ้าหน้าที่ศูนย์การเรียน" : "ผู้ฝึกอาชีพ",
    };
  } catch {
    return null;
  }
});

function AvatarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
  );
}

// การ์ดผู้ใช้ท้าย sidebar (desktop) — ใช้ใน <Suspense> เท่านั้น
export async function SidebarUserCard() {
  const user = await getShellUser();
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-[#f4f7fb] p-3.5">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe8ff] text-[#1750b8]"
      >
        <AvatarIcon />
      </div>
      <div className="min-w-0">
        <p className="m-0 truncate text-sm font-semibold">
          {user?.name ?? "–"}
        </p>
        <p className="m-0 text-xs muted">{user?.roleLabel ?? ""}</p>
        <Link href="/account/password" className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-[#1750b8] hover:underline">
          เปลี่ยนรหัสผ่าน
        </Link>
      </div>
    </div>
  );
}

export function SidebarUserCardFallback() {
  return (
    <div aria-hidden="true" className="flex animate-pulse items-center gap-3 rounded-[14px] bg-[#f4f7fb] p-3.5">
      <div className="h-10 w-10 shrink-0 rounded-full bg-[#e3e9f2]" />
      <div className="min-w-0 flex-1">
        <div className="h-3.5 w-3/4 rounded bg-[#e3e9f2]" />
        <div className="mt-1.5 h-3 w-1/2 rounded bg-[#e3e9f2]" />
      </div>
    </div>
  );
}

// ชื่อผู้ใช้บน mobile top bar — ใช้ใน <Suspense> เท่านั้น
export async function MobileUserLabel() {
  const user = await getShellUser();
  if (!user) return null;
  return <>{user.name} • {user.roleLabel}</>;
}

export function MobileUserLabelFallback() {
  return (
    <span aria-hidden="true" className="muted">
      …
    </span>
  );
}
