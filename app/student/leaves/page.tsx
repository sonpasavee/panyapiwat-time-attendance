import { requireStudentPage } from "@/lib/page-auth";
import { formatDate } from "@/lib/format";
import { pagination } from "@/validators/api";
import { listMyLeaves } from "@/services/leave.service";

import LeavePanel from "./leave-panel";
import Pager from "../../components/pager";
import { Card, LeaveBadge } from "../../components/ui";

export const instant = false;

type SearchParams = {
  page?: string | string[];
  pageSize?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentLeavesPage({
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

  const leaves = await listMyLeaves(session.id, skip, pageSize);
  const totalPages = Math.ceil(leaves.total / pageSize);

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">การลา</h1>
        <p className="mt-0.5 text-[15px] muted">
          แจ้งวันหยุด ลาป่วย และลากิจ (ไม่ต้องรออนุมัติ)
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card labelledBy="new-leave-h" className="card-pad">
          <h2 id="new-leave-h" className="m-0 text-[19px] font-semibold">แจ้งลา</h2>
          <LeavePanel />
        </Card>

        <Card labelledBy="leave-hist-h" className="card-pad">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="leave-hist-h" className="m-0 text-[19px] font-semibold">
              ประวัติการลา
            </h2>
            <span className="text-sm muted">({leaves.total} รายการ)</span>
          </div>

          {leaves.items.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-14 text-center">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf1ff]"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d63d8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M9 15l2 2 4-4" /></svg>
              </span>
              <p className="m-0 mt-4 text-[16px] font-bold">ยังไม่มีประวัติการลา</p>
              <p className="m-0 mt-1 text-sm muted">ใบลาที่บันทึกจะแสดงที่นี่</p>
            </div>
          ) : (
            <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
              {leaves.items.map((leave) => (
                <li key={leave.id} className="rounded-xl bg-[#f8fafd] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <LeaveBadge type={leave.type} />
                    <span className="text-sm text-[#33425b]">
                      {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </span>
                  </div>
                  {leave.reason && (
                    <p className="mt-2 text-[13px] muted">{leave.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {totalPages > 1 && (
        <Card label="เปลี่ยนหน้าประวัติการลา" className="overflow-hidden">
          <Pager
            pathname="/student/leaves"
            params={{}}
            page={page}
            totalPages={totalPages}
            numbered
          />
        </Card>
      )}
    </div>
  );
}
