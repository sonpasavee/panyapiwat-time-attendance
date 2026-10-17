import DashboardShell, { studentNavItems } from "../components/dashboard-shell";

// dashboard ต้องอ่าน session ทุกครั้ง — ไม่ prerender (blocking route)
export const instant = false;

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell brandSub="ระบบฝึกอาชีพ" items={studentNavItems}>
      {children}
    </DashboardShell>
  );
}
