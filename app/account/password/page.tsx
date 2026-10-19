import { redirect } from "next/navigation";

import ChangePasswordScreen from "@/app/components/change-password-screen";
import DashboardShell, {
  adminNavItems,
  studentNavItems,
} from "@/app/components/dashboard-shell";
import { currentUser } from "@/lib/auth";

export const instant = false;

export default async function ChangePasswordPage() {
  const session = await currentUser();
  if (!session) redirect("/login");

  const isAdmin = session.role === "ADMIN";
  return (
    <DashboardShell
      brandSub={isAdmin ? "ผู้ดูแลระบบ" : "ระบบฝึกอาชีพ"}
      items={isAdmin ? adminNavItems : studentNavItems}
    >
      <ChangePasswordScreen role={session.role} />
    </DashboardShell>
  );
}
