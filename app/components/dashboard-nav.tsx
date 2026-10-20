"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

// มือถือแสดงได้สูงสุด 5 ปุ่มตามดีไซน์: ถ้าเมนูเกิน จะเหลือ 4 ปุ่ม + "เมนู"
const BOTTOM_PRIMARY = 4;

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function MoreIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function DashboardNav({
  items,
  orientation = "sidebar",
}: {
  items: NavItem[];
  orientation?: "sidebar" | "bottom";
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ปิดเมนูทุกครั้งที่เปลี่ยนหน้า (ปรับ state ระหว่าง render ตามคำแนะนำของ React)
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
    // ปิดชีตอัตโนมัติเมื่อขยายจอขึ้นเดสก์ท็อป (กัน body ค้างล็อก)
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onViewportChange = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onViewportChange);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onViewportChange);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  if (orientation === "bottom") {
    const needsMenu = items.length > BOTTOM_PRIMARY + 1;
    const primary = needsMenu ? items.slice(0, BOTTOM_PRIMARY) : items;
    const overflow = needsMenu ? items.slice(BOTTOM_PRIMARY) : [];
    const overflowActive = overflow.some((item) => isActive(pathname, item));

    return (
      <>
        <nav aria-label="เมนูหลัก" className="bottom-nav">
          <ul className="bottom-nav-list">
            {primary.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href} className="flex flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="bottom-nav-link"
                  >
                    <span aria-hidden="true" className="inline-flex">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {needsMenu && (
              <li className="flex flex-1">
                <button
                  ref={menuButtonRef}
                  type="button"
                  className="bottom-nav-link bottom-nav-more"
                  aria-expanded={menuOpen}
                  aria-controls="bottom-nav-sheet"
                  aria-haspopup="dialog"
                  data-active={overflowActive ? "true" : undefined}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span aria-hidden="true" className="inline-flex">
                    {menuOpen ? <CloseIcon /> : <MoreIcon />}
                  </span>
                  เมนู
                </button>
              </li>
            )}
          </ul>
        </nav>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="ปิดเมนู"
              className="absolute inset-0 h-full w-full cursor-default bg-[#0f1f3a]/45"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id="bottom-nav-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="เมนูเพิ่มเติม"
              className="absolute inset-x-0 bottom-0 rounded-t-[22px] border-t border-[#e3e9f2] bg-white px-4 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(15,31,58,0.18)]"
            >
              <div
                aria-hidden="true"
                className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d5deeb]"
              />
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="m-0 text-[15px] font-bold">เมนูเพิ่มเติม</p>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="ปิดเมนู"
                  className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#e3e9f2] bg-white text-[#5b6b82] hover:bg-[#f4f7fb]"
                  onClick={() => {
                    setMenuOpen(false);
                    requestAnimationFrame(() => menuButtonRef.current?.focus());
                  }}
                >
                  <CloseIcon />
                </button>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 min-[360px]:grid-cols-2">
                {overflow.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <li key={item.href} className="min-w-0">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className="side-link min-h-[52px] border border-[#e3e9f2]"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span aria-hidden="true" className="inline-flex flex-none">
                          {item.icon}
                        </span>
                        <span className="min-w-0 break-words">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <nav aria-label="เมนูหลัก">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="side-link"
              >
                <span aria-hidden="true" className="inline-flex">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
