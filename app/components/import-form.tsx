"use client";

import { useState } from "react";
import { decodeCsvBytes, type CsvEncoding } from "@/lib/csv-encoding";

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

type CsvRecord = { line: number; cells: string[] };

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 500;

const HEADER_ALIASES: Record<string, string> = {
  studentid: "studentid",
  "รหัสนักศึกษา": "studentid",
  firstname: "firstname",
  "ชื่อ": "firstname",
  lastname: "lastname",
  "นามสกุล": "lastname",
  employeecode: "employeecode",
  "รหัสพนักงาน": "employeecode",
  shopcode: "shopcode",
  "รหัสร้าน": "shopcode",
  gradelevel: "gradelevel",
  "ชั้นปี": "gradelevel",
};

function normalizeHeader(value: string) {
  const header = value.replace(/^\uFEFF/, "").trim().toLowerCase();
  return HEADER_ALIASES[header] ?? header;
}

function parseCsv(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let recordLine = 1;

  const finishCell = () => {
    cells.push(cell.trim());
    cell = "";
    afterQuote = false;
  };
  const finishRecord = () => {
    finishCell();
    records.push({ line: recordLine, cells });
    cells = [];
    recordLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else if (character === "\r" || character === "\n") {
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        cell += "\n";
        line += 1;
      } else {
        cell += character;
      }
      continue;
    }

    if (afterQuote && character !== "," && character !== "\r" && character !== "\n" && !/\s/.test(character)) {
      throw new Error(`มีข้อมูลต่อจากเครื่องหมายปิด quote ที่แถว ${line}`);
    }
    if (character === '"') {
      if (cell.trim().length > 0 || afterQuote) {
        throw new Error(`ตำแหน่ง quote ไม่ถูกต้องที่แถว ${line}`);
      }
      cell = "";
      quoted = true;
    } else if (character === ",") {
      finishCell();
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      finishRecord();
      line += 1;
      recordLine = line;
    } else if (!afterQuote) {
      cell += character;
    }
  }

  if (quoted) throw new Error(`มีเครื่องหมาย quote ที่ยังไม่ปิดในแถว ${recordLine}`);
  if (cell.length > 0 || cells.length > 0 || text.endsWith(",")) finishRecord();
  return records;
}

