import { requireAdminPage } from "@/lib/page-auth";
import { monthYear } from "@/validators/api";
import { getAdminMonthlyReport } from "@/services/monthly-report.service";

import { Card } from "../../components/ui";

export const instant = false;

type SearchParams = {
  month?: string | string[];
  year?: string | string[];
  shopCode?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month) ? { month: first(params.month)! } : {}),
      ...(first(params.year) ? { year: first(params.year)! } : {}),
    }),
  );
  const shopCode = first(params.shopCode)?.trim() || "";

  const report = await getAdminMonthlyReport(month, year, {
    ...(shopCode ? { shopCode } : {}),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">รายงานรายเดือน</h1>
        <p className="mt-0.5 text-[15px] muted">
          สรุปชั่วโมงทำงานรายคน {month}/{year}
          {shopCode ? ` • ร้าน ${shopCode}` : ""} •
          มาทำงาน {report.totals.attendanceDays} ครั้ง •
          ครบกะ {report.totals.completeDays} ครั้ง
        </p>
      </header>

      <Card label="ตัวกรอง" className="card-pad">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rep-month" className="field-label">เดือน</label>
            <input id="rep-month" name="month" type="number" min={1} max={12} defaultValue={month} className="input min-h-[44px] w-28" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rep-year" className="field-label">ปี</label>
            <input id="rep-year" name="year" type="number" min={2000} max={2200} defaultValue={year} className="input min-h-[44px] w-32" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rep-shop" className="field-label">รหัสร้าน</label>
            <input id="rep-shop" name="shopCode" type="text" defaultValue={shopCode} placeholder="ทั้งหมด" maxLength={40} className="input min-h-[44px] w-40" />
          </div>
          <button type="submit" className="btn btn-primary">ดูรายงาน</button>
        </form>
      </Card>

      <Card label="ชั่วโมงรายคน" className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3.5">
          <h2 className="m-0 text-[19px] font-semibold">
            ชั่วโมงรายคน ({report.users.length} คน)
          </h2>
        </div>
        {report.users.length === 0 ? (
          <p className="muted px-6 pb-6 text-sm">เดือนนี้ยังไม่มีข้อมูลการลงเวลา</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">รายงานชั่วโมงรายเดือนรายคน</caption>
              <thead>
                <tr>
                  <th scope="col">ชื่อ</th>
                  <th scope="col">รหัส</th>
                  <th scope="col">ร้าน</th>
                  <th scope="col">วันมา</th>
                  <th scope="col">ครบกะ</th>
                  <th scope="col">ชั่วโมงรวม</th>
                </tr>
              </thead>
              <tbody>
                {report.users.map((row) => (
                  <tr key={row.user.id}>
                    <td className="font-semibold">{row.user.firstName} {row.user.lastName}</td>
                    <td>{row.user.studentId ?? row.user.employeeCode ?? "–"}</td>
                    <td>{row.user.shopCode ?? "–"}</td>
                    <td>{row.attendanceDays}</td>
                    <td>{row.completeDays}</td>
                    <td className="font-semibold">{row.hours} ชม. {row.minutes} นาที</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
