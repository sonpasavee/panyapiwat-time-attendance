import { requireAdminPage } from "@/lib/page-auth";
import { formatDate, formatTime } from "@/lib/format";
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

import Pager from "../../components/pager";
import { Badge, Card } from "../../components/ui";

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

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const raw: Record<string, string> = {};
  for (const key of ["q", "shopCode", "date", "status", "sort"] as const) {
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
  const { page, pageSize, skip } = pagination(query);

  const where = buildAdminAttendanceFilter({
    date: filters.date,
    monthRange: filters.date ? undefined : monthRange(year, month),
    shopCode: filters.shopCode,
    status: filters.status,
    query: filters.q,
  });

  const { items, total } = await listAdminAttendance(
    where,
    skip,
    pageSize,
    filters.sort ?? "desc",
  );
  const totalPages = Math.ceil(total / pageSize);

  const preserved: Record<string, string> = {
    ...raw,
    month: String(month),
    year: String(year),
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">การลงเวลา</h1>
        <p className="mt-0.5 text-[15px] muted">
          รายการลงเวลาทั้งหมด{filters.date ? ` วันที่ ${formatDate(new Date(`${filters.date}T00:00:00.000Z`))}` : ` เดือน ${month}/${year}`} ({total} รายการ)
        </p>
      </header>

      <Card label="ตัวกรอง" className="card-pad">
        <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-q" className="field-label">ค้นหาชื่อ / รหัส</label>
            <input id="att-q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder="ชื่อ / รหัสนักศึกษา…" maxLength={100} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-shop" className="field-label">รหัสร้าน</label>
            <input id="att-shop" name="shopCode" type="text" defaultValue={filters.shopCode ?? ""} placeholder="เช่น TEST01" maxLength={40} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-date" className="field-label">วันที่ (เจาะจง)</label>
            <input id="att-date" name="date" type="date" defaultValue={filters.date ?? ""} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-status" className="field-label">สถานะ</label>
            <select id="att-status" name="status" defaultValue={filters.status ?? ""} className="input min-h-[44px]">
              <option value="">ทั้งหมด</option>
              <option value="checked-in">เช็กอินแล้ว (ยังไม่เอาท์)</option>
              <option value="checked-out">เช็กเอาท์แล้ว</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-month" className="field-label">เดือน</label>
            <input id="att-month" name="month" type="number" min={1} max={12} defaultValue={month} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-year" className="field-label">ปี</label>
            <input id="att-year" name="year" type="number" min={2000} max={2200} defaultValue={year} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-sort" className="field-label">เรียง</label>
            <select id="att-sort" name="sort" defaultValue={filters.sort ?? "desc"} className="input min-h-[44px]">
              <option value="desc">ใหม่ → เก่า</option>
              <option value="asc">เก่า → ใหม่</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">ค้นหา</button>
          </div>
        </form>
      </Card>

      <Card label="รายการลงเวลา" className="overflow-hidden">
        {items.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">ไม่พบข้อมูลตามเงื่อนไข</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">รายการลงเวลา</caption>
              <thead>
                <tr>
                  <th scope="col">ชื่อ</th>
                  <th scope="col">รหัส</th>
                  <th scope="col">ร้าน</th>
                  <th scope="col">วันที่</th>
                  <th scope="col">เช็กอิน</th>
                  <th scope="col">เช็กเอาท์</th>
                  <th scope="col">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.user.firstName} {item.user.lastName}</td>
                    <td>{item.user.studentId ?? item.user.employeeCode ?? "–"}</td>
                    <td>{item.user.shopCode ?? "–"}</td>
                    <td>{formatDate(item.workDate)}</td>
                    <td>{formatTime(item.checkInAt)}</td>
                    <td>{formatTime(item.checkOutAt)}</td>
                    <td>
                      {item.checkOutAt ? <Badge tone="green">ครบ</Badge> : <Badge tone="blue">กำลังทำงาน</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          pathname="/admin/attendance"
          params={preserved}
          page={page}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${total} รายการ`}
        />
      </Card>
    </div>
  );
}
