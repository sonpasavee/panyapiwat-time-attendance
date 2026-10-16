import { requireAdminPage } from "@/lib/page-auth";
import { bangkokDateKey } from "@/lib/format";
import {
  adminAttendanceQuerySchema,
  monthYear,
  pagination,
} from "@/validators/api";
import { monthRange } from "@/lib/time";
import {
  buildAdminAttendanceFilter,
  listAdminAttendance,
} from "@/services/attendance.service";
import { listShopCodes } from "@/services/user.service";

import Pager from "../../components/pager";
import AttendanceManager, { type AttendanceRow } from "./attendance-manager";
import "./admin-attendance.css";

export const instant = false;

type SearchParams = {
  q?: string | string[];
  shopCode?: string | string[];
  date?: string | string[];
  status?: string | string[];
  sort?: string | string[];
  month?: string | string[];
  year?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function str(value: string | string[] | undefined) {
  const v = first(value)?.trim();
  return v ? v : undefined;
}

type StatusFilter = "" | "complete" | "working" | "missed";

const monthLongFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});

const dayNum = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
});
const monthShort = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<Exclude<StatusFilter, "">, string> = {
  complete: "ครบ",
  working: "กำลังทำงาน",
  missed: "ไม่ได้เช็กเอาท์",
};

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const raw: Record<string, string> = {};
  for (const key of ["q", "shopCode", "date", "sort"] as const) {
    const v = str(params[key]);
    if (v) raw[key] = v;
  }
  const filters = adminAttendanceQuerySchema.parse(raw);
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(str(params.month) ? { month: str(params.month)! } : {}),
      ...(str(params.year) ? { year: str(params.year)! } : {}),
    }),
  );
  const query = new URLSearchParams({
    ...(first(params.page) ? { page: first(params.page)! } : {}),
    ...(first(params.pageSize) ? { pageSize: first(params.pageSize)! } : {}),
  });
  const { page, pageSize } = pagination(query);

  const statusRaw = str(params.status);
  const status: StatusFilter =
    statusRaw === "complete" || statusRaw === "working" || statusRaw === "missed"
      ? statusRaw
      : "";

  const today = bangkokDateKey();

  const where = buildAdminAttendanceFilter({
    date: filters.date,
    monthRange: filters.date ? undefined : monthRange(year, month),
    shopCode: filters.shopCode,
    query: filters.q,
  });

  // ดึงทั้งเดือน (ไม่แตะ service เดิม) แล้วกรองสถานะ + แบ่งหน้าในเพจ
  const [{ items }, shopCodes] = await Promise.all([
    listAdminAttendance(where, 0, 2000, filters.sort ?? "desc"),
    listShopCodes(),
  ]);

  const withStatus = items.map((item) => ({
    item,
    st: (item.checkOutAt
      ? "complete"
      : item.workDate.toISOString().slice(0, 10) === today
        ? "working"
        : "missed") as Exclude<StatusFilter, "">,
  }));

  const stats = {
    total: withStatus.length,
    complete: withStatus.filter((r) => r.st === "complete").length,
    working: withStatus.filter((r) => r.st === "working").length,
    missed: withStatus.filter((r) => r.st === "missed").length,
  };

  const filtered = status === "" ? withStatus : withStatus.filter((r) => r.st === status);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const rows: AttendanceRow[] = pageItems.map(({ item }) => ({
    id: item.id,
    workDateISO: item.workDate.toISOString().slice(0, 10),
    checkInAt: item.checkInAt.toISOString(),
    checkOutAt: item.checkOutAt?.toISOString() ?? null,
    workMinutes: item.workMinutes,
    checkInPhotoUrl: item.checkInPhotoUrl,
    checkOutPhotoUrl: item.checkOutPhotoUrl,
    user: {
      id: item.user.id,
      firstName: item.user.firstName,
      lastName: item.user.lastName,
      studentId: item.user.studentId,
      shopCode: item.user.shopCode,
    },
  }));

  const csvRows = pageItems.map(({ item, st }) => {
    const d = item.workDate;
    const date = `${dayNum.format(d)} ${monthShort.format(d)}`;
    const time = (v: Date | null) => (v ? timeFmt.format(v) : "–");
    const h =
      item.workMinutes != null
        ? `${Math.floor(item.workMinutes / 60)} ชม. ${item.workMinutes % 60} น.`
        : "–";
    return [
      `${item.user.firstName} ${item.user.lastName}`,
      item.user.studentId ?? "–",
      item.user.shopCode ?? "–",
      date,
      time(item.checkInAt),
      time(item.checkOutAt),
      h,
      STATUS_LABEL[st],
    ];
  });

  const linkBase: Record<string, string> = {
    month: String(month),
    year: String(year),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.shopCode ? { shopCode: filters.shopCode } : {}),
    ...(filters.date ? { date: filters.date } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
  };

  const preserved: Record<string, string> = {
    ...linkBase,
    ...(status ? { status } : {}),
  };

  return (
    <AttendanceManager
      rows={rows}
      todayISO={today}
      month={month}
      year={year}
      monthLabel={monthLongFmt.format(new Date(Date.UTC(year, month - 1, 1)))}
      linkBase={linkBase}
      filters={{
        q: filters.q ?? "",
        shopCode: filters.shopCode ?? "",
        date: filters.date ?? "",
        sort: filters.sort ?? "desc",
      }}
      shopCodes={shopCodes}
      stats={stats}
      status={status}
      csvRows={csvRows}
      csvFilename={`การลงเวลา_${year}-${String(month).padStart(2, "0")}.csv`}
      pager={
        <Pager
          pathname="/admin/attendance"
          params={preserved}
          page={safePage}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${filtered.length} รายการ`}
        />
      }
    />
  );
}
