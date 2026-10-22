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
  getAdminAttendanceStats,
  listAdminAttendance,
} from "@/services/attendance.service";
import { getAcademicTerms, listShopCodes, listClassGroupFilters } from "@/services/user.service";

import Pager from "../../components/pager";
import AttendanceManager, { type AttendanceRow } from "./attendance-manager";
import "./admin-attendance.css";

export const instant = false;

// 250 คน × 31 วัน = 7,750 แถวต่อเดือน เผื่อพื้นที่สำหรับ export ทั้งหมดตาม filter
const CSV_EXPORT_LIMIT = 20_000;

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
  academicTermId?: string | string[];
  gradeLevel?: string | string[];
  section?: string | string[];
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
  const terms = await getAcademicTerms();
  const requestedTerm = str(params.academicTermId);
  const academicTermId = terms.some((term) => term.id === requestedTerm) ? requestedTerm : terms[0]?.id;

  const raw: Record<string, string> = {};
  for (const key of ["q", "shopCode", "date", "sort", "gradeLevel", "section"] as const) {
    const v = str(params[key]);
    if (v) raw[key] = v;
  }
  if (academicTermId) raw.academicTermId = academicTermId;
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
  const todayDate = new Date(`${today}T00:00:00.000Z`);

  const filterInput = {
    date: filters.date,
    monthRange: filters.date ? undefined : monthRange(year, month),
    shopCode: filters.shopCode,
    gradeLevel: filters.gradeLevel,
    section: filters.section,
    academicTermId,
    query: filters.q,
  };
  const baseWhere = await buildAdminAttendanceFilter(filterInput);
  const where = await buildAdminAttendanceFilter({
    ...filterInput,
    status: status || undefined,
    today: todayDate,
  });

  // ดึงทั้งเดือน (ไม่แตะ service เดิม) แล้วกรองสถานะ + แบ่งหน้าในเพจ
  const [pageResult, stats, shopCodes, classGroupOptions, exportResult] =
    await Promise.all([
      listAdminAttendance(
        where,
        (page - 1) * pageSize,
        pageSize,
        filters.sort ?? "desc",
        academicTermId,
      ),
      getAdminAttendanceStats(baseWhere, todayDate),
      listShopCodes(academicTermId),
      listClassGroupFilters(academicTermId),
      listAdminAttendance(
        where,
        0,
        CSV_EXPORT_LIMIT,
        filters.sort ?? "desc",
        academicTermId,
      ),
    ]);

  const totalPages = Math.max(1, Math.ceil(pageResult.total / pageSize));
  const safePage = Math.min(page, totalPages);
  const items =
    safePage === page
      ? pageResult.items
      : (
          await listAdminAttendance(
            where,
            (safePage - 1) * pageSize,
            pageSize,
            filters.sort ?? "desc",
            academicTermId,
          )
        ).items;
  const statusOf = (item: (typeof items)[number]) =>
    (item.checkOutAt
      ? "complete"
      : item.workDate.toISOString().slice(0, 10) >= today
        ? "working"
        : "missed") as Exclude<StatusFilter, "">;

  const pageItems = items.map((item) => ({
    item,
    st: statusOf(item),
  }));

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

  const csvRows = exportResult.items.map((item) => {
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
      STATUS_LABEL[statusOf(item)],
    ];
  });

  const linkBase: Record<string, string> = {
    month: String(month),
    year: String(year),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.shopCode ? { shopCode: filters.shopCode } : {}),
    ...(filters.gradeLevel ? { gradeLevel: String(filters.gradeLevel) } : {}),
    ...(filters.section ? { section: filters.section } : {}),
    ...(filters.date ? { date: filters.date } : {}),
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(academicTermId ? { academicTermId } : {}),
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
        gradeLevel: filters.gradeLevel ? String(filters.gradeLevel) : "",
        section: filters.section ?? "",
        date: filters.date ?? "",
        sort: filters.sort ?? "desc",
      }}
      shopCodes={shopCodes}
      classGroupOptions={classGroupOptions}
      termOptions={terms}
      academicTermId={academicTermId ?? ""}
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
          summary={`ทั้งหมด ${pageResult.total} รายการ`}
        />
      }
    />
  );
}
