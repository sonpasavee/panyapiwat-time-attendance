import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { currentUser } from "@/lib/auth";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const features: { title: string; desc: string; icon: ReactNode; color: string }[] = [
  {
    title: "เช็กอิน/เช็กเอาท์พร้อมรูป",
    desc: "บันทึกเวลาเข้า–ออกงาน แนบรูปถ่าย ยืนยันถูกต้อง",
    icon: (
      <svg {...iconProps}>
        <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    color: "bg-[#e5edff] text-[#1d63d8]",
  },
  {
    title: "เงินส่วนตัว",
    desc: "กรอกเงินเข้าและเงินออก (สด/TrueMoney) ระบบคำนวณไว้ให้",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 10h.01M17 14h.01M10 12h4" />
      </svg>
    ),
    color: "bg-[#fff1c9] text-[#9a6500]",
  },
  {
    title: "ลาและเลือกวันหยุด",
    desc: "แจ้งลาป่วย/ลากิจ และเลือกวันหยุดจากปฏิทิน ไม่ต้องรออนุมัติ",
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M4 10h16m-8 3v4m-2-2h4" />
      </svg>
    ),
    color: "bg-[#e9eaff] text-[#5155c9]",
  },
  {
    title: "รายงานและ Excel",
    desc: "ดูข้อมูลชั่วโมงและการเงินรายคน ส่งออกเป็นไฟล์ Excel ได้",
    icon: (
      <svg {...iconProps}>
        <path d="M4 19h16M7 16v-5m5 5V6m5 10V9" />
      </svg>
    ),
    color: "bg-[#ddf5e6] text-[#19834a]",
  },
];

const steps = [
  { title: "เช็กอิน", desc: "ถ่ายรูป พร้อมบันทึกเงินเข้า" },
  { title: "ทำงาน", desc: "เวลานับให้อัตโนมัติ" },
  { title: "เช็กเอาท์", desc: "ถ่ายรูป พร้อมบันทึกเงินออก" },
  { title: "ดูสรุป", desc: "เช็กยอดสะสมได้ทันที" },
];

async function HomeCta() {
  const session = await currentUser();
  const dashboardHref =
    session?.role === "ADMIN"
      ? "/admin"
      : session?.role === "STUDENT"
        ? "/student"
        : null;

  return (
    <Link
      href={dashboardHref ?? "/login?role=student"}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#1750b8] transition hover:bg-[#eaf1ff] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {dashboardHref ? "ไปหน้าของฉัน" : "เข้าสู่ระบบ"}
    </Link>
  );
}

