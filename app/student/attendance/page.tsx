import { requireStudentPage } from "@/lib/page-auth";
import { bangkokDateKey, formatDate, formatMinutes, formatTime } from "@/lib/format";
import { monthYear, pagination } from "@/validators/api";
import { monthRange } from "@/lib/time";
import { listMyAttendance } from "@/services/attendance.service";

import Pager from "../../components/pager";
import { AttendanceBadge, Card, CardHeader } from "../../components/ui";

export const instant = false;

type SearchParams = {
  page?: string | string[];
  pageSize?: string | string[];
  month?: string | string[];
  year?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireStudentPage();
  const params = await searchParams;
  const query = new URLSearchParams({
    ...(first(params.page) ? { page: first(params.page)! } : {}),
    ...(first(params.pageSize) ? { pageSize: first(params.pageSize)! } : {}),
  });
  const { page, pageSize, skip } = pagination(query);
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month) ? { month: first(params.month)! } : {}),
      ...(first(params.year) ? { year: first(params.year)! } : {}),
    }),
  );

  const history = await listMyAttendance(
    session.id,
    { userId: session.id, workDate: monthRange(year, month) },
    skip,
    pageSize,
  );
  const totalPages = Math.ceil(history.total / pageSize);
  const todayKey = bangkokDateKey();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">ประวัติลงเวลา</h1>
        <p className="mt-0.5 text-[15px] muted">
          ประวัติการลงเวลาเข้า–ออกงานรายเดือน
        </p>
      </header>

      <Card label="ประวัติการลงเวลา" className="overflow-hidden">
        <form method="get" className="flex flex-wrap items-end gap-3 px-6 pt-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hist-month" className="field-label">เดือน</label>
            <input id="hist-month" name="month" type="number" min={1} max={12} defaultValue={month} className="input min-h-[44px] w-28" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hist-year" className="field-label">ปี</label>
            <input id="hist-year" name="year" type="number" min={2000} max={2200} defaultValue={year} className="input min-h-[44px] w-32" />
          </div>
          <button type="submit" className="btn btn-primary">ดู</button>
        </form>
        <CardHeader
          id="hist-h"
          title={`เดือน ${month}/${year}`}
          aside={<span className="text-sm muted">{history.total} รายการ</span>}
        />
        {history.items.length === 0 ? (
          <p className="muted px-6 pb-6 text-sm">เดือนนี้ยังไม่มีประวัติการลงเวลา</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">ประวัติการลงเวลาเข้า–ออกงาน</caption>
              <thead>
                <tr>
                  <th scope="col">วันที่</th>
                  <th scope="col">เช็กอิน</th>
                  <th scope="col">เช็กเอาท์</th>
                  <th scope="col">เวลาทำงาน</th>
                  <th scope="col">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{formatDate(item.workDate)}</td>
                    <td>{formatTime(item.checkInAt)}</td>
                    <td>{formatTime(item.checkOutAt)}</td>
                    <td className="font-semibold">{formatMinutes(item.workMinutes)}</td>
                    <td>
                      {item.checkOutAt ? (
                        <AttendanceBadge checkedOut />
                      ) : bangkokDateKey(item.workDate) === todayKey ? (
                        <AttendanceBadge checkedOut={false} />
                      ) : (
                        <AttendanceBadge checkedOut={false} missed />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          pathname="/student/attendance"
          params={{ month: String(month), year: String(year) }}
          page={page}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${history.total} รายการ`}
        />
      </Card>
    </div>
  );
}
