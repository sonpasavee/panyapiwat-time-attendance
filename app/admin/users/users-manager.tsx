"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Pager from "../../components/pager";
import { PageLoading } from "../../components/loading-spinner";

export type ManagerUser = {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  employeeCode: string | null;
  shopCode: string | null;
  programLevel?: string | null;
  yearLevel?: number | null;
  section?: string | null;
  academicYear?: number | null;
  semester?: number | null;
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
  academicTermId: string;
  gradeLevel: string;
  section: string;
};

type TermOption = { id: string; academicYear: number; semester: number };
type ClassGroupOption = { yearLevel: number; section: string };

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

function nextAcademicTerm(academicYear: number, semester: number) {
  return semester >= 3
    ? { academicYear: academicYear + 1, semester: 1 }
    : { academicYear, semester: semester + 1 };
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

function ShieldIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 19 6v5c0 4.6-2.9 8-7 10-4.1-2-7-5.4-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
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
  classGroupOptions,
  termOptions,
  rawParams,
  page,
  totalPages,
}: {
  initialUsers: ManagerUser[];
  initialStats: Stats;
  initialFilters: Filters;
  shopOptions: string[];
  classGroupOptions: ClassGroupOption[];
  termOptions: TermOption[];
  rawParams: Record<string, string>;
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState(initialUsers);
  const [stats, setStats] = useState(initialStats);
  const [q, setQ] = useState(initialFilters.q);
  const [shopCode, setShopCode] = useState(initialFilters.shopCode);
  const [role, setRole] = useState<Filters["role"]>(initialFilters.role);
  const [academicTermId, setAcademicTermId] = useState(initialFilters.academicTermId);
  const [gradeLevel, setGradeLevel] = useState(initialFilters.gradeLevel);
  const [section, setSection] = useState(initialFilters.section);
  const [tableError, setTableError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ManagerUser | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null);

  // ฟอร์มในโมดัล
  const [formName, setFormName] = useState("");
  const [formStudentId, setFormStudentId] = useState("");
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formShopCode, setFormShopCode] = useState("");
  const [formProgramLevel, setFormProgramLevel] = useState("ปวช.");
  const [formYearLevel, setFormYearLevel] = useState("1");
  const [formSection, setFormSection] = useState("A");
  const [formAcademicYear, setFormAcademicYear] = useState(String(new Date().getFullYear() + 543));
  const [formSemester, setFormSemester] = useState("1");
  const [newAcademicYear, setNewAcademicYear] = useState(String(new Date().getFullYear() + 543));
  const [newSemester, setNewSemester] = useState("1");
  const [editEnrollmentMode, setEditEnrollmentMode] = useState<"current" | "new">("current");
  const [formRole, setFormRole] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [formActive, setFormActive] = useState(true);

  const modalOpen = adding || editing !== null;

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && confirmingDelete) {
        setConfirmingDelete(false);
        setDeleteConfirmText("");
      } else if (event.key === "Escape") {
        setAdding(false);
        setEditing(null);
        setModalError(null);
        setConfirmingDelete(false);
        setConfirmingReset(false);
        setDeleteConfirmText("");
        setTempPassword(null);
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [modalOpen, confirmingDelete]);

  useEffect(() => {
    if (!deletedNotice) return;
    const timeout = window.setTimeout(() => setDeletedNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [deletedNotice]);

  function openAdd() {
    setModalError(null);
    setTempPassword(null);
    setConfirmingDelete(false);
    setConfirmingReset(false);
    setDeleteConfirmText("");
    setEditEnrollmentMode("current");
    setFormName("");
    setFormStudentId("");
    setFormEmployeeCode("");
    setFormShopCode("");
    setFormProgramLevel("ปวช.");
    setFormYearLevel("1");
    setFormSection("A");
    setFormAcademicYear(String(new Date().getFullYear() + 543));
    setFormSemester("1");
    setFormRole("STUDENT");
    setFormActive(true);
    setDeletedNotice(null);
    setEditing(null);
    setAdding(true);
  }

  function openEdit(user: ManagerUser) {
    setModalError(null);
    setTempPassword(null);
    setConfirmingDelete(false);
    setConfirmingReset(false);
    setDeleteConfirmText("");
    setFormName(fullNameOf(user));
    setFormStudentId(user.studentId ?? "");
    setFormEmployeeCode(user.employeeCode ?? "");
    setFormShopCode(user.shopCode ?? "");
    setFormProgramLevel(user.programLevel ?? "ปวช.");
    setFormYearLevel(String(user.yearLevel ?? 1));
    setFormSection(user.section ?? "A");
    setFormAcademicYear(String(user.academicYear ?? new Date().getFullYear() + 543));
    setFormSemester(String(user.semester ?? 1));
    const nextTerm = nextAcademicTerm(
      user.academicYear ?? new Date().getFullYear() + 543,
      user.semester ?? 1,
    );
    setNewAcademicYear(String(nextTerm.academicYear));
    setNewSemester(String(nextTerm.semester));
    setEditEnrollmentMode("current");
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
    setDeleteConfirmText("");
    setTempPassword(null);
  }

  function navigateWithFilters(next: Partial<Filters> & { academicTermId?: string }) {
    const params = new URLSearchParams();
    const qValue = next.q ?? q;
    const roleValue = next.role ?? role;
    const shopValue = next.shopCode ?? shopCode;
    const gradeValue = next.gradeLevel ?? gradeLevel;
    const sectionValue = next.section ?? section;
    if (qValue.trim()) params.set("q", qValue.trim());
    if (roleValue) params.set("role", roleValue);
    if (shopValue.trim()) params.set("shopCode", shopValue.trim());
    if (gradeValue) params.set("gradeLevel", gradeValue);
    if (sectionValue) params.set("section", sectionValue);
    const termId = next.academicTermId ?? academicTermId;
    if (termId) params.set("academicTermId", termId);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/admin/users?${query}` : "/admin/users");
    });
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
          branchName: formShopCode.trim() || null,
          programLevel: formProgramLevel.trim() || null,
          yearLevel: Number(formYearLevel),
          section: formSection.trim() || null,
          academicYear: Number(formAcademicYear),
          semester: Number(formSemester),
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
          ...(formRole === "STUDENT" ? { enrollment: {
            branchName: formShopCode.trim(),
            programLevel: formProgramLevel.trim(),
            yearLevel: Number(formYearLevel),
            section: formSection.trim(),
            academicYear: Number(editEnrollmentMode === "new" ? newAcademicYear : formAcademicYear),
            semester: Number(editEnrollmentMode === "new" ? newSemester : formSemester),
          } } : {}),
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
    const requiredConfirmation = editing.studentId ?? fullNameOf(editing);
    if (deleteConfirmText.trim() !== requiredConfirmation) {
      setModalError("กรุณาพิมพ์ข้อความยืนยันให้ตรงก่อนลบนักศึกษา");
      return;
    }
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
      setDeletedNotice(`ลบ ${fullNameOf(removed)} เรียบร้อยแล้ว`);
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
  const editAcademicYearOptions = [
    ...new Set([
      ...termOptions.map((term) => term.academicYear),
      Number(formAcademicYear),
      Number(newAcademicYear),
    ].filter(Number.isFinite)),
  ].sort((a, b) => a - b);
  const editChangedCount = editing
    ? [
        formName !== fullNameOf(editing),
        formStudentId !== (editing.studentId ?? ""),
        formEmployeeCode !== (editing.employeeCode ?? ""),
        formRole !== editing.role,
        formActive !== editing.isActive,
        formRole === "STUDENT" && formShopCode !== (editing.shopCode ?? ""),
        formRole === "STUDENT" && formProgramLevel !== (editing.programLevel ?? "ปวช."),
        formRole === "STUDENT" && formYearLevel !== String(editing.yearLevel ?? 1),
        formRole === "STUDENT" && formSection !== (editing.section ?? "A"),
        formRole === "STUDENT" &&
          (editEnrollmentMode === "new"
            ? newAcademicYear !== String(editing.academicYear ?? new Date().getFullYear() + 543)
            : formAcademicYear !== String(editing.academicYear ?? new Date().getFullYear() + 543)),
        formRole === "STUDENT" &&
          (editEnrollmentMode === "new"
            ? newSemester !== String(editing.semester ?? 1)
            : formSemester !== String(editing.semester ?? 1)),
      ].filter(Boolean).length
    : 0;

  if (isPending) return <PageLoading />;

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

      <div className="card users-filter" role="search" aria-busy={isPending}>
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
          <label htmlFor="users-term" className="sr-only">Academic term</label>
          <span className="users-select-wrap">
            <select
              id="users-term"
              className="users-select"
              value={academicTermId}
              onChange={(event) => {
                const next = event.target.value;
                setAcademicTermId(next);
                setShopCode("");
                setGradeLevel(""); setSection("");
                navigateWithFilters({ q, role, shopCode: "", gradeLevel: "", section: "", academicTermId: next });
              }}
            >
              {termOptions.map((term) => (
                <option key={term.id} value={term.id}>{`ภาคเรียน ${term.semester}/${term.academicYear}`}</option>
              ))}
            </select>
          </span>
        </div>
        <div className="users-shop">
          <label htmlFor="users-year-level" className="sr-only">ชั้นปี</label>
          <span className="users-select-wrap">
            <select id="users-year-level" className="users-select" value={gradeLevel} onChange={(event) => {
              const next = event.target.value; setGradeLevel(next);
              navigateWithFilters({ gradeLevel: next, section: "" }); setSection("");
            }}>
              <option value="">ทุกชั้นปี</option>
              {[...new Set(classGroupOptions.map((option) => option.yearLevel))].sort((a, b) => a - b).map((year) => <option key={year} value={year}>ปี {year}</option>)}
            </select>
          </span>
        </div>
        <div className="users-shop">
          <label htmlFor="users-section" className="sr-only">ห้อง</label>
          <span className="users-select-wrap">
            <select id="users-section" className="users-select" value={section} onChange={(event) => {
              const next = event.target.value; setSection(next); navigateWithFilters({ section: next });
            }}>
              <option value="">ทุกห้อง</option>
              {[...new Set(classGroupOptions.filter((option) => !gradeLevel || option.yearLevel === Number(gradeLevel)).map((option) => option.section))].sort().map((room) => <option key={room} value={room}>ห้อง {room}</option>)}
            </select>
          </span>
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
        </div>        <div className="users-pills" role="group" aria-label="กรองตามบทบาท">
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
                      {user.role === "STUDENT" && (user.programLevel || user.yearLevel || user.section) && (
                        <div className="muted text-xs">
                          {[user.programLevel, user.yearLevel ? `ปี ${user.yearLevel}` : null, user.section ? `ห้อง ${user.section}` : null].filter(Boolean).join(" · ")}
                        </div>
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

              {formRole === "STUDENT" && (
                <div className="users-field-row">
                  <p className="muted col-span-full text-sm">เมื่อเลือกปีการศึกษา/ภาคเรียนใหม่ ระบบจะสร้าง Enrollment ของภาคเรียนนั้น โดยเก็บประวัติภาคเรียนเดิมไว้</p>
                  <label className="users-field">ระดับ/ชั้นปี/ห้อง
                    <input className="input" value={formProgramLevel} onChange={(e) => setFormProgramLevel(e.target.value)} placeholder="ปวช." />
                  </label>
                  <label className="users-field">ชั้นปี
                    <input className="input" type="number" min={1} max={20} value={formYearLevel} onChange={(e) => setFormYearLevel(e.target.value)} />
                  </label>
                  <label className="users-field">ห้อง
                    <input className="input" value={formSection} onChange={(e) => setFormSection(e.target.value)} />
                  </label>
                  <label className="users-field">ปีการศึกษา
                    <input className="input" type="number" min={2000} max={2700} value={formAcademicYear} onChange={(e) => setFormAcademicYear(e.target.value)} />
                  </label>
                  <label className="users-field">ภาคเรียน
                    <input className="input" type="number" min={1} max={3} value={formSemester} onChange={(e) => setFormSemester(e.target.value)} />
                  </label>
                </div>
              )}

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

      {editing && !confirmingDelete && (
        <div
          className="users-overlay users-edit-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="users-modal users-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-edit-title"
          >
            <div className="users-edit-header">
              <div className="users-modal-head users-edit-title-row">
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
              <div className="users-modal-user users-edit-user">
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
                    <span className="users-chip">{editing.studentId ?? "–"}</span>
                    {editing.shopCode && <span className="users-chip">{editing.shopCode}</span>}
                    {editing.programLevel && (
                      <span>{editing.programLevel} · ปี {editing.yearLevel ?? "–"} / ห้อง {editing.section ?? "–"} · ภาค {editing.semester ?? "–"}/{editing.academicYear ?? "–"}</span>
                    )}
                  </p>
                </div>
                <span className="users-edit-active" data-active={formActive}>
                  {formActive ? "ใช้งาน" : "ปิดใช้งาน"}
                </span>
              </div>
            </div>

            <div className="users-edit-scroll">
              <div className="users-edit-grid">
                <div className="users-edit-column">
                  <section className="users-edit-card">
                    <div className="users-edit-card-title">
                      <span className="users-edit-icon"><PersonIcon /></span>
                      <h3>ข้อมูลส่วนตัว</h3>
                    </div>
                    <div className="users-edit-field">
                      <label htmlFor="users-edit-name" className="field-label">ชื่อ-นามสกุล</label>
                      <input
                        id="users-edit-name"
                        type="text"
                        autoFocus
                        className="input"
                        value={formName}
                        maxLength={160}
                        onChange={(event) => setFormName(event.target.value)}
                      />
                    </div>
                    <div className="users-edit-fields-row">
                      <div className="users-edit-field">
                        <label htmlFor="users-edit-student" className="field-label">รหัสนักศึกษา</label>
                        <input
                          id="users-edit-student"
                          type="text"
                          className="input"
                          value={formStudentId}
                          maxLength={40}
                          onChange={(event) => setFormStudentId(event.target.value)}
                        />
                      </div>
                      <div className="users-edit-field">
                        <label htmlFor="users-edit-emp" className="field-label">รหัสพนักงาน</label>
                        <input
                          id="users-edit-emp"
                          type="text"
                          className="input"
                          value={formEmployeeCode}
                          maxLength={40}
                          onChange={(event) => setFormEmployeeCode(event.target.value)}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="users-edit-card">
                    <div className="users-edit-card-title">
                      <span className="users-edit-icon"><CardIcon /></span>
                      <div>
                        <h3>ร้านฝึกงาน</h3>
                        <p>ร้านที่นักศึกษาฝึกงานในภาคเรียนนี้</p>
                      </div>
                    </div>
                    <div className="users-edit-field">
                      <label htmlFor="users-edit-shop" className="field-label">ร้าน / รหัสร้าน</label>
                      <input
                          id="users-edit-shop"
                          className="input users-edit-shop-input"
                          list="users-shop-options"
                          autoComplete="off"
                          value={formShopCode}
                          onChange={(event) => setFormShopCode(event.target.value)}
                      />
                      <datalist id="users-shop-options">
                        {shopOptions.map((code) => <option key={code} value={code} />)}
                      </datalist>
                    </div>
                  </section>

                  <section className="users-edit-card">
                    <div className="users-edit-card-title">
                      <span className="users-edit-icon"><ShieldIcon /></span>
                      <h3>บัญชีผู้ใช้</h3>
                    </div>
                    <div className="users-edit-field">
                      <span id="users-edit-role-label" className="field-label">บทบาท</span>
                      <div
                        className="users-seg"
                        role="group"
                        aria-labelledby="users-edit-role-label"
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
                    <div className="users-edit-account-row">
                      <span className="field-label">สถานะบัญชี</span>
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
                  </section>
                </div>

                {formRole === "STUDENT" && (
                  <section className="users-edit-card users-edit-education">
                    <div className="users-edit-card-title">
                      <span className="users-edit-icon"><GradIcon /></span>
                      <div>
                        <h3>การศึกษา</h3>
                        <p>{editEnrollmentMode === "current" ? `ภาคเรียนปัจจุบัน ${formSemester}/${formAcademicYear}` : "สร้างการลงทะเบียนใหม่"}</p>
                      </div>
                    </div>
                    <div className="users-edit-tabs" role="tablist" aria-label="รูปแบบการแก้ไขข้อมูลการศึกษา">
                      <button
                        type="button"
                        role="tab"
                        id="users-edit-current-tab"
                        aria-controls="users-edit-enrollment-panel"
                        aria-selected={editEnrollmentMode === "current"}
                        onClick={() => setEditEnrollmentMode("current")}
                      >
                        แก้ไขภาคเรียนนี้
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id="users-edit-new-tab"
                        aria-controls="users-edit-enrollment-panel"
                        aria-selected={editEnrollmentMode === "new"}
                        onClick={() => setEditEnrollmentMode("new")}
                      >
                        ย้าย / เลื่อนปีการเรียนใหม่
                      </button>
                    </div>
                    {editEnrollmentMode === "new" && (
                      <div className="users-edit-info" role="note">
                        ระบบจะสร้างการลงทะเบียนใหม่ในภาคเรียนที่เลือก ประวัติของภาคเรียนเดิมยังอยู่ครบ ไม่ถูกลบ
                      </div>
                    )}
                    <div
                      id="users-edit-enrollment-panel"
                      className="users-edit-fields-row users-edit-fields-row--education"
                      role="tabpanel"
                      aria-labelledby={editEnrollmentMode === "current" ? "users-edit-current-tab" : "users-edit-new-tab"}
                    >
                      {editEnrollmentMode === "new" && (
                        <>
                          <div className="users-edit-field">
                            <label htmlFor="users-edit-new-year" className="field-label">ปีการศึกษาใหม่</label>
                            <span className="users-select-wrap">
                              <select
                                id="users-edit-new-year"
                                className="users-select"
                                value={newAcademicYear}
                                onChange={(event) => setNewAcademicYear(event.target.value)}
                              >
                                {editAcademicYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                              </select>
                            </span>
                          </div>
                          <div className="users-edit-field">
                            <label htmlFor="users-edit-new-semester" className="field-label">ภาคเรียนใหม่</label>
                            <span className="users-select-wrap">
                              <select
                                id="users-edit-new-semester"
                                className="users-select"
                                value={newSemester}
                                onChange={(event) => setNewSemester(event.target.value)}
                              >
                                {[1, 2, 3].map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                              </select>
                            </span>
                          </div>
                        </>
                      )}
                      <div className="users-edit-field">
                        <label htmlFor="users-edit-program" className="field-label">ระดับการศึกษา</label>
                        <input
                          id="users-edit-program"
                          className="input"
                          value={formProgramLevel}
                          onChange={(event) => setFormProgramLevel(event.target.value)}
                        />
                      </div>
                      <div className="users-edit-field">
                        <label htmlFor="users-edit-year-level" className="field-label">ชั้นปี</label>
                        <input
                          id="users-edit-year-level"
                          className="input"
                          type="number"
                          min={1}
                          max={20}
                          value={formYearLevel}
                          onChange={(event) => setFormYearLevel(event.target.value)}
                        />
                      </div>
                      <div className="users-edit-field">
                        <label htmlFor="users-edit-section" className="field-label">ห้อง</label>
                        <input
                          id="users-edit-section"
                          className="input"
                          value={formSection}
                          onChange={(event) => setFormSection(event.target.value)}
                        />
                      </div>
                      {editEnrollmentMode === "current" && (
                        <>
                          <div className="users-edit-field">
                            <label htmlFor="users-edit-current-year" className="field-label">ปีการศึกษา</label>
                            <input id="users-edit-current-year" className="input users-edit-locked" value={formAcademicYear} readOnly />
                          </div>
                          <div className="users-edit-field">
                            <label htmlFor="users-edit-current-semester" className="field-label">ภาคเรียน</label>
                            <input id="users-edit-current-semester" className="input users-edit-locked" value={formSemester} readOnly />
                          </div>
                        </>
                      )}
                    </div>
                    {editEnrollmentMode === "new" && (
                      <div className="users-edit-term-preview">
                        <span>ก่อน</span>
                        <strong>ภาค {formSemester}/{formAcademicYear} · {formProgramLevel} ปี {formYearLevel}/{formSection}</strong>
                        <span>→ หลัง</span>
                        <strong>ภาค {newSemester}/{newAcademicYear} · {formProgramLevel} ปี {formYearLevel}/{formSection}</strong>
                      </div>
                    )}
                  </section>
                )}
              </div>

              {tempPassword && (
                <p className="users-temp-pass" role="status">
                  รหัสผ่านใหม่: <strong>{tempPassword}</strong> — แจ้งให้นักศึกษาเป็นการส่วนตัว
                </p>
              )}
              {confirmingReset && (
                <div className="users-confirm">
                  <p style={{ margin: "0 0 10px" }}>
                    รีเซ็ตรหัสผ่านของ {fullNameOf(editing)} กลับเป็นรหัสเริ่มต้น (รหัสพนักงาน) ใช่หรือไม่?
                  </p>
                  <div className="users-foot-group">
                    <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setConfirmingReset(false)}>ยกเลิก</button>
                    <button type="button" className="btn btn-primary" disabled={saving} onClick={resetPassword}>{saving ? "กำลังรีเซ็ต…" : "ยืนยันรีเซ็ต"}</button>
                  </div>
                </div>
              )}
              {modalError && <p className="users-alert" role="alert">{modalError}</p>}
            </div>
            <div className="users-modal-foot users-edit-footer">
              <div className="users-foot-group users-edit-actions">
                {!confirmingReset && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={saving}
                      onClick={() => {
                        setModalError(null);
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
                        setModalError(null);
                        setConfirmingReset(false);
                        setDeleteConfirmText("");
                        setConfirmingDelete(true);
                      }}
                    >
                      ลบนักศึกษา
                    </button>
                  </>
                )}
              </div>
              <span className="users-edit-change-count">
                {editChangedCount ? `เปลี่ยนแปลง ${editChangedCount} รายการ` : "ยังไม่มีการเปลี่ยนแปลง"}
              </span>
              <div className="users-foot-group">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={saving}
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
      {editing && confirmingDelete && (
        <div
          className="users-overlay users-delete-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setConfirmingDelete(false);
              setDeleteConfirmText("");
              setModalError(null);
            }
          }}
        >
          <div
            className="users-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="users-delete-title"
            aria-describedby="users-delete-description"
          >
            <div className="users-delete-icon" aria-hidden="true">!</div>
            <h2 id="users-delete-title">{editing.role === "STUDENT" ? "ลบนักศึกษาถาวร?" : "ลบบัญชีผู้ใช้ถาวร?"}</h2>
            <p className="users-delete-subtitle">การลบนี้ย้อนกลับไม่ได้</p>
            <div className="users-delete-user">
              <span className="users-avatar" data-tone={avatarTone(editing.id)} aria-hidden="true">
                {(editing.firstName || "?").charAt(0)}
              </span>
              <div>
                <strong>{fullNameOf(editing)}</strong>
                <span>{editing.studentId ?? "ไม่มีรหัสนักศึกษา"}{editing.shopCode ? ` · ${editing.shopCode}` : ""}</span>
              </div>
            </div>
            <div id="users-delete-description" className="users-delete-warning">
              <strong>โปรดตรวจสอบก่อนลบ</strong>
              <p>ระบบจะปฏิเสธการลบหากบัญชีมีประวัติการลงเวลาหรือการลา และไม่อนุญาตให้ลบบัญชีของตนเอง</p>
            </div>
            <div className="users-edit-field users-delete-confirm-field">
              <label htmlFor="users-delete-confirm" className="field-label">
                พิมพ์{editing.studentId ? "รหัสนักศึกษา" : "ชื่อ-นามสกุล"} <strong>{editing.studentId ?? fullNameOf(editing)}</strong> เพื่อยืนยัน
              </label>
              <input
                id="users-delete-confirm"
                type="text"
                autoFocus
                className="input"
                value={deleteConfirmText}
                onChange={(event) => {
                  setDeleteConfirmText(event.target.value);
                  setModalError(null);
                }}
                aria-invalid={Boolean(modalError)}
              />
            </div>
            {modalError && <p className="users-alert" role="alert">{modalError}</p>}
            <div className="users-delete-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={saving}
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteConfirmText("");
                  setModalError(null);
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="users-delete-button"
                disabled={saving || deleteConfirmText.trim() !== (editing.studentId ?? fullNameOf(editing))}
                onClick={deleteUser}
              >
                {saving ? "กำลังลบ…" : "ลบถาวร"}
              </button>
            </div>
            <p className="users-delete-note">หากมีข้อมูลประวัติ ระบบจะแจ้งและยกเลิกการลบโดยอัตโนมัติ</p>
          </div>
        </div>
      )}
      {deletedNotice && (
        <div className="users-delete-toast" role="status">
          <span aria-hidden="true">✓</span>
          <span>{deletedNotice}</span>
        </div>
      )}
    </div>
  );
}
