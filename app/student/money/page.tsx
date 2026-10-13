import { requireStudentPage } from "@/lib/page-auth";
import { MONEY_LABEL, formatDate } from "@/lib/format";
import { monthYear } from "@/validators/api";
import { getMyMoneyReport } from "@/services/money-tracker.service";

import { Card, CardHeader, StatCard } from "../../components/ui";

export const instant = false;

type SearchParams = {
  month?: string | string[];
  year?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentMoneyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireStudentPage();
  const params = await searchParams;
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month) ? { month: first(params.month)! } : {}),
      ...(first(params.year) ? { year: first(params.year)! } : {}),
    }),
  );

  const money = await getMyMoneyReport(session.id, month, year);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">เงินส่วนตัว</h1>
          <p className="mt-0.5 text-[15px] muted">เดือน {month}/{year}</p>
        </div>
        <form method="get" className="flex items-end gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="money-month" className="field-label">เดือน</label>
            <input id="money-month" name="month" type="number" min={1} max={12} defaultValue={month} className="input min-h-[44px] w-24" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="money-year" className="field-label">ปี</label>
            <input id="money-year" name="year" type="number" min={2000} max={2200} defaultValue={year} className="input min-h-[44px] w-28" />
          </div>
          <button type="submit" className="btn btn-primary">ดู</button>
        </form>
      </header>

      <div aria-label="สรุปยอดเงิน" className="grid gap-4 sm:grid-cols-3">
        {(["CASH", "TRUEMONEY"] as const).map((type) => (
          <StatCard
            key={type}
            icon={type === "CASH"
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="16.5" cy="13.5" r="1.2" /></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M11 18h2" /></svg>}
            iconBg={type === "CASH" ? "#fef3c7" : "#e0e7ff"}
            iconColor={type === "CASH" ? "#78350f" : "#312e81"}
            label={`${MONEY_LABEL[type]}คงเหลือ`}
            value={`฿${money.totals[type].net}`}
            sub={`เข้า ฿${money.totals[type].in} • ออก ฿${money.totals[type].out}`}
          />
        ))}
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
          iconBg="#dbeafe"
          iconColor="#1750b8"
          label="คงเหลือรวม"
          value={`฿${money.totals.net}`}
          sub="ยอดบันทึกส่วนตัว อาจไม่ตรงเงินในกระเป๋าจริง"
        />
      </div>

      <Card label="รายการเดินเงิน" className="overflow-hidden">
        <CardHeader
          id="money-h"
          title="รายการเดินเงิน"
          aside={<span className="text-sm muted">{money.entries.length} รายการ</span>}
        />
        {money.entries.length === 0 ? (
          <p className="muted px-6 pb-6 text-sm">เดือนนี้ยังไม่มีรายการเดินเงิน</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">รายการเดินเงินส่วนตัว</caption>
              <thead>
                <tr>
                  <th scope="col">วันที่ทำงาน</th>
                  <th scope="col">ทิศทาง</th>
                  <th scope="col">จำนวน</th>
                  <th scope="col">ประเภท</th>
                </tr>
              </thead>
              <tbody>
                {money.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="font-medium">{formatDate(entry.attendance.workDate)}</td>
                    <td>{entry.direction === "IN" ? "เงินเข้า" : "เงินออก"}</td>
                    <td className="font-semibold">฿{String(entry.amount)}</td>
                    <td>{MONEY_LABEL[entry.moneyType] ?? entry.moneyType}</td>
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
