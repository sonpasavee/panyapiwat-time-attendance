import Link from "next/link";
import LoginForm from "../components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ role?: string | string[] }>;
};

// เนื้อหาทั้งเพจขึ้นกับ query param role — ไม่ prerender (blocking route)
export const instant = false;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedRole = Array.isArray(params.role)
    ? params.role[0]
    : params.role;
  const role = requestedRole === "admin" ? "admin" : "student";
  const isAdmin = role === "admin";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-white sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 15% 0%, rgba(96,165,240,0.30), rgba(96,165,240,0) 60%), linear-gradient(180deg, #0e4a86 0%, #0a2e5a 100%)",
        }}
      />

      <section className="relative w-full max-w-[460px] rounded-[28px] border border-white/20 bg-white/[0.10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-9">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/75 transition hover:text-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd666]"
        >
          <span aria-hidden="true">←</span> กลับหน้าหลัก
        </Link>

        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0b2f5c] shadow-lg">
            {isAdmin ? <AdminIcon /> : <StudentIcon />}
          </div>
          <div>
            <p className="text-sm font-medium text-blue-100">เข้าสู่ระบบ</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
              {isAdmin ? "เจ้าหน้าที่ศูนย์การเรียน" : "ผู้ฝึกอาชีพ"}
            </h1>
          </div>
        </div>

        <p className="mb-7 text-sm leading-6 text-white/75">
          {isAdmin
            ? "ลงชื่อเข้าใช้เพื่อจัดการข้อมูลและติดตามการฝึกอาชีพ"
            : "ลงชื่อเข้าใช้เพื่อบันทึกเวลาและดูข้อมูลการฝึกอาชีพของคุณ"}
        </p>

        <LoginForm role={role} />

        <div className="mt-7 border-t border-white/15 pt-5 text-center text-sm text-white/70">
          {isAdmin ? "เป็นผู้ฝึกอาชีพ?" : "เป็นเจ้าหน้าที่ศูนย์การเรียน?"}{" "}
          <Link
            href={`/login?role=${isAdmin ? "student" : "admin"}`}
            className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd666]"
          >
            เข้าสู่ระบบอีกแบบ
          </Link>
        </div>
      </section>
    </main>
  );
}

function StudentIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg
      width="27"
      height="27"
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
