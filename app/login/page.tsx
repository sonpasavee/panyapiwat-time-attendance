import Link from "next/link";
import LoginForm from "../components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ role?: string | string[] }>;
};

export const instant = false;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedRole = Array.isArray(params.role)
    ? params.role[0]
    : params.role;
  const role = requestedRole === "admin" ? "admin" : "student";
  const isAdmin = role === "admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4 py-8 text-[#0f1f3a] sm:px-8 sm:py-12">
      <section className="grid w-full max-w-[940px] overflow-hidden rounded-[22px] border border-[#e3e9f2] bg-white shadow-[0_16px_40px_rgba(25,62,120,0.08)] md:min-h-[540px] md:grid-cols-2">
        <div className="relative isolate flex min-h-[230px] flex-col overflow-hidden bg-gradient-to-br from-[#1957c9] to-[#4a91f5] p-7 text-white sm:p-9 md:min-h-[540px] md:p-10">
          <div
            aria-hidden="true"
            className="absolute -bottom-16 -right-12 -z-10 h-48 w-48 rounded-full bg-white/10 sm:h-56 sm:w-56"
          />
          <Link
            href="/"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded text-sm font-medium text-white/85 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span aria-hidden="true">←</span> กลับหน้าหลัก
          </Link>
          <div className="mt-7 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white sm:mt-10">
            {isAdmin ? <AdminIcon /> : <StudentIcon />}
          </div>
          <h1 className="mt-4 text-[25px] font-bold leading-[1.35] sm:text-[29px]">
            ยินดีต้อนรับ
            <span className="block">สู่ระบบฝึกอาชีพ</span>
          </h1>
          <p className="mt-3 max-w-[360px] text-sm leading-6 text-white/90">
            เช็กอิน–เช็กเอาท์ บันทึกเงิน แจ้งลา และเลือกวันหยุด ได้ในที่เดียว
          </p>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-9 md:p-8 lg:p-10">
          <div className="mb-5">
            <h2 className="text-2xl font-bold tracking-tight">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-sm text-[#5b6b82]">
              เลือกประเภทผู้ใช้แล้วกรอกข้อมูล
            </p>
          </div>

          <nav
            aria-label="เลือกประเภทผู้ใช้"
            className="mb-5 grid grid-cols-2 rounded-full bg-[#eaf0fb] p-1"
          >
            <Link
              href="/login?role=student"
              aria-current={!isAdmin ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8] ${
                !isAdmin
                  ? "bg-white text-[#1750b8] shadow-[0_2px_8px_rgba(24,65,130,0.10)]"
                  : "text-[#5b6b82] hover:text-[#1750b8]"
              }`}
            >
              นักศึกษา
            </Link>
            <Link
              href="/login?role=admin"
              aria-current={isAdmin ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d63d8] ${
                isAdmin
                  ? "bg-white text-[#1750b8] shadow-[0_2px_8px_rgba(24,65,130,0.10)]"
                  : "text-[#5b6b82] hover:text-[#1750b8]"
              }`}
            >
              ผู้ดูแลระบบ
            </Link>
          </nav>

          <LoginForm role={role} />
        </div>
      </section>
    </main>
  );
}

function StudentIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2.5 9 9.5-5 9.5 5-9.5 5z" />
      <path d="M6 11v5c3.5 3 8.5 3 12 0v-5M21.5 9v6" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 14h4" />
    </svg>
  );
}