function CtaFallback() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-11 w-28 animate-pulse rounded-full bg-white/30"
    />
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 pb-8 text-[#0f1f3a] sm:px-8">
      <div className="mx-auto max-w-[1120px]">
        <header className="flex min-h-[76px] items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="ระบบบันทึกการฝึกอาชีพ - หน้าหลัก"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d63d8] text-white">
              <GraduationIcon />
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight">
                ระบบฝึกอาชีพ
              </span>
              <span className="block text-[10px] leading-tight text-[#5b6b82]">
                ปัญญาภิวัฒน์ขอนแก่น
              </span>
            </span>
          </Link>
          <nav aria-label="เมนูหลัก" className="flex items-center gap-5 text-xs sm:gap-8 sm:text-sm">
            <a
              href="#features"
              className="rounded text-[#5b6b82] hover:text-[#1750b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8]"
            >
              ฟีเจอร์
            </a>
            <a
              href="#how-it-works"
              className="rounded text-[#5b6b82] hover:text-[#1750b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8]"
            >
              วิธีใช้งาน
            </a>
            <Link
              href="/login?role=student"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1d63d8] px-5 font-semibold text-white transition hover:bg-[#1750b8] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8]"
            >
              เข้าสู่ระบบ
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-10 pb-10 pt-7 md:grid-cols-2 md:gap-12 md:pb-12 md:pt-4">
          <div>
            <span className="inline-flex rounded-full bg-[#e5edff] px-3 py-1 text-[11px] font-medium text-[#1750b8]">
              สำหรับผู้ฝึกอาชีพและผู้ดูแล
            </span>
            <h1 className="mt-4 text-[30px] font-bold leading-[1.3] tracking-tight sm:text-[40px]">
              บันทึกเวลาฝึกอาชีพ
              <span className="block text-[#1d63d8]">ง่ายๆ ในที่เดียว</span>
            </h1>
            <p className="mt-3 max-w-[480px] text-sm leading-6 text-[#5b6b82]">
              เช็กอิน–เช็กเอาท์พร้อมรูปถ่าย บันทึกเงินส่วนตัว เวลา
              และเลือกวันหยุด พร้อมรายงานให้ผู้ดูแลส่งออก Excel ได้ทันที
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/login?role=student"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1d63d8] px-5 text-sm font-semibold text-white transition hover:bg-[#1750b8] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8]"
              >
                เข้าสู่ระบบนักศึกษา
              </Link>
              <Link
                href="/login?role=admin"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#cbd9f3] bg-white px-5 text-sm font-medium text-[#1750b8] transition hover:bg-[#eaf1ff] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8]"
              >
                สำหรับผู้ดูแลระบบ
              </Link>
            </div>
          </div>

          <div
            aria-label="ภาพตัวอย่างการลงเวลาสำเร็จและยอดเงิน"
            className="relative mx-auto flex min-h-[250px] w-full max-w-[440px] items-center justify-center"
          >
            <div aria-hidden="true" className="absolute right-4 top-0 h-[220px] w-[220px] rounded-full bg-[#dbe8ff]" />
            <div aria-hidden="true" className="absolute bottom-2 left-8 h-[82px] w-[82px] rounded-full bg-[#fff0bd]" />
            <div className="relative z-10 w-[72%] rounded-[22px] bg-gradient-to-br from-[#1859ce] to-[#4a92ff] p-5 text-white shadow-[0_20px_40px_rgba(29,99,216,0.24)]">
              <p className="text-[11px] font-medium text-white/85">
                เวลาทำงานวันนี้ · เริ่มเมื่อ 08:30 น.
              </p>
              <p className="mt-1 text-[28px] font-bold leading-none sm:text-[32px]">
                02:13:45
              </p>
              <span className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-[10px] font-medium">
                กำลังทำงาน
              </span>
            </div>
            <div className="absolute right-0 top-[108px] z-20 flex w-[68%] items-center gap-3 rounded-[18px] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,31,58,0.10)]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcf5e6] text-[#16834a]">
                <CheckIcon />
              </span>
              <span>
                <span className="block text-xs font-semibold">เช็กอินสำเร็จ</span>
                <span className="block text-[10px] text-[#5b6b82]">พร้อมเริ่มทำงาน</span>
              </span>
            </div>
            <div className="absolute bottom-0 left-[12%] z-20 rounded-[18px] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,31,58,0.10)]">
              <span className="block text-[10px] text-[#5b6b82]">เงินเข้าแล้ว</span>
              <span className="block text-sm font-bold text-[#1750b8]">฿230.00</span>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-6">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold sm:text-2xl">
              ทุกอย่างที่ต้องใช้ ครบในระบบเดียว
            </h2>
            <p className="mt-1 text-xs text-[#5b6b82]">
              ออกแบบให้ใช้งานบนมือถือ และตรวจสอบได้สำหรับผู้ดูแล
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="rounded-[18px] border border-[#e3e9f2] bg-white p-4 shadow-[0_8px_24px_rgba(15,31,58,0.04)]"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${feature.color}`}>
                  {feature.icon}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#5b6b82]">
                  {feature.desc}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="how-it-works"
          className="mt-7 scroll-mt-6 rounded-[20px] border border-[#e3e9f2] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,31,58,0.04)] sm:mt-8 sm:px-8"
        >
          <h2 className="text-center text-xl font-bold">ใช้งาน 4 ขั้นตอน</h2>
          <ol className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#1d63d8] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-2 text-xs font-semibold">{step.title}</h3>
                <p className="mt-1 text-[10px] leading-4 text-[#5b6b82]">
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-[20px] bg-gradient-to-r from-[#1959cc] to-[#4b91f5] px-5 py-6 text-center text-white sm:mt-7 sm:py-7">
          <h2 className="text-xl font-bold">พร้อมเริ่มบันทึกเวลาแล้วหรือยัง</h2>
          <p className="mt-1 text-xs text-white/85">
            เข้าสู่ระบบด้วยบัญชีที่ได้รับจากผู้ดูแล
          </p>
          <div className="mt-3">
            <Suspense fallback={<CtaFallback />}>
              <HomeCta />
            </Suspense>
          </div>
        </section>

        <footer className="pt-4 text-center text-[10px] text-[#71819a]">
          © ระบบฝึกอาชีพ · ปัญญาภิวัฒน์ขอนแก่น
        </footer>
      </div>
    </main>
  );
}

function GraduationIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2.5 9 9.5-5 9.5 5-9.5 5z" />
      <path d="M6 11v5c3.5 3 8.5 3 12 0v-5M21.5 9v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
