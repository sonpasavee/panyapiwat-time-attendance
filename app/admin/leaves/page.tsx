import { requireAdminPage } from "@/lib/page-auth";
import { bangkokDateKey } from "@/lib/format";
import { adminLeavesQuerySchema, monthYear } from "@/validators/api";
import {
  getAcademicTerms,
  listUsers,
  listShopCodes,
  listClassGroupFilters,
} from "@/services/user.service";
import {
  buildAdminLeaveFilter,
  listAdminLeaveTypeCounts,
  listAdminLeaveUserIds,
  listAdminLeaves,
} from "@/services/leave.service";

import LeavesManager, { type LeaveRow } from "./leaves-manager";
import "./admin-leaves.css";

export const instant = false;

const PAGE_SIZE_BY_VIEW = {
  student: 10,
  timeline: 15,
  date: 7,
} as const;

// กันไม่ให้หน้าเดียวโหลดแถวมากเกินไป แม้ข้อมูลจะถูกแบ่งหน้าฝั่ง server แล้ว
const MAX_PAGE_ROWS = 6_000;

type SearchParams = {
  view?: string | string[];
  type?: string | string[];
  q?: string | string[];
  shopCode?: string | string[];
  month?: string | string[];
  year?: string | string[];
  academicTermId?: string | string[];
  gradeLevel?: string | string[];
  section?: string | string[];
  page?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | string[] | undefined) {
  const raw = Number(first(value));
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

function toRows(items: Awaited<ReturnType<typeof listAdminLeaves>>["items"]): LeaveRow[] {
  return items.map((leave) => ({
    id: leave.id,
    type: leave.type,
    start: leave.startDate.toISOString().slice(0, 10),
    end: leave.endDate.toISOString().slice(0, 10),
    reason: leave.reason,
    createdAt: leave.createdAt.toISOString(),
    user: {
      id: leave.user.id,
      firstName: leave.user.firstName,
      lastName: leave.user.lastName,
      studentId: leave.user.studentId,
      shopCode: leave.user.shopCode,
    },
  }));
}

export default async function AdminLeavesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const terms = await getAcademicTerms();
  const requestedTerm = first(params.academicTermId)?.trim();
  const academicTermId = terms.some((term) => term.id === requestedTerm)
    ? requestedTerm
    : terms[0]?.id;

  const requestedView = first(params.view);
  const view = requestedView === "timeline"
    ? "timeline"
    : requestedView === "date"
      ? "date"
      : "student";
  const q = first(params.q)?.trim() ?? "";
  const shopCode = first(params.shopCode)?.trim() ?? "";
  const gradeRaw = first(params.gradeLevel)?.trim();
  const gradeLevel = gradeRaw && /^\d+$/.test(gradeRaw) ? Number(gradeRaw) : undefined;
  const section = first(params.section)?.trim() ?? "";

  const raw: Record<string, string> = {};
  const typeParam = first(params.type)?.trim();
  if (typeParam) raw.type = typeParam;
  if (shopCode) raw.shopCode = shopCode;
  if (gradeLevel) raw.gradeLevel = String(gradeLevel);
  if (section) raw.section = section;
  if (academicTermId) raw.academicTermId = academicTermId;
  if (q) raw.q = q;
  const filters = adminLeavesQuerySchema.parse(raw);

  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month)?.trim() ? { month: first(params.month)!.trim() } : {}),
      ...(first(params.year)?.trim() ? { year: first(params.year)!.trim() } : {}),
    }),
  );

  const baseWhere = await buildAdminLeaveFilter({
    type: undefined,
    month,
    year,
    shopCode: filters.shopCode,
    gradeLevel: filters.gradeLevel,
    section: filters.section,
    academicTermId,
    q: filters.q,
  });
  const filteredWhere = filters.type
    ? { ...baseWhere, type: filters.type }
    : baseWhere;

  const todayISO = bangkokDateKey();
  const todayDate = new Date(`${todayISO}T00:00:00.000Z`);
  const todayWhere = {
    AND: [
      filteredWhere,
      { startDate: { lte: todayDate } },
      { endDate: { gte: todayDate } },
    ],
  };

  const [typeCountRows, todayResult] = await Promise.all([
    listAdminLeaveTypeCounts(baseWhere),
    listAdminLeaves(todayWhere, 0, 1_000, academicTermId),
  ]);
  const typeCounts = {
    total: typeCountRows.reduce((sum, row) => sum + row.count, 0),
    SICK: typeCountRows.find((row) => row.type === "SICK")?.count ?? 0,
    PERSONAL: typeCountRows.find((row) => row.type === "PERSONAL")?.count ?? 0,
    HOLIDAY: typeCountRows.find((row) => row.type === "HOLIDAY")?.count ?? 0,
  };
  const todayItems = toRows(todayResult.items);

  const requestedPage = positiveInt(params.page);
  let rows: LeaveRow[] = [];
  let page = 1;
  let pageCount = 1;
  let summary = "";
  let totalPeople = 0;
  let dateWindow: { start: string; end: string } | undefined;

  if (view === "date") {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    pageCount = Math.max(1, Math.ceil(daysInMonth / PAGE_SIZE_BY_VIEW.date));
    page = Math.min(requestedPage, pageCount);
    const startDay = (page - 1) * PAGE_SIZE_BY_VIEW.date + 1;
    const endDay = Math.min(page * PAGE_SIZE_BY_VIEW.date, daysInMonth);
    const windowStart = new Date(Date.UTC(year, month - 1, startDay));
    const windowEndExclusive = new Date(Date.UTC(year, month - 1, endDay + 1));
    const windowStartISO = windowStart.toISOString().slice(0, 10);
    const windowEndISO = new Date(Date.UTC(year, month - 1, endDay))
      .toISOString()
      .slice(0, 10);
    dateWindow = { start: windowStartISO, end: windowEndISO };

    const result = await listAdminLeaves(
      {
        AND: [
          filteredWhere,
          { startDate: { lt: windowEndExclusive } },
          { endDate: { gte: windowStart } },
        ],
      },
      0,
      MAX_PAGE_ROWS,
      academicTermId,
    );
    rows = toRows(result.items);
    summary = `ช่วงวันที่ ${startDay}–${endDay} · ${rows.length} รายการ · หน้า ${page}/${pageCount}`;
  } else {
    const userIds = await listAdminLeaveUserIds(filteredWhere);
    const userResult = userIds.length > 0
      ? await listUsers({ id: { in: userIds } }, 0, userIds.length, academicTermId)
      : { items: [], total: 0 };
    const people = [...userResult.items].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        "th",
      ),
    );
    totalPeople = people.length;
    const pageSize = PAGE_SIZE_BY_VIEW[view];
    pageCount = Math.max(1, Math.ceil(people.length / pageSize));
    page = Math.min(requestedPage, pageCount);
    const pagePeople = people.slice((page - 1) * pageSize, page * pageSize);
    const pageIds = pagePeople.map((person) => person.id);
    const result = pageIds.length > 0
      ? await listAdminLeaves(
          { ...filteredWhere, userId: { in: pageIds } },
          0,
          MAX_PAGE_ROWS,
          academicTermId,
        )
      : { items: [], total: 0 };
    rows = toRows(result.items);
    summary = `${totalPeople} คน · หน้า ${page}/${pageCount}`;
  }

  const linkBase: Record<string, string> = {
    view,
    month: String(month),
    year: String(year),
    ...(q ? { q } : {}),
    ...(shopCode ? { shopCode } : {}),
    ...(gradeLevel ? { gradeLevel: String(gradeLevel) } : {}),
    ...(section ? { section } : {}),
    ...(academicTermId ? { academicTermId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  };

  const exportParams = new URLSearchParams({
    month: String(month),
    year: String(year),
    ...(q ? { q } : {}),
    ...(shopCode ? { shopCode } : {}),
    ...(gradeLevel ? { gradeLevel: String(gradeLevel) } : {}),
    ...(section ? { section } : {}),
    ...(academicTermId ? { academicTermId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  });

  return (
    <LeavesManager
      items={rows}
      view={view}
      month={month}
      year={year}
      filters={{ q, shopCode, type: filters.type ?? "" }}
      linkBase={linkBase}
      termOptions={terms}
      academicTermId={academicTermId ?? ""}
      shopOptions={await listShopCodes(academicTermId)}
      classGroupOptions={await listClassGroupFilters(academicTermId)}
      gradeLevel={gradeLevel ? String(gradeLevel) : ""}
      section={section}
      todayISO={todayISO}
      todayItems={todayItems}
      typeCounts={typeCounts}
      pagination={{ page, pageCount, summary }}
      dateWindow={dateWindow}
      exportHref={`/api/admin/leaves/export?${exportParams.toString()}`}
    />
  );
}
