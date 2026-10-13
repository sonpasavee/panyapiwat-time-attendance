import { requireAdminPage } from "@/lib/page-auth";
import { formatDate } from "@/lib/format";
import { adminLeavesQuerySchema, monthYear, pagination } from "@/validators/api";
import { buildAdminLeaveFilter, listAdminLeaves } from "@/services/leave.service";

import Pager from "../../components/pager";
import { Card, LeaveBadge } from "../../components/ui";

export const instant = false;

type SearchParams = {
  type?: string | string[];
  shopCode?: string | string[];
  month?: string | string[];
  year?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
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

  const raw: Record<string, string> = {};
  for (const key of ["type", "shopCode"] as const) {
    const v = first(params[key])?.trim();
    if (v) raw[key] = v;
  }
  const filters = adminLeavesQuerySchema.parse(raw);
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month)?.trim() ? { month: first(params.month)!.trim() } : {}),
      ...(first(params.year)?.trim() ? { year: first(params.year)!.trim() } : {}),
    }),
  );
  const query = new URLSearchParams({
    ...(first(params.page) ? { page: first(params.page)! } : {}),
    ...(first(params.pageSize) ? { pageSize: first(params.pageSize)! } : {}),
  });
  const { page, pageSize, skip } = pagination(query);

  const { items, total } = await listAdminLeaves(
    buildAdminLeaveFilter({ type: filters.type, month, year, shopCode: filters.shopCode }),
    skip,
    pageSize,
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
        <h1 className="m-0 text-[28px] font-bold leading-snug">การลา</h1>
        <p className="mt-0.5 text-[15px] muted">
          ใบลาเดือน {month}/{year} ({total} ใบ)
        </p>
      </header>

      <Card label="ตัวกรอง" className="card-pad">
        <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="leaves-type" className="field-label">ประเภท</label>
            <select id="leaves-type" name="type" defaultValue={filters.type ?? ""} className="input min-h-[44px]">
              <option value="">ทั้งหมด</option>
              <option value="SICK">ลาป่วย</option>
              <option value="PERSONAL">ลากิจ</option>
              <option value="HOLIDAY">วันหยุด</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="leaves-shop" className="field-label">รหัสร้าน</label>
            <input id="leaves-shop" name="shopCode" type="text" defaultValue={filters.shopCode ?? ""} placeholder="เช่น TEST01" maxLength={40} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="leaves-month" className="field-label">เดือน</label>
            <input id="leaves-month" name="month" type="number" min={1} max={12} defaultValue={month} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="leaves-year" className="field-label">ปี</label>
            <input id="leaves-year" name="year" type="number" min={2000} max={2200} defaultValue={year} className="input min-h-[44px]" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">ค้นหา</button>
          </div>
        </form>
      </Card>

      <Card label="ใบลา" className="overflow-hidden">
        {items.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">ไม่พบใบลาตามเงื่อนไข</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">ใบลา</caption>
              <thead>
                <tr>
                  <th scope="col">ชื่อ</th>
                  <th scope="col">รหัส</th>
                  <th scope="col">ประเภท</th>
                  <th scope="col">ช่วงวันลา</th>
                  <th scope="col">เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                {items.map((leave) => (
                  <tr key={leave.id}>
                    <td className="font-semibold">{leave.user.firstName} {leave.user.lastName}</td>
                    <td>{leave.user.studentId ?? "–"}</td>
                    <td><LeaveBadge type={leave.type} /></td>
                    <td>{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</td>
                    <td>{leave.reason ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          pathname="/admin/leaves"
          params={preserved}
          page={page}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${total} ใบ`}
        />
      </Card>
    </div>
  );
}
