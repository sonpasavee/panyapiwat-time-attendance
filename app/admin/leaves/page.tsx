import { requireAdminPage } from "@/lib/page-auth";
import { bangkokDateKey } from "@/lib/format";
import { adminLeavesQuerySchema, monthYear } from "@/validators/api";
import {
  buildAdminLeaveFilter,
  listAdminLeaves,
} from "@/services/leave.service";

import LeavesManager, { type LeaveRow } from "./leaves-manager";
import "./admin-leaves.css";

export const instant = false;

type SearchParams = {
  view?: string | string[];
  type?: string | string[];
  q?: string | string[];
  shopCode?: string | string[];
  month?: string | string[];
  year?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLeavesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const requestedView = first(params.view);
  const view = requestedView === "timeline"
    ? "timeline"
    : requestedView === "date"
      ? "date"
      : "student";
  const q = first(params.q)?.trim() ?? "";
  const shopCode = first(params.shopCode)?.trim() ?? "";

  const raw: Record<string, string> = {};
  const typeParam = first(params.type)?.trim();
  if (typeParam) raw.type = typeParam;
  if (shopCode) raw.shopCode = shopCode;
  const filters = adminLeavesQuerySchema.parse(raw);

  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month)?.trim() ? { month: first(params.month)!.trim() } : {}),
      ...(first(params.year)?.trim() ? { year: first(params.year)!.trim() } : {}),
    }),
  );

  const { items } = await listAdminLeaves(
    buildAdminLeaveFilter({ type: undefined, month, year, shopCode: filters.shopCode }),
    0,
    1000,
  );

  // ค้นหาชื่อ/รหัสฝั่ง server (ไม่แตะ service เดิม)
  const needle = q.toLowerCase();
  const matched = needle
    ? items.filter((l) =>
        `${l.user.firstName} ${l.user.lastName} ${l.user.studentId ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : items;

  const rows: LeaveRow[] = matched.map((l) => ({
    id: l.id,
    type: l.type,
    start: l.startDate.toISOString().slice(0, 10),
    end: l.endDate.toISOString().slice(0, 10),
    reason: l.reason,
    createdAt: l.createdAt.toISOString(),
    user: {
      id: l.user.id,
      firstName: l.user.firstName,
      lastName: l.user.lastName,
      studentId: l.user.studentId,
      shopCode: l.user.shopCode,
    },
  }));

  const linkBase: Record<string, string> = {
    view,
    month: String(month),
    year: String(year),
    ...(q ? { q } : {}),
    ...(shopCode ? { shopCode } : {}),
  };

  return (
    <LeavesManager
      items={rows}
      view={view}
      month={month}
      year={year}
      filters={{ q, shopCode, type: filters.type ?? "" }}
      linkBase={linkBase}
      todayISO={bangkokDateKey()}
    />
  );
}
