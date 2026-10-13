import { requireAdminPage } from "@/lib/page-auth";
import { adminUsersQuerySchema, pagination } from "@/validators/api";
import { buildUserFilter, listUsers } from "@/services/user.service";

import Pager from "../../components/pager";
import { Badge, Card } from "../../components/ui";

export const instant = false;

type SearchParams = {
  q?: string | string[];
  role?: string | string[];
  shopCode?: string | string[];
  gradeLevel?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
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

  const raw: Record<string, string> = {};
  for (const key of ["q", "role", "shopCode", "gradeLevel"] as const) {
    const v = first(params[key])?.trim();
    if (v) raw[key] = v;
  }
  const filters = adminUsersQuerySchema.parse(raw);
  const query = new URLSearchParams({
    ...(first(params.page) ? { page: first(params.page)! } : {}),
    ...(first(params.pageSize) ? { pageSize: first(params.pageSize)! } : {}),
  });
  const { page, pageSize, skip } = pagination(query);

  const { items, total } = await listUsers(
    buildUserFilter({
      role: filters.role,
      shopCode: filters.shopCode,
      gradeLevel: filters.gradeLevel,
      query: filters.q,
    }),
    skip,
    pageSize,
  );
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">นักศึกษา</h1>
        <p className="mt-0.5 text-[15px] muted">รายชื่อผู้ใช้ทั้งหมด ({total} คน)</p>
      </header>

      <Card label="ตัวกรอง" className="card-pad">
        <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="users-q" className="field-label">ค้นหาชื่อ / รหัส</label>
            <input id="users-q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder="ชื่อ / รหัส…" maxLength={100} className="input min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="users-role" className="field-label">บทบาท</label>
            <select id="users-role" name="role" defaultValue={filters.role ?? ""} className="input min-h-[44px]">
              <option value="">ทั้งหมด</option>
              <option value="STUDENT">ผู้ฝึกอาชีพ</option>
              <option value="ADMIN">เจ้าหน้าที่</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="users-shop" className="field-label">รหัสร้าน</label>
            <input id="users-shop" name="shopCode" type="text" defaultValue={filters.shopCode ?? ""} placeholder="เช่น TEST01" maxLength={40} className="input min-h-[44px]" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">ค้นหา</button>
          </div>
        </form>
      </Card>

      <Card label="รายชื่อผู้ใช้" className="overflow-hidden">
        {items.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">ไม่พบผู้ใช้ตามเงื่อนไข</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">รายชื่อผู้ใช้</caption>
              <thead>
                <tr>
                  <th scope="col">ชื่อ</th>
                  <th scope="col">รหัสนักศึกษา</th>
                  <th scope="col">รหัสพนักงาน</th>
                  <th scope="col">ร้าน</th>
                  <th scope="col">บทบาท</th>
                  <th scope="col">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id}>
                    <td className="font-semibold">{user.firstName} {user.lastName}</td>
                    <td>{user.studentId ?? "–"}</td>
                    <td>{user.employeeCode ?? "–"}</td>
                    <td>{user.shopCode ?? "–"}</td>
                    <td>{user.role === "ADMIN" ? "เจ้าหน้าที่" : "ผู้ฝึกอาชีพ"}</td>
                    <td>
                      {user.isActive ? <Badge tone="green">ใช้งาน</Badge> : <Badge tone="gray">ปิดใช้งาน</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          pathname="/admin/users"
          params={raw}
          page={page}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${total} คน`}
        />
      </Card>
    </div>
  );
}
