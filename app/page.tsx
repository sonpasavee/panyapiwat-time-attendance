import Link from "next/link";
import type { ReactNode } from "react";

import { currentUser } from "@/lib/auth";

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const features: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: "เช็กอิน–เช็กเอาท์",
    desc: "บันทึกเวลาเข้าและออกงาน พร้อมแนบรูปถ่ายและหมายเหตุ",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    title: "บันทึกเงินรายวัน",
    desc: "ใส่เงินเข้าตอนเข้างาน เงินออกตอนออกงาน เลือก TrueMoney หรือเงินสด",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6.5 9.5v.01M17.5 14.5v.01" />
      </svg>
    ),
  },
  {
    title: "แจ้งลา",
    desc: "บันทึกวันหยุด ลาป่วย และลากิจ พร้อมดูประวัติย้อนหลัง",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "สรุปชั่วโมงรายเดือน",
    desc: "ดูชั่วโมงทำงานรวมของแต่ละเดือนได้ทันที",
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

export default async function HomePage() {
  const session = await currentUser();
  const dashboardHref =
    session?.role === "ADMIN"
      ? "/admin"
      : session?.role === "STUDENT"
        ? "/student"
        : null;

  return (
    <main
      className="flex min-h-screen flex-col items-center gap-7 px-6 pb-10 pt-14 text-white"
      style={{
        background:
          "radial-gradient(900px 520px at 15% 0%, rgba(96,165,240,0.30), rgba(96,165,240,0) 60%), linear-gradient(180deg, #0e4a86 0%, #0a2e5a 100%)",
      }}
    >
      {/* Header */}
      <header className="flex w-full max-w-[720px] flex-col items-center gap-[18px] text-center">
        {/* TODO: เปลี่ยนเป็นโลโก้จริงของศูนย์การเรียน เช่น <Image src="/logo.png" ... /> */}
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[22px] bg-white text-[#0b2f5c] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <svg
            width="46"
            height="46"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="โลโก้ศูนย์การเรียน"
          >
            <path d="M2 9l10-5 10 5-10 5-10-5z" />
            <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
            <path d="M22 9v6" />
          </svg>
        </div>

        <h1 className="text-[28px] font-bold leading-[1.35] sm:text-[38px]">
          <span className="block">ระบบบันทึกการฝึกอาชีพ</span>
          <span className="block">ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่น</span>
        </h1>

        <p className="max-w-[560px] text-base leading-[1.75] text-white/90">
          ระบบสำหรับบันทึกเวลาเข้าปฏิบัติงาน เวลาออกปฏิบัติงาน
          เงินสดที่นำเข้าปฏิบัติงาน และการแจ้งลาปฏิบัติงานของผู้ฝึกอาชีพ
        </p>
      </header>

      {/* Login buttons */}
      <div className="flex w-full max-w-[720px] flex-wrap gap-3">
        {dashboardHref ? (
          <Link
            href={dashboardHref}
            className="flex min-h-14 flex-[1_1_300px] items-center justify-center gap-2.5 rounded-[14px] bg-white px-6 text-[17px] font-semibold text-[#0b2f5c] shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#ffd666]"
          >
            ไปหน้าของฉัน
          </Link>
        ) : (
          <>
            <Link
              href="/login?role=student"
              className="flex min-h-14 flex-[1_1_300px] items-center justify-center gap-2.5 rounded-[14px] bg-white px-6 text-[17px] font-semibold text-[#0b2f5c] shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#ffd666]"
            >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          เข้าสู่ระบบสำหรับผู้ฝึกอาชีพ
        </Link>

        <Link
          href="/login?role=admin"
          className="flex min-h-14 flex-[1_1_300px] items-center justify-center gap-2.5 rounded-[14px] bg-[#1d63d8] px-6 text-[17px] font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition hover:bg-[#1a56bd] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#ffd666]"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M3 9h18" />
            <path d="M8 14h4" />
          </svg>
          เข้าสู่ระบบสำหรับเจ้าหน้าที่ศูนย์การเรียน
        </Link>
          </>
        )}
      </div>

      {/* Account notice */}
      <div className="w-full max-w-[720px] rounded-[14px] border border-white/25 bg-white/10 px-[22px] py-4 text-center text-[15px] leading-[1.7]">
        หากท่านยังไม่มีบัญชี
        กรุณาติดต่อเจ้าหน้าที่ศูนย์การเรียนเพื่อขอรับชื่อผู้ใช้และรหัสผ่านก่อนเข้าใช้งานระบบ
      </div>

      {/* Features */}
      <section className="mt-2 flex w-full max-w-[980px] flex-col items-center gap-4">
        <h2 className="text-xl font-semibold">ใช้งานอะไรได้บ้าง</h2>
        <ul className="flex w-full flex-wrap gap-3.5">
          {features.map((f) => (
            <li
              key={f.title}
              className="flex flex-[1_1_210px] flex-col gap-2.5 rounded-2xl border border-white/15 bg-white/[0.08] p-5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                {f.icon}
              </div>
              <div className="text-base font-semibold">{f.title}</div>
              <div className="text-sm leading-[1.65] text-white/80">
                {f.desc}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Usage notice */}
      <div className="w-full max-w-[720px] rounded-[14px] border border-white/20 bg-black/30 px-[22px] py-4 text-center text-[13.5px] leading-[1.75] text-white/90">
        ข้อมูลในระบบนี้ใช้เพื่อการบันทึกการฝึกอาชีพของศูนย์การเรียนเท่านั้น
        ห้ามคัดลอก เผยแพร่ หรือนำไปใช้โดยไม่ได้รับอนุญาต
      </div>

      <footer className="text-center text-[13px] text-white/70">
        ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่น
      </footer>
    </main>
  );
}
