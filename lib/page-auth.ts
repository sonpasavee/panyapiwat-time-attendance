import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";

export async function requireStudentPage() {
  const session = await currentUser();

  if (!session) {
    redirect("/login?role=student");
  }
  if (session.role !== "STUDENT") {
    redirect("/admin");
  }

  return session;
}

export async function requireAdminPage() {
  const session = await currentUser();

  if (!session) {
    redirect("/login?role=admin");
  }
  if (session.role !== "ADMIN") {
    redirect("/student");
  }

  return session;
}