function validate(rows: ParsedRow[]): ParsedRow[] {
  const seenIdentifiers = new Map<string, number>();
  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.studentId) errors.push("ขาดรหัสนักศึกษา");
    else if (row.studentId.length > 40) errors.push("รหัสนักศึกษายาวเกิน 40 ตัวอักษร");
    if (!row.firstName) errors.push("ขาดชื่อ");
    else if (row.firstName.length > 80) errors.push("ชื่อยาวเกิน 80 ตัวอักษร");
    if (!row.lastName) errors.push("ขาดนามสกุล");
    else if (row.lastName.length > 80) errors.push("นามสกุลยาวเกิน 80 ตัวอักษร");
    if (!row.employeeCode) errors.push("ขาดรหัสพนักงาน (ใช้เป็นรหัสผ่านเริ่มต้น)");
    else if (row.employeeCode.length > 40) errors.push("รหัสพนักงานยาวเกิน 40 ตัวอักษร");
    for (const [label, value] of [
      ["รหัสนักศึกษา", row.studentId],
      ["รหัสพนักงาน", row.employeeCode],
    ] as const) {
      if (!value || value.length > 40) continue;
      const previousLine = seenIdentifiers.get(value);
      if (previousLine !== undefined) {
        errors.push(`${label}ซ้ำกับรหัสในแถวที่ ${previousLine}`);
      } else {
        seenIdentifiers.set(value, row.line);
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
  const [fileEncoding, setFileEncoding] = useState<CsvEncoding | null>(null);
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setImportedCount(null);
    setSubmitError("");
    setFileEncoding(null);
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setFileError("กรุณาเลือกไฟล์ .csv");
      setRows(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("ไฟล์ต้องมีขนาดไม่เกิน 1 MB");
      setRows(null);
      return;
    }
    try {
      const decoded = decodeCsvBytes(await file.arrayBuffer());
      const text = decoded.text;
      const records = parseCsv(text).filter(
        ({ cells }) => cells.some((value) => value.trim().length > 0),
      );
      if (records.length < 2) {
        throw new Error("ไฟล์ว่างเปล่า (ต้องมีแถวหัวคอลัมน์และข้อมูลอย่างน้อย 1 แถว)");
      }
      const header = records[0].cells.map(normalizeHeader);
      if (new Set(header).size !== header.length) {
        throw new Error("พบชื่อหัวคอลัมน์ซ้ำ กรุณาตรวจสอบไฟล์");
      }
      const idx = (name: string) => header.indexOf(name);
      const requiredHeaders = ["studentid", "firstname", "lastname", "employeecode"];
      const missingHeaders = requiredHeaders.filter((name) => idx(name) < 0);
      if (missingHeaders.length > 0) {
        throw new Error(`หัวคอลัมน์ต้องมี ${requiredHeaders.join(", ")}`);
      }

      const dataRecords = records.slice(1);
      if (dataRecords.length > MAX_ROWS) {
        throw new Error(`นำเข้าได้ครั้งละไม่เกิน ${MAX_ROWS} รายชื่อ`);
      }
      const malformedRecord = dataRecords.find(
        ({ cells }) => cells.length !== header.length,
      );
      if (malformedRecord) {
        throw new Error(`จำนวนคอลัมน์ในแถว ${malformedRecord.line} ไม่ตรงกับหัวตาราง`);
      }
      const parsed: ParsedRow[] = dataRecords.map(({ line, cells }) => {
        const get = (name: string) => {
          const at = idx(name);
          return at >= 0 ? (cells[at] ?? "") : "";
        };
        return {
          line,
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
      setFileEncoding(decoded.encoding);
      setRows(validate(parsed));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "อ่านไฟล์ CSV ไม่สำเร็จ");
      setRows(null);
    }
  }

  const errorCount = rows?.filter((r) => r.errors.length > 0).length ?? 0;

  async function submitImport() {
    if (!rows || errorCount > 0 || submitting || importedCount !== null) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((row) => ({
            line: row.line,
            studentId: row.studentId,
            firstName: row.firstName,
            lastName: row.lastName,
            employeeCode: row.employeeCode,
            shopCode: row.shopCode,
            gradeLevel: row.gradeLevel,
          })),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "object" &&
          result.error !== null &&
          "message" in result.error &&
          typeof result.error.message === "string"
            ? result.error.message
            : "นำเข้ารายชื่อไม่สำเร็จ";
        throw new Error(message);
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("importedCount" in result) ||
        typeof result.importedCount !== "number"
      ) {
        throw new Error("รูปแบบผลลัพธ์จากเซิร์ฟเวอร์ไม่ถูกต้อง");
      }
      setImportedCount(result.importedCount);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "นำเข้ารายชื่อไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

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
            คอลัมน์บังคับ: studentId, firstName, lastName, employeeCode • ไม่เกิน 500 รายชื่อ / 1 MB
          </span>
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.currentTarget.value = "";
            void handleFile(file);
          }}
        />
      </div>

      {fileError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {fileError}
        </p>
      )}

      {fileEncoding === "Windows-874" && (
        <p role="status" className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1e40af]">
          ตรวจพบไฟล์ภาษาไทยแบบ Windows-874 และแปลงข้อความให้อัตโนมัติ
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
                  <th>รหัสพนักงาน</th>
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
                    <td>{r.employeeCode || "–"}</td>
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
        disabled={!rows || errorCount > 0 || submitting || importedCount !== null}
        onClick={submitImport}
        className="btn btn-primary btn-submit w-full"
      >
        {submitting
          ? "กำลังนำเข้า…"
          : importedCount !== null
            ? `นำเข้าสำเร็จ ${importedCount} คน`
            : `นำเข้ารายชื่อ${rows ? ` ${rows.length - errorCount} คน` : ""}`}
      </button>

      {importedCount !== null && (
        <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          นำเข้ารายชื่อสำเร็จ {importedCount} คน โดยตั้ง username เป็นรหัสนักศึกษา และตั้งรหัสผ่านเริ่มต้นจากรหัสพนักงาน (เก็บเป็น hash)
        </p>
      )}
      {submitError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {submitError}
        </p>
      )}
    </div>
  );
}
