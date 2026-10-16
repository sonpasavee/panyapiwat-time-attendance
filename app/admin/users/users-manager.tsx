"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Pager from "../../components/pager";

export type ManagerUser = {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  employeeCode: string | null;
  shopCode: string | null;
  role: "ADMIN" | "STUDENT";
  isActive: boolean;
};

type Stats = {
  total: number;
  students: number;
  admins: number;
  active: number;
};

type Filters = {
  q: string;
  role: "" | "STUDENT" | "ADMIN";
  shopCode: string;
};

const AVATAR_TONES = ["blue", "green", "yellow", "pink", "lavender"] as const;

function avatarTone(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function fullNameOf(user: Pick<ManagerUser, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`.trim();
}

function splitFullName(value: string): [string, string] {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], "-"];
  return [parts[0], parts.slice(1).join(" ")];
}

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

function PersonIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.2-3.2 3.9-5 7-5s5.8 1.8 7 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GradIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4 2.5 8.5 12 13l7.5-3.6V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 11.5V15c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.5 8.5V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 14.5h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16 16 4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20h4l11-11-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="users-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="users-switch-track" aria-hidden="true">
        <span className="users-switch-thumb" />
      </span>
    </button>
  );
}

export default function UsersManager({
  initialUsers,
  initialStats,
  initialFilters,
  shopOptions,
  rawParams,
  page,
  totalPages,
}: {
  initialUsers: ManagerUser[];
  initialStats: Stats;
  initialFilters: Filters;
  shopOptions: string[];
  rawParams: Record<string, string>;
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [stats, setStats] = useState(initialStats);
  const [q, setQ] = useState(initialFilters.q);
  const [shopCode, setShopCode] = useState(initialFilters.shopCode);
  const [role, setRole] = useState<Filters["role"]>(initialFilters.role);
  const [tableError, setTableError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ManagerUser | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // ฟอร์มในโมดัล
  const [formName, setFormName] = useState("");
  const [formStudentId, setFormStudentId] = useState("");
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formShopCode, setFormShopCode] = useState("");
  const [formRole, setFormRole] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [formActive, setFormActive] = useState(true);

  const modalOpen = adding || editing !== null;

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAdding(false);
        setEditing(null);
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  function openAdd() {
    setModalError(null);
    setTempPassword(null);
    setConfirmingDelete(false);
    setConfirmingReset(false);
    setFormName("");
    setFormStudentId("");
    setFormEmployeeCode("");
    setFormShopCode("");
    setFormRole("STUDENT");
    setFormActive(true);
    setEditing(null);
    setAdding(true);
  }

  function openEdit(user: ManagerUser) {
    setModalError(null);
    setTempPassword(null);
    setConfirmingDelete(false);
    setConfirmingReset(false);
    setFormName(fullNameOf(user));
    setFormStudentId(user.studentId ?? "");
    setFormEmployeeCode(user.employeeCode ?? "");
    setFormShopCode(user.shopCode ?? "");
    setFormRole(user.role);
    setFormActive(user.isActive);
    setAdding(false);
    setEditing(user);
  }

  function closeModal() {
    setAdding(false);
    setEditing(null);
    setModalError(null);
    setConfirmingDelete(false);
    setConfirmingReset(false);
    setTempPassword(null);
  }

  function navigateWithFilters(next: Filters) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.role) params.set("role", next.role);
    if (next.shopCode.trim()) params.set("shopCode", next.shopCode.trim());
    const query = params.toString();
    router.push(query ? `/admin/users?${query}` : "/admin/users");
  }

  async function toggleActive(user: ManagerUser, next: boolean) {
    setTableError(null);
    setPendingToggle(user.id);
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, isActive: next } : item,
      ),
    );
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!response.ok)
        throw new Error(await readApiError(response, "บันทึกสถานะไม่สำเร็จ"));
      setStats((current) => ({
        ...current,
        active: current.active + (next ? 1 : -1),
      }));
    } catch (error) {
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, isActive: user.isActive } : item,
        ),
      );
      setTableError(
        error instanceof Error ? error.message : "บันทึกสถานะไม่สำเร็จ",
      );
    } finally {
      setPendingToggle(null);
    }
  }

  async function saveAdd() {
    const [firstName, lastName] = splitFullName(formName);
    if (!firstName) {
      setModalError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          studentId: formStudentId.trim() || null,
          employeeCode: formEmployeeCode.trim() || null,
          shopCode: formShopCode.trim() || null,
          role: formRole,
          isActive: formActive,
        }),
      });
      if (!response.ok)
        throw new Error(await readApiError(response, "เพิ่มนักศึกษาไม่สำเร็จ"));
      const body = (await response.json()) as { user: ManagerUser };
      setUsers((current) => [body.user, ...current]);
      setStats((current) => ({
        total: current.total + 1,
        students: current.students + (body.user.role === "STUDENT" ? 1 : 0),
        admins: current.admins + (body.user.role === "ADMIN" ? 1 : 0),
        active: current.active + (body.user.isActive ? 1 : 0),
      }));
      closeModal();
      router.refresh();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "เพิ่มนักศึกษาไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const [firstName, lastName] = splitFullName(formName);
    if (!firstName) {
      setModalError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const response = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          studentId: formStudentId.trim() || null,
          employeeCode: formEmployeeCode.trim() || null,
          shopCode: formShopCode.trim() || null,
          role: formRole,
          isActive: formActive,
        }),
      });
      if (!response.ok)
        throw new Error(await readApiError(response, "บันทึกไม่สำเร็จ"));
      const body = (await response.json()) as { user: ManagerUser };
      const previous = editing;
      setUsers((current) =>
        current.map((item) => (item.id === previous.id ? body.user : item)),
      );
      setStats((current) => ({
        ...current,
        students:
          current.students -
          (previous.role === "STUDENT" ? 1 : 0) +
          (body.user.role === "STUDENT" ? 1 : 0),
        admins:
          current.admins -
          (previous.role === "ADMIN" ? 1 : 0) +
          (body.user.role === "ADMIN" ? 1 : 0),
        active:
          current.active -
          (previous.isActive ? 1 : 0) +
          (body.user.isActive ? 1 : 0),
      }));
      closeModal();
      router.refresh();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!editing) return;
    setSaving(true);
    setModalError(null);
    try {
      const response = await fetch(
        `/api/admin/users/${editing.id}/reset-password`,
        {
          method: "POST",
        },
      );
      if (!response.ok)
        throw new Error(
          await readApiError(response, "รีเซ็ตรหัสผ่านไม่สำเร็จ"),
        );
      const body = (await response.json()) as { temporaryPassword: string };
      setTempPassword(body.temporaryPassword);
      setConfirmingReset(false);
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "รีเซ็ตรหัสผ่านไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!editing) return;
    setSaving(true);
    setModalError(null);
    try {
      const response = await fetch(`/api/admin/users/${editing.id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error(await readApiError(response, "ลบไม่สำเร็จ"));
      const removed = editing;
      setUsers((current) => current.filter((item) => item.id !== removed.id));
      setStats((current) => ({
        total: current.total - 1,
        students: current.students - (removed.role === "STUDENT" ? 1 : 0),
        admins: current.admins - (removed.role === "ADMIN" ? 1 : 0),
        active: current.active - (removed.isActive ? 1 : 0),
      }));
      closeModal();
      router.refresh();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const rolePills: Array<{ value: Filters["role"]; label: string }> = [
    { value: "", label: "ทั้งหมด" },
    { value: "STUDENT", label: "ผู้ฝึกอาชีพ" },
    { value: "ADMIN", label: "เจ้าหน้าที่" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="users-head">
        <div>
          <h1>นักศึกษา</h1>
          <p>จัดการข้อมูลผู้ใช้ทั้งหมด ({stats.total} คน) · แก้ไขได้ทุกคน</p>
        </div>
        <div className="users-head-actions">
          <Link href="/admin/import" className="btn btn-outline">
            นำเข้ารายชื่อ
          </Link>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
              +
            </span>
            เพิ่มนักศึกษา
          </button>
        </div>
      </div>

      <div className="users-stats">
        <section className="card users-stat" aria-label="ผู้ใช้ทั้งหมด">
          <span
            className="users-stat-icon"
            style={{ background: "#eaf1ff", color: "#1d63d8" }}
            aria-hidden="true"
          >
            <PersonIcon />
          </span>
          <div>
            <p className="users-stat-label">ผู้ใช้ทั้งหมด</p>
            <p className="users-stat-value">{stats.total} คน</p>
          </div>
        </section>
        <section className="card users-stat" aria-label="ผู้ฝึกอาชีพ">
          <span
            className="users-stat-icon"
            style={{ background: "#dcfce7", color: "#15803d" }}
            aria-hidden="true"
          >
            <GradIcon />
          </span>
          <div>
            <p className="users-stat-label">ผู้ฝึกอาชีพ</p>
            <p className="users-stat-value">{stats.students} คน</p>
          </div>
        </section>
        <section className="card users-stat" aria-label="เจ้าหน้าที่">
          <span
            className="users-stat-icon"
            style={{ background: "#fef3c7", color: "#92400e" }}
            aria-hidden="true"
          >
            <CardIcon />
          </span>
          <div>
            <p className="users-stat-label">เจ้าหน้าที่</p>
            <p className="users-stat-value">{stats.admins} คน</p>
          </div>
        </section>
        <section className="card users-stat" aria-label="เปิดใช้งาน">
          <span
            className="users-stat-icon"
            style={{ background: "#e6e6fa", color: "#3b3480" }}
            aria-hidden="true"
          >
            <CheckIcon />
          </span>
          <div>
            <p className="users-stat-label">เปิดใช้งาน</p>
            <p className="users-stat-value">{stats.active} คน</p>
          </div>
        </section>
      </div>

      <div className="card users-filter" role="search">
        <div className="users-search">
          <SearchIcon />
          <label htmlFor="users-q" className="sr-only">
            ค้นหาชื่อ / รหัส
          </label>
          <input
            id="users-q"
            type="search"
            className="input"
            placeholder="ค้นหาชื่อ / รหัส…"
            value={q}
            maxLength={100}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter")
                navigateWithFilters({ q, role, shopCode });
            }}
          />
        </div>
        <div className="users-shop">
          <label htmlFor="users-shop" className="sr-only">
            รหัสร้าน
          </label>
          <span className="users-select-wrap">
            <select
              id="users-shop"
              className="users-select"
              value={shopCode}
              onChange={(event) => {
                const next = event.target.value;
                setShopCode(next);
                navigateWithFilters({ q, role, shopCode: next });
              }}
            >
              <option value="">รหัสร้าน (ทั้งหมด)</option>
              {shopOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="users-pills" role="group" aria-label="กรองตามบทบาท">
          {rolePills.map((pill) => (
            <button
              key={pill.label}
              type="button"
              className="users-pill"
              aria-pressed={role === pill.value}
              onClick={() => {
                setRole(pill.value);
                navigateWithFilters({ q, role: pill.value, shopCode });
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigateWithFilters({ q, role, shopCode })}
        >
          ค้นหา
        </button>
      </div>

      <div className="card users-table-card">
        {tableError && (
          <p
            className="users-alert"
            role="alert"
            style={{ margin: "16px 24px 0" }}
          >
            {tableError}
          </p>
        )}
        {users.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">ไม่พบผู้ใช้ตามเงื่อนไข</p>
        ) : (
          <div className="users-table-scroll">
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
                  <th scope="col">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="users-name">
                        <span
                          className="users-avatar"
                          data-tone={avatarTone(user.id)}
                          aria-hidden="true"
                        >
                          {(user.firstName || "?").charAt(0)}
                        </span>
                        {fullNameOf(user)}
                      </span>
                    </td>
                    <td>{user.studentId ?? "–"}</td>
                    <td>{user.employeeCode ?? "–"}</td>
                    <td>
                      {user.shopCode ? (
                        <span className="users-chip">{user.shopCode}</span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td>
                      <span
                        className="users-chip users-chip-role"
                        data-role={user.role}
                      >
                        {user.role === "ADMIN" ? "เจ้าหน้าที่" : "ผู้ฝึกอาชีพ"}
                      </span>
                    </td>
                    <td>
                      <span className="users-status">
                        <Switch
                          checked={user.isActive}
                          disabled={pendingToggle === user.id}
                          label={`สถานะบัญชี ${fullNameOf(user)}`}
                          onChange={(next) => toggleActive(user, next)}
                        />
                        <span
                          className="users-status-label"
                          data-off={!user.isActive}
                        >
                          {user.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="users-edit-btn"
                        onClick={() => openEdit(user)}
                      >
                        <PencilIcon />
                        แก้ไข
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          pathname="/admin/users"
          params={rawParams}
          page={page}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${stats.total} คน`}
        />
      </div>

      {adding && (
        <div
          className="users-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-add-title"
          >
            <div className="users-modal-body">
              <div className="users-modal-head">
                <div>
                  <h2 id="users-add-title" className="users-modal-title">
                    เพิ่มนักศึกษา
                  </h2>
                  <p className="users-modal-sub">
                    กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่
                  </p>
                </div>
                <button
                  type="button"
                  className="users-close"
                  aria-label="ปิด"
                  onClick={closeModal}
                >
                  ×
                </button>
              </div>

              <div className="users-field">
                <label htmlFor="users-add-name" className="field-label">
                  ชื่อ-นามสกุล
                </label>
                <input
                  id="users-add-name"
                  type="text"
                  autoFocus
                  className="input"
                  style={{ marginTop: 6 }}
                  placeholder="เช่น สมชาย ใจดี"
                  value={formName}
                  maxLength={160}
                  onChange={(event) => setFormName(event.target.value)}
                />
              </div>

              <div className="users-field-row">
                <div className="users-field">
                  <label htmlFor="users-add-student" className="field-label">
                    รหัสนักศึกษา
                  </label>
                  <input
                    id="users-add-student"
                    type="text"
                    className="input"
                    style={{ marginTop: 6 }}
                    placeholder="เช่น 6630201006"
                    value={formStudentId}
                    maxLength={40}
                    onChange={(event) => setFormStudentId(event.target.value)}
                  />
                </div>
                <div className="users-field">
                  <label htmlFor="users-add-emp" className="field-label">
                    รหัสพนักงาน
                  </label>
                  <input
                    id="users-add-emp"
                    type="text"
                    className="input"
                    style={{ marginTop: 6 }}
                    placeholder="เช่น EMP006"
                    value={formEmployeeCode}
                    maxLength={40}
                    onChange={(event) =>
                      setFormEmployeeCode(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="users-field">
                <label htmlFor="users-add-shop" className="field-label">
                  รหัสร้าน
                </label>
                <input
                  id="users-add-shop"
                  type="text"
                  className="input"
                  style={{ marginTop: 6 }}
                  placeholder="เช่น SHOP01"
                  value={formShopCode}
                  maxLength={40}
                  onChange={(event) => setFormShopCode(event.target.value)}
                />
              </div>

              <div className="users-field">
                <span id="users-add-role-label" className="field-label">
                  บทบาท
                </span>
                <div
                  className="users-seg"
                  role="group"
                  aria-labelledby="users-add-role-label"
                  style={{ marginTop: 6 }}
                >
                  <button
                    type="button"
                    aria-pressed={formRole === "STUDENT"}
                    onClick={() => setFormRole("STUDENT")}
                  >
                    ผู้ฝึกอาชีพ
                  </button>
                  <button
                    type="button"
                    aria-pressed={formRole === "ADMIN"}
                    onClick={() => setFormRole("ADMIN")}
                  >
                    เจ้าหน้าที่
                  </button>
                </div>
              </div>

              <div className="users-statusbox">
                <div>
                  <p className="users-statusbox-title">เปิดใช้งานบัญชีทันที</p>
                </div>
                <span className="users-status">
                  <Switch
                    checked={formActive}
                    label="เปิดใช้งานบัญชีทันที"
                    onChange={setFormActive}
                  />
                </span>
              </div>

              {modalError && (
                <p className="users-alert" role="alert">
                  {modalError}
                </p>
              )}
            </div>
            <div
              className="users-modal-foot"
              style={{ justifyContent: "flex-end" }}
            >
              <div className="users-foot-group">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModal}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={saveAdd}
                >
                  {saving ? "กำลังบันทึก…" : "เพิ่มนักศึกษา"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="users-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-edit-title"
          >
            <div className="users-modal-body">
              <div className="users-modal-head">
                <h2 id="users-edit-title" className="users-modal-title">
                  แก้ไขข้อมูลนักศึกษา
                </h2>
                <button
                  type="button"
                  className="users-close"
                  aria-label="ปิด"
                  onClick={closeModal}
                >
                  ×
                </button>
              </div>

              <div className="users-modal-user">
                <span
                  className="users-avatar"
                  data-tone={avatarTone(editing.id)}
                  aria-hidden="true"
                >
                  {(editing.firstName || "?").charAt(0)}
                </span>
                <div>
                  <p className="users-modal-user-name">{fullNameOf(editing)}</p>
                  <p className="users-modal-user-meta">
                    {editing.studentId ?? "–"}
                    {editing.shopCode && (
                      <span className="users-chip">{editing.shopCode}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="users-field">
                <label htmlFor="users-edit-name" className="field-label">
                  ชื่อ-นามสกุล
                </label>
                <input
                  id="users-edit-name"
                  type="text"
                  autoFocus
                  className="input"
                  style={{ marginTop: 6 }}
                  value={formName}
                  maxLength={160}
                  onChange={(event) => setFormName(event.target.value)}
                />
              </div>

              <div className="users-field-row">
                <div className="users-field">
                  <label htmlFor="users-edit-student" className="field-label">
                    รหัสนักศึกษา
                  </label>
                  <input
                    id="users-edit-student"
                    type="text"
                    className="input"
                    style={{ marginTop: 6 }}
                    value={formStudentId}
                    maxLength={40}
                    onChange={(event) => setFormStudentId(event.target.value)}
                  />
                </div>
                <div className="users-field">
                  <label htmlFor="users-edit-emp" className="field-label">
                    รหัสพนักงาน
                  </label>
                  <input
                    id="users-edit-emp"
                    type="text"
                    className="input"
                    style={{ marginTop: 6 }}
                    value={formEmployeeCode}
                    maxLength={40}
                    onChange={(event) =>
                      setFormEmployeeCode(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="users-field">
                <label htmlFor="users-edit-shop" className="field-label">
                  รหัสร้าน
                </label>
                <input
                  id="users-edit-shop"
                  type="text"
                  className="input"
                  style={{ marginTop: 6 }}
                  value={formShopCode}
                  maxLength={40}
                  onChange={(event) => setFormShopCode(event.target.value)}
                />
              </div>

              <div className="users-field">
                <span id="users-edit-role-label" className="field-label">
                  บทบาท
                </span>
                <div
                  className="users-seg"
                  role="group"
                  aria-labelledby="users-edit-role-label"
                  style={{ marginTop: 6 }}
                >
                  <button
                    type="button"
                    aria-pressed={formRole === "STUDENT"}
                    onClick={() => setFormRole("STUDENT")}
                  >
                    ผู้ฝึกอาชีพ
                  </button>
                  <button
                    type="button"
                    aria-pressed={formRole === "ADMIN"}
                    onClick={() => setFormRole("ADMIN")}
                  >
                    เจ้าหน้าที่
                  </button>
                </div>
              </div>

              <div className="users-statusbox">
                <div>
                  <p className="users-statusbox-title">สถานะบัญชี</p>
                  <p className="users-statusbox-sub">ปิดเมื่อไม่ให้เข้าระบบ</p>
                </div>
                <span className="users-status">
                  <Switch
                    checked={formActive}
                    label="สถานะบัญชี"
                    onChange={setFormActive}
                  />
                  <span className="users-status-label" data-off={!formActive}>
                    {formActive ? "ใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </span>
              </div>

              {tempPassword && (
                <p className="users-temp-pass" role="status">
                  รหัสผ่านใหม่: <strong>{tempPassword}</strong> —
                  แจ้งให้นักศึกษาเป็นการส่วนตัว
                </p>
              )}

              {confirmingReset && (
                <div className="users-confirm">
                  <p style={{ margin: "0 0 10px" }}>
                    รีเซ็ตรหัสผ่านของ {fullNameOf(editing)} กลับเป็นรหัสเริ่มต้น
                    (รหัสพนักงาน) ใช่หรือไม่?
                  </p>
                  <div className="users-foot-group">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={saving}
                      onClick={() => setConfirmingReset(false)}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={saving}
                      onClick={resetPassword}
                    >
                      {saving ? "กำลังรีเซ็ต…" : "ยืนยันรีเซ็ต"}
                    </button>
                  </div>
                </div>
              )}

              {confirmingDelete && (
                <div className="users-confirm">
                  <p style={{ margin: "0 0 10px" }}>
                    ลบบัญชี {fullNameOf(editing)} ใช่หรือไม่?
                    ทำได้เฉพาะบัญชีที่ยังไม่มีประวัติการลงเวลา/การลา
                  </p>
                  <div className="users-foot-group">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={saving}
                      onClick={() => setConfirmingDelete(false)}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      className="users-btn-danger-outline"
                      disabled={saving}
                      onClick={deleteUser}
                    >
                      {saving ? "กำลังลบ…" : "ยืนยันลบ"}
                    </button>
                  </div>
                </div>
              )}

              {modalError && (
                <p className="users-alert" role="alert">
                  {modalError}
                </p>
              )}
            </div>
            <div className="users-modal-foot">
              <div className="users-foot-group">
                {!confirmingReset && !confirmingDelete && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={saving}
                      onClick={() => {
                        setConfirmingDelete(false);
                        setConfirmingReset(true);
                      }}
                    >
                      รีเซ็ตรหัสผ่าน
                    </button>
                    <button
                      type="button"
                      className="users-btn-danger-outline"
                      disabled={saving}
                      onClick={() => {
                        setConfirmingReset(false);
                        setConfirmingDelete(true);
                      }}
                    >
                      ลบนักศึกษา
                    </button>
                  </>
                )}
              </div>
              <div className="users-foot-group">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModal}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={saveEdit}
                >
                  {saving ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
