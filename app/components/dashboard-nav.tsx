"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function DashboardNav({
  items,
  orientation = "sidebar",
}: {
  items: NavItem[];
  orientation?: "sidebar" | "bottom";
}) {
  const pathname = usePathname();

  if (orientation === "bottom") {
    return (
      <nav aria-label="เมนูหลัก" className="bottom-nav">
        <ul className="bottom-nav-list">
          {items.map((item) => {
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
        </ul>
      </nav>
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
