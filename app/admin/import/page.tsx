import { requireAdminPage } from "@/lib/page-auth";

import ImportForm from "../../components/import-form";
import { Card } from "../../components/ui";

export const instant = false;

const COLUMNS: Array<[string, string]> = [
  ["studentId", "รหัสนักศึกษา (บังคับ, ไม่ซ้ำ)"],
  ["firstName", "ชื่อ (บังคับ)"],
  ["lastName", "นามสกุล (บังคับ)"],
  ["employeeCode", "รหัสพนักงาน (บังคับ, ไม่ซ้ำ, ใช้เป็นรหัสผ่านเริ่มต้น)"],
  ["shopCode", "รหัสร้าน (ถ้ามี)"],
  ["gradeLevel", "ชั้นปี 1–20 (ถ้ามี)"],
];

export default async function AdminImportPage() {
  await requireAdminPage();

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">นำเข้ารายชื่อ</h1>
        <p className="mt-0.5 text-[15px] muted">
          อัปโหลดไฟล์ CSV เพื่อตรวจสอบและนำเข้ารายชื่อนักศึกษา
          (ไม่มีสมัครสมาชิกเอง — เฉพาะเจ้าหน้าที่นำเข้า)
        </p>
      </header>

      <Card labelledBy="fmt-h" className="card-pad">
        <h2 id="fmt-h" className="m-0 text-[17px] font-semibold">รูปแบบไฟล์</h2>
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm">
          {COLUMNS.map(([col, desc]) => (
            <li key={col} className="flex flex-col gap-1 rounded-xl bg-[#f8fafd] px-3.5 py-2.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-2">
              <code className="font-mono text-[13px] font-semibold break-all">{col}</code>
              <span className="muted text-[13px]">{desc}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card labelledBy="up-h" className="card-pad">
        <h2 id="up-h" className="m-0 text-[19px] font-semibold">อัปโหลดและตรวจสอบ</h2>
        <p className="muted mt-2 text-sm">
          รหัสผ่านเริ่มต้นจะเป็นรหัสพนักงานและถูกเก็บเป็น hash; ระบบยังไม่มีหน้าสำหรับเปลี่ยนรหัสผ่าน
          จึงควรแจ้งข้อมูลเริ่มต้นให้นักศึกษาเป็นการส่วนตัว
        </p>
        <div className="mt-4">
          <ImportForm />
        </div>
      </Card>
    </div>
  );
}
