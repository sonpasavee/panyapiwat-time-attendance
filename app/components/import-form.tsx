"use client";

import { useState } from "react";

type ParsedRow = {
  line: number;
  studentId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  shopCode: string;
  gradeLevel: string;
  errors: string[];
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function validate(rows: ParsedRow[]): ParsedRow[] {
  const seenStudent = new Map<string, number>();
  const seenEmp = new Map<string, number>();
  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.studentId) errors.push("ขาดรหัสนักศึกษา");
    else if (row.studentId.length > 40) errors.push("รหัสนักศึกษายาวเกิน 40 ตัวอักษร");
    else {
      const prev = seenStudent.get(row.studentId);
      if (prev) errors.push(`รหัสนักศึกษาซ้ำกับแถวที่ ${prev}`);
      else seenStudent.set(row.studentId, row.line);
    }
    if (!row.firstName) errors.push("ขาดชื่อ");
    else if (row.firstName.length > 80) errors.push("ชื่อยาวเกิน 80 ตัวอักษร");
    if (!row.lastName) errors.push("ขาดนามสกุล");
    else if (row.lastName.length > 80) errors.push("นามสกุลยาวเกิน 80 ตัวอักษร");
    if (row.employeeCode) {
      if (row.employeeCode.length > 40) errors.push("รหัสพนักงานยาวเกิน 40 ตัวอักษร");
      else {
        const prev = seenEmp.get(row.employeeCode);
        if (prev) errors.push(`รหัสพนักงานซ้ำกับแถวที่ ${prev}`);
        else seenEmp.set(row.employeeCode, row.line);
      }
    }
    if (row.shopCode && row.shopCode.length > 40)
      errors.push("รหัสร้านยาวเกิน 40 ตัวอักษร");
    if (row.gradeLevel) {
      const n = Number(row.gradeLevel);
      if (!Number.isInteger(n) || n < 1 || n > 20)
        errors.push("ชั้นปีต้องเป็นเลข 1–20");
    }
    return { ...row, errors };
  });
}

export default function ImportForm() {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [notice, setNotice] = useState(false);

  async function handleFile(file: File | undefined) {
    setNotice(false);
    if (!file) return;
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setFileError("กรุณาเลือกไฟล์ .csv");
      setRows(null);
      return;
    }
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setFileError("ไฟล์ว่างเปล่า (ต้องมีแถวหัวคอลัมน์ + ข้อมูลอย่างน้อย 1 แถว)");
      setRows(null);
      return;
    }
    const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    if (idx("studentid") < 0 || idx("firstname") < 0 || idx("lastname") < 0) {
      setFileError(
        "หัวคอลัมน์ต้องมี studentId, firstName, lastName (คอลัมน์เสริม: employeeCode, shopCode, gradeLevel)",
      );
      setRows(null);
      return;
    }
    const parsed: ParsedRow[] = lines.slice(1).map((line, i) => {
      const c = splitCsvLine(line);
      const get = (n: string) => {
        const at = idx(n);
        return at >= 0 ? (c[at] ?? "") : "";
      };
      return {
        line: i + 2,
        studentId: get("studentid"),
        firstName: get("firstname"),
        lastName: get("lastname"),
        employeeCode: get("employeecode"),
        shopCode: get("shopcode"),
        gradeLevel: get("gradelevel"),
        errors: [],
      };
    });
    setFileError("");
    setRows(validate(parsed));
  }

  const errorCount = rows?.filter((r) => r.errors.length > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span id="import-file-label" className="field-label">
          ไฟล์รายชื่อ (.csv)
        </span>
        <label
          htmlFor="import-file"
          aria-labelledby="import-file-label"
          className="mt-1.5 flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#b3c2d8] bg-[#f8fafd] px-4 py-6 text-center transition hover:border-[#1d63d8]"
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1d63d8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
          <span className="text-[15px] font-semibold">
            {fileName || "เลือกไฟล์ CSV"}
          </span>
          <span className="muted text-[13px]">
            คอลัมน์: studentId, firstName, lastName, employeeCode, shopCode, gradeLevel
          </span>
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {fileError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {fileError}
        </p>
      )}

      {rows && (
        <div className="overflow-hidden rounded-[14px] border border-[#e3e9f2]">
          <p className="border-b border-[#edf1f7] bg-[#f8fafd] px-4 py-3 text-sm">
            พบ {rows.length} แถว
            {errorCount > 0 ? (
              <span className="font-semibold text-red-700"> • มีข้อผิดพลาด {errorCount} แถว</span>
            ) : (
              <span className="font-semibold text-green-800"> • ผ่านทั้งหมด</span>
            )}
          </p>
          <div className="max-h-80 overflow-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>แถว</th>
                  <th>รหัสนักศึกษา</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ร้าน/ชั้นปี</th>
                  <th>ผลตรวจ</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.studentId || "–"}</td>
                    <td>{`${r.firstName} ${r.lastName}`.trim() || "–"}</td>
                    <td>{[r.shopCode, r.gradeLevel && `ปี ${r.gradeLevel}`].filter(Boolean).join(" • ") || "–"}</td>
                    <td>
                      {r.errors.length === 0 ? (
                        <span className="badge badge-green">ผ่าน</span>
                      ) : (
                        <span className="text-[13px] text-red-700">{r.errors.join("; ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && (
            <p className="muted px-4 py-2 text-[13px]">แสดง 100 แถวแรก</p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!rows || errorCount > 0}
        onClick={() => setNotice(true)}
        className="btn btn-primary btn-submit w-full"
      >
        นำเข้ารายชื่อ{rows ? ` ${rows.length - errorCount} คน` : ""}
      </button>

      {notice && (
        <p role="status" className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#78350f]">
          ไฟล์ผ่านการตรวจสอบแล้ว การบันทึกลงฐานข้อมูลจะเปิดใช้งานในเฟสถัดไป (API นำเข้ารายชื่อ)
        </p>
      )}
    </div>
  );
}
