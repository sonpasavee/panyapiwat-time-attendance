import { requireAdminPage } from "@/lib/page-auth";
import { adminUsersQuerySchema, pagination } from "@/validators/api";
import { buildUserFilter, getAcademicTerms, listShopCodes, listClassGroupFilters, listUsers } from "@/services/user.service";

import UsersManager, { type ManagerUser } from "./users-manager";
import "./users.css";

export const instant = false;

type SearchParams = {
  q?: string | string[];
  role?: string | string[];
  shopCode?: string | string[];
  gradeLevel?: string | string[];
  section?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
  academicTermId?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const terms = await getAcademicTerms();
  const requestedTerm = first(params.academicTermId)?.trim();
  const academicTermId = terms.some((term) => term.id === requestedTerm)
    ? requestedTerm
    : terms[0]?.id;

  const raw: Record<string, string> = {};
  for (const key of ["q", "role", "shopCode", "gradeLevel", "section"] as const) {
    const v = first(params[key])?.trim();
    if (v) raw[key] = v;
  }
  if (academicTermId) raw.academicTermId = academicTermId;
  const filters = adminUsersQuerySchema.parse(raw);
  const query = new URLSearchParams({
    ...(first(params.page) ? { page: first(params.page)! } : {}),
    ...(first(params.pageSize) ? { pageSize: first(params.pageSize)! } : {}),
  });
  const { page, pageSize, skip } = pagination(query);

  const where = await buildUserFilter({
    role: filters.role,
    shopCode: filters.shopCode,
    gradeLevel: filters.gradeLevel,
    section: filters.section,
    academicTermId,
    query: filters.q,
  });

  const [{ items, total }, totalAll, studentsAll, adminsAll, activeAll, shopOptions, classGroupOptions] =
    await Promise.all([
      listUsers(where, skip, pageSize, academicTermId),
      listUsers({}, 0, 1),
      listUsers({ role: "STUDENT" }, 0, 1),
      listUsers({ role: "ADMIN" }, 0, 1),
      listUsers({ isActive: true }, 0, 1),
      listShopCodes(academicTermId),
      listClassGroupFilters(academicTermId),
    ]);

  const totalPages = Math.ceil(total / pageSize);

  // key ตาม query — ทุกครั้งที่ค้นหา/เปลี่ยนหน้า ให้ client component
  // remount รับข้อมูลชุดใหม่ (ไม่งั้น useState จะค้างค่าของผลลัพธ์เก่า)
  const managerKey = [filters.q ?? "", filters.role ?? "", filters.shopCode ?? "", filters.gradeLevel ?? "", filters.section ?? "", academicTermId ?? "", page, pageSize].join("|");

  return (
    <UsersManager
      key={managerKey}
      shopOptions={shopOptions}
      classGroupOptions={classGroupOptions}
      termOptions={terms}
      initialUsers={items as ManagerUser[]}
      initialStats={{
        total: totalAll.total,
        students: studentsAll.total,
        admins: adminsAll.total,
        active: activeAll.total,
      }}
      initialFilters={{
        q: filters.q ?? "",
        role: filters.role ?? "",
        shopCode: filters.shopCode ?? "",
        academicTermId: academicTermId ?? "",
        gradeLevel: filters.gradeLevel ? String(filters.gradeLevel) : "",
        section: filters.section ?? "",
      }}
      rawParams={raw}
      page={page}
      totalPages={totalPages}
    />
  );
}
