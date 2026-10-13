import { requireStudentPage } from "@/lib/page-auth";
import { formatDate } from "@/lib/format";
import { pagination } from "@/validators/api";
import { listMyLeaves } from "@/services/leave.service";

import LeaveForm from "../../components/leave-form";
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
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">การลา</h1>
        <p className="mt-0.5 text-[15px] muted">
          แจ้งวันหยุด ลาป่วย และลากิจ (ไม่ต้องรออนุมัติ)
        </p>
      </header>

      <Card labelledBy="new-leave-h" className="card-pad">
        <h2 id="new-leave-h" className="m-0 text-[19px] font-semibold">แจ้งลา</h2>
        <div className="mt-4">
          <LeaveForm />
        </div>
      </Card>

      <Card labelledBy="leave-hist-h" className="card-pad">
        <h2 id="leave-hist-h" className="m-0 text-[19px] font-semibold">
          ประวัติการลา ({leaves.total} รายการ)
        </h2>
        {leaves.items.length === 0 ? (
          <p className="muted mt-3.5 text-sm">ยังไม่มีประวัติการลา</p>
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
        <Pager
          pathname="/student/leaves"
          params={{}}
          page={page}
          totalPages={totalPages}
          numbered
        />
      </Card>
    </div>
  );
}
