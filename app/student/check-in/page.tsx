import { requireStudentPage } from "@/lib/page-auth";
import { formatMinutes, formatSpent, formatThaiHeader, formatTime } from "@/lib/format";
import { getTodayAttendance } from "@/services/attendance.service";
import { summarizeDailyMoney } from "@/services/money-tracker.logic";

import AttendanceForm from "../../components/attendance-form";
import { Card } from "../../components/ui";

export const instant = false;

function ArrowInIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1750b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

function ArrowOutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function CheckIcon({ color = "#ffffff" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function InfoCard({
  icon,
  chipBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  chipBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-5">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl"
        style={{ background: chipBg }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="muted block text-[13px]">{label}</span>
        <span className="block text-[20px] font-bold leading-snug break-words sm:text-[22px]">{value}</span>
      </span>
    </div>
  );
}

function TimelineDot({ state }: { state: "done-blue" | "done-green" | "current" | "todo" }) {
  if (state === "done-blue") {
    return (
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#1d63d8]">
        <CheckIcon />
      </span>
    );
  }
  if (state === "done-green") {
    return (
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#16a34a]">
        <CheckIcon />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border-[2.5px] border-[#1d63d8] bg-white">
        <span className="h-2.5 w-2.5 rounded-full bg-[#1d63d8]" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#e8edf5]">
      <span className="h-2.5 w-2.5 rounded-full bg-[#8696ae]" />
    </span>
  );
}

function PhotoBox({
  label,
  url,
  name,
}: {
  label: string;
  url?: string | null;
  name: string;
}) {
  return (
    <figure className="m-0 flex min-w-0 flex-1 flex-col gap-2">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={`ดู${label}ขนาดใหญ่`}
          className="block overflow-hidden rounded-2xl border border-[#e3e9f2]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="aspect-square w-full object-cover" />
        </a>
      ) : (
        <div
          aria-label={`${label} (ยังไม่มีรูป)`}
          className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-[#c3cfe0] bg-white"
        >
          <span className="muted px-2 text-center text-sm">{label}</span>
        </div>
      )}
      <figcaption className="muted text-center text-[13px]">{name}</figcaption>
    </figure>
  );
}

export default async function StudentCheckInPage() {
  const session = await requireStudentPage();
  const today = await getTodayAttendance(session.id);
  const checkedIn = !!today;
  const checkedOut = !!today?.checkOutAt;
  const money = summarizeDailyMoney(today?.money ?? []);
  const cashSpent = formatSpent(money.CASH.spent);
  const trueSpent = formatSpent(money.TRUEMONEY.spent);
  const totalSpent = formatSpent(money.totalSpent);

  const inTime = checkedIn ? `${formatTime(today?.checkInAt)} น.` : "–";
  const outTime = checkedOut ? `${formatTime(today?.checkOutAt)} น.` : "–";
  const heroTitle = checkedOut
    ? formatMinutes(today?.workMinutes)
    : checkedIn
      ? "กำลังทำงาน"
      : "ยังไม่เช็กอิน";
  const heroSub = checkedOut
    ? `เวลาทำงานวันนี้ • ${formatTime(today?.checkInAt)} – ${formatTime(today?.checkOutAt)} น.`
    : checkedIn
      ? `เริ่มงาน • ${formatTime(today?.checkInAt)} น.`
      : "เช็กอินเพื่อเริ่มบันทึกเวลาทำงาน";

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">เช็กอิน / เช็กเอาท์</h1>
          <p className="mt-0.5 text-[15px] muted">
            บันทึกเวลาเข้า–ออกงานพร้อมรูปถ่ายและเงินส่วนตัว
          </p>
        </div>
        {checkedOut ? (
          <span className="inline-flex min-h-[36px] items-center rounded-full bg-[#dcfce7] px-4 text-[13px] font-semibold text-[#14532d]">
            บันทึกครบแล้ว
          </span>
        ) : checkedIn ? (
          <span className="inline-flex min-h-[36px] items-center gap-2 rounded-full bg-[#dbeafe] px-4 text-[13px] font-semibold text-[#1e3a8a]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#1d63d8]" />
            กำลังทำงาน
          </span>
        ) : (
          <span className="inline-flex min-h-[36px] items-center rounded-full bg-[#e2e8f0] px-4 text-[13px] font-semibold text-[#334155]">
            ยังไม่เช็กอิน
          </span>
        )}
      </header>

      {/* การ์ดฮีโร่ */}
      <section
        aria-label="สรุปเวลาทำงานวันนี้"
        className="relative overflow-hidden rounded-[20px] p-7 text-white sm:p-8"
        style={{ background: "linear-gradient(120deg, #1c5fd0 0%, #2f7bf0 55%, #6aa5f7 100%)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-16 right-28 h-56 w-56 rounded-full bg-white/10"
        />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="m-0 text-[15px] text-white/90">{formatThaiHeader()}</p>
            <p className="m-0 mt-2 text-[clamp(1.75rem,7vw,2.75rem)] font-bold leading-tight break-words sm:text-[44px]">
              {heroTitle}
            </p>
            <p className="m-0 mt-2 text-[15px] text-white/90 break-words">{heroSub}</p>
          </div>
          <span
            aria-hidden="true"
            className="hidden h-28 w-28 flex-none items-center justify-center rounded-full border-2 border-white/60 sm:flex"
          >
            <CheckIcon />
          </span>
        </div>
      </section>

      {/* การ์ดข้อมูล 3 ใบ */}
      <section aria-label="เวลาเช็กอินและสถานะ" className="grid gap-4 sm:grid-cols-3">
        <InfoCard icon={<ArrowInIcon />} chipBg="#eaf1ff" label="เช็กอิน" value={inTime} />
        <InfoCard icon={<ArrowOutIcon />} chipBg="#fef3c7" label="เช็กเอาท์" value={outTime} />
        <InfoCard
          icon={<CheckIcon color="#14532d" />}
          chipBg="#dcfce7"
          label="สถานะ"
          value={checkedOut ? "ครบ" : checkedIn ? "กำลังทำงาน" : "ยังไม่เช็กอิน"}
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* ไทม์ไลน์ */}
        <section aria-labelledby="timeline-h" className="card card-pad">
          <h2 id="timeline-h" className="m-0 text-[17px] font-semibold">ไทม์ไลน์วันนี้</h2>
          <ol className="m-0 mt-5 list-none p-0">
            <li className="flex gap-3.5">
              <span className="flex flex-col items-center">
                <TimelineDot state={checkedIn ? "done-blue" : "todo"} />
                <span aria-hidden="true" className="w-0.5 flex-1 bg-[#e3e9f2]" />
              </span>
              <span className="pb-6">
                <span className="block text-[15px] font-semibold">เช็กอินเข้างาน</span>
                <span className="muted mt-0.5 block text-sm">{inTime}</span>
              </span>
            </li>
            <li className="flex gap-3.5">
              <TimelineDot
                state={checkedOut ? "done-green" : checkedIn ? "current" : "todo"}
              />
              <span className="pb-1">
                <span className="block text-[15px] font-semibold">เช็กเอาท์ออกงาน</span>
                <span className="muted mt-0.5 block text-sm">
                  {checkedOut ? outTime : checkedIn ? "กำลังทำงาน…" : "–"}
                </span>
              </span>
            </li>
          </ol>
        </section>

        {/* รูปถ่าย */}
        <section aria-labelledby="photos-h" className="card card-pad">
          <h2 id="photos-h" className="m-0 text-[17px] font-semibold">รูปถ่ายยืนยัน</h2>
          <div className="mt-5 flex flex-col gap-3.5 min-[420px]:flex-row">
            <PhotoBox
              label="รูปเช็กอิน"
              name="เช็กอิน"
              url={today?.checkInPhotoUrl}
            />
            <PhotoBox
              label="รูปเช็กเอาท์"
              name="เช็กเอาท์"
              url={today?.checkOutPhotoUrl}
            />
          </div>
        </section>
      </div>

      {/* สรุปเงินวันนี้ */}
      {checkedIn && (
        <section aria-labelledby="money-h" className="card card-pad">
          <h2 id="money-h" className="m-0 text-[17px] font-semibold">สรุปเงินวันนี้</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">เงินที่นำเข้า คงเหลือ และใช้ไป แยกตามประเภท</caption>
              <thead>
                <tr>
                  <th scope="col">ประเภท</th>
                  <th scope="col">เอาเข้า (บาท)</th>
                  <th scope="col">คงเหลือ (บาท)</th>
                  <th scope="col">ใช้ไป (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold">เงินสด</td>
                  <td className="tabular-nums">฿{money.CASH.in}</td>
                  <td className="tabular-nums">{checkedOut ? `฿${money.CASH.out}` : "–"}</td>
                  <td
                    className="font-semibold tabular-nums"
                    style={cashSpent.isGain ? { color: "#16a34a" } : undefined}
                  >
                    {money.CASH.complete ? cashSpent.text : "รอเช็กเอาท์"}
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">TrueMoney</td>
                  <td className="tabular-nums">฿{money.TRUEMONEY.in}</td>
                  <td className="tabular-nums">{checkedOut ? `฿${money.TRUEMONEY.out}` : "–"}</td>
                  <td
                    className="font-semibold tabular-nums"
                    style={trueSpent.isGain ? { color: "#16a34a" } : undefined}
                  >
                    {money.TRUEMONEY.complete ? trueSpent.text : "รอเช็กเอาท์"}
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">รวม</td>
                  <td className="tabular-nums">–</td>
                  <td className="tabular-nums">–</td>
                  <td
                    className="font-bold tabular-nums"
                    style={{ color: totalSpent.isGain ? "#16a34a" : "#1750b8" }}
                  >
                    {money.complete ? totalSpent.text : "รอเช็กเอาท์"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted mt-3 text-[13px]">
            ใช้ไป = เงินที่เอาเข้า − เงินคงเหลือตอนเช็กเอาท์ (ติดลบ = ได้เงินเพิ่มระหว่างวัน)
          </p>
        </section>
      )}

      {checkedOut ? (
        <div
          role="status"
          className="flex items-center gap-3.5 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-5"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#16a34a]">
            <CheckIcon />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-[#14532d]">
              วันนี้เช็กอินและเช็กเอาท์ครบแล้ว
            </span>
            <span className="mt-0.5 block text-sm text-[#3f6212]">เจอกันใหม่พรุ่งนี้</span>
          </span>
        </div>
      ) : (
        <Card labelledBy="form-h" className="card-pad">
          <h2 id="form-h" className="m-0 text-[19px] font-semibold">
            {!checkedIn ? "เช็กอินเข้างาน" : "เช็กเอาท์ออกงาน"}
          </h2>
          <AttendanceForm action={!checkedIn ? "check-in" : "check-out"} />
        </Card>
      )}
    </div>
  );
}
