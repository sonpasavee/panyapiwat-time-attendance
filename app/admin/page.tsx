import Link from "next/link";

import { requireAdminPage } from "@/lib/page-auth";
import { bangkokDateKey, formatThaiHeader, formatTime } from "@/lib/format";
import { pagination } from "@/validators/api";
import { listUsers } from "@/services/user.service";
import {
  buildAdminAttendanceFilter,
  listAdminAttendance,
} from "@/services/attendance.service";
import { listAdminLeaves } from "@/services/leave.service";

import ExportCsvButton from "../components/export-csv-button";
import Pager from "../components/pager";
import { Badge, Card, StatCard } from "../components/ui";

export const instant = false;

type SearchParams = {
  shopCode?: string | string[];
  status?: string | string[];
  q?: string | string[];
  page?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type RowStatus = "done" | "working" | "leave-sick" | "leave-personal" | "leave-holiday" | "not-in";

function StatusBadge({ status }: { status: RowStatus }) {
  switch (status) {
    case "done":
      return <Badge tone="green">ครบ</Badge>;
    case "working":
      return <Badge tone="blue">กำลังทำงาน</Badge>;
    case "leave-sick":
      return <Badge tone="pink">ลาป่วย</Badge>;
    case "leave-personal":
      return <Badge tone="yellow">ลากิจ</Badge>;
    case "leave-holiday":
      return <Badge tone="gray">วันหยุด</Badge>;
    default:
      return <Badge tone="gray">ยังไม่เช็กอิน</Badge>;
  }
}

const STATUS_LABEL: Record<RowStatus, string> = {
  done: "ครบ",
  working: "กำลังทำงาน",
  "leave-sick": "ลาป่วย",
  "leave-personal": "ลากิจ",
  "leave-holiday": "วันหยุด",
  "not-in": "ยังไม่เช็กอิน",
};

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const shopCode = first(params.shopCode)?.trim() || "";
  const status = first(params.status)?.trim() || "all";
  const q = first(params.q)?.trim().toLowerCase() || "";
  const query = new URLSearchParams({
    ...(first(params.page) ? { page: first(params.page)! } : {}),
  });
  const { page } = pagination(query);
  const pageSize = 7;

  const todayKey = bangkokDateKey();
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);
  const yesterday = new Date(todayDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const [students, todayAtt, todayLeaves, missedOut] = await Promise.all([
    listUsers({ role: "STUDENT", isActive: true }, 0, 500),
    listAdminAttendance(
      buildAdminAttendanceFilter({ date: todayKey }),
      0,
      500,
      "asc",
    ),
    listAdminLeaves(
      { startDate: { lte: todayDate }, endDate: { gte: todayDate } },
      0,
      300,
    ),
    listAdminAttendance(
      buildAdminAttendanceFilter({ date: yesterdayKey, status: "checked-in" }),
      0,
      50,
      "asc",
    ),
  ]);

  const branches = [...new Set(students.items.map((u) => u.shopCode).filter(Boolean))].sort() as string[];

  const attByUser = new Map(todayAtt.items.map((a) => [a.userId, a]));
  const leaveByUser = new Map(todayLeaves.items.map((l) => [l.userId, l]));

  type Row = {
    id: string;
    name: string;
    year: string;
    shop: string;
    checkIn: string;
    checkOut: string;
    photoUrl: string;
    status: RowStatus;
  };

  const inScope = students.items.filter(
    (u) => !shopCode || u.shopCode === shopCode,
  );

  const allRows: Row[] = inScope.map((u) => {
    const att = attByUser.get(u.id);
    const leave = leaveByUser.get(u.id);
    let s: RowStatus = "not-in";
    if (att?.checkOutAt) s = "done";
    else if (att) s = "working";
    else if (leave?.type === "SICK") s = "leave-sick";
    else if (leave?.type === "PERSONAL") s = "leave-personal";
    else if (leave) s = "leave-holiday";
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      year: u.gradeLevel ? `ชั้นปี ${u.gradeLevel}` : "–",
      shop: u.shopCode ?? "–",
      checkIn: att ? formatTime(att.checkInAt) : "–",
      checkOut: att?.checkOutAt ? formatTime(att.checkOutAt) : "–",
      photoUrl: att?.checkInPhotoUrl ?? "",
      status: s,
    };
  });

  const checkedIn = allRows.filter((r) => r.status === "done" || r.status === "working").length;
  const onLeave = allRows.filter((r) => r.status.startsWith("leave")).length;
  const notIn = allRows.length - checkedIn - onLeave;

  const matchStatus = (r: Row) => {
    if (status === "in") return r.status === "done" || r.status === "working";
    if (status === "not") return r.status === "not-in";
    if (status === "leave") return r.status.startsWith("leave");
    return true;
  };
  const matchQ = (r: Row) =>
    !q ||
    r.name.toLowerCase().includes(q) ||
    r.shop.toLowerCase().includes(q);

  const filtered = allRows.filter((r) => matchStatus(r) && matchQ(r));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const pct = (n: number) =>
    allRows.length === 0 ? "0%" : `${((n / allRows.length) * 100).toFixed(1)}%`;
  const donutPct = (n: number) =>
    allRows.length === 0 ? 0 : (n / allRows.length) * 100;
  const donut = `conic-gradient(#1d63d8 0 ${donutPct(checkedIn)}%, #94a3b8 ${donutPct(checkedIn)}% ${donutPct(checkedIn) + donutPct(notIn)}%, #f59e0b ${donutPct(checkedIn) + donutPct(notIn)}% 100%)`;

  const notInNames = allRows.filter((r) => r.status === "not-in").map((r) => r.name);

  const preserved: Record<string, string> = {
    ...(shopCode ? { shopCode } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(q ? { q } : {}),
  };

  const pill = (value: string, label: string) => {
    const active = status === value;
    const href = `/admin?${new URLSearchParams({ ...preserved, ...(value === "all" ? {} : { status: value }) }).toString()}`;
    return active ? (
      <span aria-current="true" className="inline-flex min-h-[36px] items-center rounded-full border border-[#1d63d8] bg-[#eaf1ff] px-3.5 text-[13px] font-semibold text-[#1750b8]">
        {label}
      </span>
    ) : (
      <Link href={href} className="inline-flex min-h-[36px] items-center rounded-full border border-[#c3cfe0] bg-white px-3.5 text-[13px] font-medium text-[#33425b]">
        {label}
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">ภาพรวมวันนี้</h1>
          <p className="mt-0.5 text-[15px] muted">{formatThaiHeader()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <form method="get" className="flex items-center gap-2.5">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            {q && <input type="hidden" name="q" value={q} />}
            <label htmlFor="ov-shop" className="sr-only">สาขา</label>
            <select id="ov-shop" name="shopCode" defaultValue={shopCode} className="input min-h-[44px] w-auto text-sm font-medium">
              <option value="">ทุกสาขา</option>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-outline">กรอง</button>
          </form>
          <Link
            href={`/admin/attendance?date=${todayKey}`}
            className="btn btn-outline"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
            {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }).format(todayDate)}
          </Link>
          <ExportCsvButton
            filename={`attendance-${todayKey}.csv`}
            headers={["ชื่อ", "สาขา", "เช็กอิน", "เช็กเอาท์", "สถานะ"]}
            rows={filtered.map((r) => [r.name, r.shop, r.checkIn, r.checkOut, STATUS_LABEL[r.status]])}
          />
        </div>
      </header>

      {/* Stat cards */}
      <section aria-label="สรุปวันนี้" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .7 3.5 2.6 3.5 5.2" /></svg>}
          iconBg="#e0e7ff" iconColor="#312e81" label="นักศึกษาทั้งหมด" value={allRows.length}
        />
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.8 2.8L16 9.5" /></svg>}
          iconBg="#dbeafe" iconColor="#1750b8" label="เช็กอินแล้ว"
          value={<>{checkedIn}<span className="ml-1.5 text-[13px] font-medium muted">{pct(checkedIn)}</span></>}
        />
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
          iconBg="#e2e8f0" iconColor="#334155" label="ยังไม่เช็กอิน"
          value={<>{notIn}<span className="ml-1.5 text-[13px] font-medium muted">{pct(notIn)}</span></>}
        />
        <StatCard
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>}
          iconBg="#fef3c7" iconColor="#78350f" label="ลาวันนี้"
          value={<>{onLeave}<span className="ml-1.5 text-[13px] font-medium muted">{pct(onLeave)}</span></>}
        />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Table card */}
        <Card label="การลงเวลาวันนี้" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3.5">
            <h2 className="m-0 text-[19px] font-semibold">การลงเวลาวันนี้</h2>
            <form method="get" className="flex h-[42px] w-full max-w-[280px] items-center gap-2 rounded-xl border border-[#c3cfe0] bg-white px-3.5">
              {shopCode && <input type="hidden" name="shopCode" value={shopCode} />}
              {status !== "all" && <input type="hidden" name="status" value={status} />}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b6b82" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <label htmlFor="ov-q" className="sr-only">ค้นหานักศึกษา</label>
              <input id="ov-q" name="q" type="search" defaultValue={first(params.q) ?? ""} placeholder="ค้นหาชื่อ หรือรหัส" maxLength={100} className="w-full min-w-0 border-none bg-transparent text-sm outline-none" />
            </form>
          </div>

          <div className="flex flex-wrap gap-2 px-6 pb-4">
            {pill("all", `ทั้งหมด ${allRows.length}`)}
            {pill("in", `เช็กอินแล้ว ${checkedIn}`)}
            {pill("not", `ยังไม่เช็กอิน ${notIn}`)}
            {pill("leave", `ลา ${onLeave}`)}
          </div>

          {pageRows.length === 0 ? (
            <p className="muted px-6 pb-6 text-sm">ไม่พบข้อมูลตามเงื่อนไข</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <caption className="sr-only">รายการลงเวลานักศึกษาวันนี้</caption>
                <thead>
                  <tr>
                    <th scope="col">นักศึกษา</th>
                    <th scope="col">สาขา</th>
                    <th scope="col">เช็กอิน</th>
                    <th scope="col">เช็กเอาท์</th>
                    <th scope="col">รูป</th>
                    <th scope="col">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="block font-semibold">{r.name}</span>
                        <span className="block text-xs muted">{r.year}</span>
                      </td>
                      <td>{r.shop}</td>
                      <td>{r.checkIn}</td>
                      <td>{r.checkOut}</td>
                      <td>
                        {r.photoUrl ? (
                          <a href={r.photoUrl} target="_blank" rel="noreferrer" aria-label={`ดูรูปเข้างานของ ${r.name}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                          </a>
                        ) : (
                          <span className="muted">–</span>
                        )}
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            pathname="/admin"
            params={preserved}
            page={safePage}
            totalPages={totalPages}
            numbered
            summary={`แสดง ${from}–${to} จาก ${filtered.length} คน`}
          />
        </Card>

        {/* Right column */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card labelledBy="share-h" className="card-pad">
            <h2 id="share-h" className="m-0 text-[17px] font-semibold">สัดส่วนวันนี้</h2>
            <div className="mt-5 flex justify-center">
              <div role="img" aria-label={`เช็กอินแล้ว ${pct(checkedIn)} ยังไม่เช็กอิน ${pct(notIn)} ลา ${pct(onLeave)}`} className="flex h-44 w-44 items-center justify-center rounded-full" style={{ background: donut }}>
                <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-[30px] font-bold leading-none">
                    {allRows.length === 0 ? 0 : Math.round((checkedIn / allRows.length) * 100)}%
                  </span>
                  <span className="text-xs muted">เช็กอินแล้ว</span>
                </div>
              </div>
            </div>
            <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0 text-sm">
              <li className="flex items-center gap-2.5"><span aria-hidden="true" className="h-3 w-3 rounded bg-[#1d63d8]" /><span className="flex-1">เช็กอินแล้ว</span><span className="font-semibold">{checkedIn}</span></li>
              <li className="flex items-center gap-2.5"><span aria-hidden="true" className="h-3 w-3 rounded bg-[#94a3b8]" /><span className="flex-1">ยังไม่เช็กอิน</span><span className="font-semibold">{notIn}</span></li>
              <li className="flex items-center gap-2.5"><span aria-hidden="true" className="h-3 w-3 rounded bg-[#f59e0b]" /><span className="flex-1">ลา</span><span className="font-semibold">{onLeave}</span></li>
            </ul>
          </Card>

          <Card labelledBy="todo-h" className="card-pad">
            <h2 id="todo-h" className="m-0 text-[17px] font-semibold">ต้องติดตาม</h2>
            <ul className="m-0 mt-3.5 flex list-none flex-col gap-2.5 p-0">
              <li className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div>
                    <p className="m-0 text-sm font-semibold text-[#78350f]">ลืมเช็กเอาท์เมื่อวาน</p>
                    <p className="m-0 text-[13px] text-[#78350f]">{missedOut.total} คน</p>
                  </div>
                  <Link href={`/admin/attendance?date=${yesterdayKey}&status=checked-in`} className="btn min-h-[36px] border border-[#d97706] bg-white px-3.5 text-[13px] font-semibold text-[#78350f]">
                    ดูรายชื่อ
                  </Link>
                </div>
                {missedOut.items.length > 0 && (
                  <details className="mt-2 text-[13px] text-[#78350f]">
                    <summary className="cursor-pointer font-medium">ดูรายชื่อย่อ</summary>
                    <ul className="m-1.5 ml-4 list-disc">
                      {missedOut.items.slice(0, 10).map((a) => (
                        <li key={a.id}>{a.user.firstName} {a.user.lastName}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
              <li className="rounded-xl border border-[#e3e9f2] bg-[#f8fafd] p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div>
                    <p className="m-0 text-sm font-semibold">ยังไม่เช็กอินวันนี้</p>
                    <p className="m-0 text-[13px] muted">{notIn} คน</p>
                  </div>
                  <Link href="/admin/users" className="btn btn-outline min-h-[36px] px-3.5 text-[13px] font-semibold">
                    ดูรายชื่อ
                  </Link>
                </div>
                {notInNames.length > 0 && (
                  <details className="muted mt-2 text-[13px]">
                    <summary className="cursor-pointer font-medium">ดูรายชื่อย่อ</summary>
                    <ul className="m-1.5 ml-4 list-disc">
                      {notInNames.slice(0, 10).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            </ul>
          </Card>

          <Card labelledBy="lv-h" className="card-pad">
            <h2 id="lv-h" className="m-0 text-[17px] font-semibold">การลาล่าสุด</h2>
            {todayLeaves.items.length === 0 ? (
              <p className="muted mt-3.5 text-sm">วันนี้ยังไม่มีใบลา</p>
            ) : (
              <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
                {todayLeaves.items.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#f8fafd] px-3.5 py-2.5">
                    <span className="text-sm font-medium">{l.user.firstName} {l.user.lastName}</span>
                    {l.type === "SICK" ? <Badge tone="pink">ลาป่วย</Badge>
                      : l.type === "PERSONAL" ? <Badge tone="yellow">ลากิจ</Badge>
                      : <Badge tone="gray">วันหยุด</Badge>}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-right">
              <Link href="/admin/leaves" className="text-sm font-semibold text-[#1750b8] hover:underline">
                ดูใบลาทั้งหมด →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
