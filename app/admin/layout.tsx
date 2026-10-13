import DashboardShell, { adminNavItems } from "../components/dashboard-shell";

// dashboard ต้องอ่าน session ทุกครั้ง — ไม่ prerender (blocking route)
export const instant = false;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell brandSub="ผู้ดูแลระบบ" items={adminNavItems}>
      {children}
    </DashboardShell>
  );
}
