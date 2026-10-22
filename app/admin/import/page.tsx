import { requireAdminPage } from "@/lib/page-auth";

import ImportForm from "../../components/import-form";
import { Card } from "../../components/ui";

export const instant = false;

const COLUMNS: Array<[string, string, string]> = [
  ["รหัสนักเรียน", "studentId", "รหัสประจำตัวนักเรียน"],
  ["ชื่อ", "firstName", "ชื่อจริง"],
  ["สกุล", "lastName", "นามสกุล"],
  ["รหัสพนักงาน", "employeeCode", "ใช้เป็นรหัสผ่านเริ่มต้น"],
  ["รหัสร้าน", "branchName", "สาขาที่ฝึกงาน"],
  ["ชั้น", "classGroup", "เช่น ปวช.1B หรือ ปวส.2A"],
  ["ปีการศึกษา", "academicYear", "เช่น 2569"],
  ["ภาคเรียน", "semester", "1–3"],
];

export default async function AdminImportPage() {
  await requireAdminPage();

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <header>
        <h1 className="m-0 text-2xl font-bold leading-snug sm:text-[28px]">นำเข้ารายชื่อ</h1>
        <p className="mt-0.5 text-[15px] muted">
          เตรียมรายชื่อนักศึกษาใน Excel แล้วอัปโหลดไฟล์ .xlsx ได้เลย (เจ้าหน้าที่เป็นผู้เพิ่มรายชื่อ)
        </p>
        <p className="mt-2 text-sm text-[#1750b8]">
          ใช้รูปแบบตารางตามตัวอย่างด้านล่างได้ ระบบอ่านหัวคอลัมน์ภาษาไทยให้เอง ไม่ต้องเปลี่ยนชื่อคอลัมน์หรือบันทึกเป็น CSV
        </p>
      </header>

      <Card labelledBy="fmt-h" className="card-pad">
        <h2 id="fmt-h" className="m-0 text-[17px] font-semibold">จัดคอลัมน์ใน Excel แบบนี้</h2>
        <p className="muted mt-2 text-sm">
          หนึ่งแถวต่อหนึ่งคน เรียงคอลัมน์ตามตัวอย่าง และใส่หัวตารางไว้แถวแรกของตาราง
        </p>
        <p className="mb-0 mt-3 text-xs font-medium text-[#5b6b82]">ตัวอย่างข้อมูลสมมติ</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[#e3e9f2]">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="bg-[#eaf1ff] text-[#1750b8]">
              <tr>
                {COLUMNS.map(([label]) => <th key={label} className="px-3 py-2.5 font-semibold">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="px-3 py-2.5">0000000000</td>
                <td className="px-3 py-2.5">ชื่อจริง</td>
                <td className="px-3 py-2.5">นามสกุล</td>
                <td className="px-3 py-2.5">EMP0001</td>
                <td className="px-3 py-2.5">ชื่อสาขา</td>
                <td className="px-3 py-2.5">ปวช.1A</td>
                <td className="px-3 py-2.5">2569</td>
                <td className="px-3 py-2.5">1</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm">
          {COLUMNS.map(([label, field, desc]) => (
            <li key={field} className="flex flex-col gap-1 rounded-xl bg-[#f8fafd] px-3.5 py-2.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-2">
              <span><strong>{label}</strong> <code className="font-mono text-[12px]">({field})</code></span>
              <span className="muted text-[13px]">{desc}</span>
            </li>
          ))}
        </ul>
        <p className="muted mb-0 mt-3 text-sm">
          แนะนำให้ใส่คอลัมน์ปีการศึกษาและภาคเรียนในตาราง ถ้าไม่มี ระบบจะอ่านจากหัวเรื่องเหนือตารางแทน
          เช่น “รายชื่อนักเรียน ปวช.1B ปีการศึกษา 2569 ภาคเรียนที่ 1” หรือ “ปีการศึกษา 1/2569”
          โดยต้องมีปีการศึกษาและภาคเรียนให้ครบทุกแถว
        </p>
      </Card>

      <Card labelledBy="up-h" className="card-pad">
        <h2 id="up-h" className="m-0 text-[19px] font-semibold">อัปโหลดและตรวจสอบ</h2>
        <p className="muted mt-2 text-sm">
          รหัสผ่านเริ่มต้นจะเป็นรหัสพนักงานและถูกเก็บเป็น hash;
          นักศึกษาสามารถเปลี่ยนรหัสผ่านได้เองที่หน้า “บัญชีของฉัน → เปลี่ยนรหัสผ่าน”
        </p>
        <div className="mt-4">
          <ImportForm />
        </div>
      </Card>
    </div>
  );
}
