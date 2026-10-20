import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";

import DashboardNav, { type NavItem } from "./dashboard-nav";
import LogoutButton from "./logout-button";
import {
  MobileUserLabel,
  MobileUserLabelFallback,
  SidebarUserCard,
  SidebarUserCardFallback,
} from "./shell-user";

function GridIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  );
}

function ClockIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  );
}

function ListIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
  );
}

function WalletIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="16.5" cy="13.5" r="1.2" /></svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  );
}

function UsersIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .7 3.5 2.6 3.5 5.2" /></svg>
  );
}

function ChartIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
  );
}

function UploadIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
  );
}

export const studentNavItems: NavItem[] = [
  { href: "/student", label: "แดชบอร์ด", icon: <GridIcon />, exact: true },
  { href: "/student/check-in", label: "เช็กอิน / เช็กเอาท์", icon: <ClockIcon /> },
  { href: "/student/attendance", label: "ประวัติลงเวลา", icon: <ListIcon /> },
  { href: "/student/money", label: "เงินส่วนตัว", icon: <WalletIcon /> },
  { href: "/student/leaves", label: "การลา", icon: <CalendarIcon /> },
];

export const adminNavItems: NavItem[] = [
  { href: "/admin", label: "ภาพรวม", icon: <GridIcon />, exact: true },
  { href: "/admin/attendance", label: "การลงเวลา", icon: <ClockIcon /> },
  { href: "/admin/reports", label: "รายงานชั่วโมง", icon: <ChartIcon /> },
  { href: "/admin/users", label: "นักศึกษา", icon: <UsersIcon /> },
  { href: "/admin/finance", label: "การเงิน", icon: <WalletIcon /> },
  { href: "/admin/leaves", label: "การลา", icon: <CalendarIcon /> },
  { href: "/admin/import", label: "นำเข้ารายชื่อ", icon: <UploadIcon /> },
];

type DashboardShellProps = {
  brandSub: string;
  items: NavItem[];
  children: ReactNode;
};

export default function DashboardShell({
  brandSub,
  items,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e3e9f2] bg-white px-5 py-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-bold leading-tight">
            ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่น
          </p>
          <p className="m-0 truncate text-xs muted">
            <Suspense fallback={<MobileUserLabelFallback />}>
              <MobileUserLabel />
            </Suspense>
          </p>
        </div>
        <Link
          href="/account/password"
          aria-label="เปลี่ยนรหัสผ่าน"
          title="เปลี่ยนรหัสผ่าน"
          className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#e3e9f2] bg-white text-[#1750b8] hover:bg-[#eaf1ff]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="8" cy="15" r="4" />
            <path d="m11 12 8-8 3 3-3 3-2-2-2 2 2 2-3 3" />
          </svg>
        </Link>
        <LogoutButton compact />
      </header>

      <div className="flex w-full items-start">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col gap-7 overflow-y-auto border-r border-[#e3e9f2] bg-white px-4 py-6 lg:flex">
          <div className="px-2">
            <p className="m-0 text-sm font-bold leading-6 text-[#0f1f3a]">
              ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่น
            </p>
            <p className="m-0 text-xs muted">{brandSub}</p>
          </div>

          <DashboardNav items={items} />

          <div className="flex-1" />

          <Suspense fallback={<SidebarUserCardFallback />}>
            <SidebarUserCard />
          </Suspense>

          <div className="-mt-3">
            <LogoutButton />
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
          {children}
        </div>
      </div>

      {/* Mobile bottom nav — แสดงไม่เกิน 5 ปุ่ม (เมนูที่เหลืออยู่ในปุ่ม "เมนู") */}
      <div className="lg:hidden">
        <DashboardNav items={items} orientation="bottom" />
      </div>
    </div>
  );
}
