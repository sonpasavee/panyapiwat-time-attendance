"use client";

import { useState } from "react";
import { decodeCsvBytes, type CsvEncoding } from "@/lib/csv-encoding";
import { inferClassAndTerm, parseClassGroup } from "@/lib/import-parse";
import * as XLSX from "xlsx";

type ParsedRow = {
  line: number;
  studentId: string;
  titlePrefix: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  branchName: string;
  programLevel: string;
  yearLevel: string;
  section: string;
  academicYear: string;
  semester: string;
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
  shopcode: "branchname",
  branchname: "branchname",
  class: "classgroup",
  classgroup: "classgroup",
  titleprefix: "titleprefix",
  "รหัสร้าน": "branchname",
  gradelevel: "yearlevel",
  yearlevel: "yearlevel",
  programlevel: "programlevel",
  section: "section",
  academicyear: "academicyear",
  semester: "semester",
  "ชั้นปี": "gradelevel",
  "ปีการศึกษา": "academicyear",
  "ภาคเรียน": "semester",
  "ภาคเรียนที่": "semester",
  "เทอม": "semester",
};

HEADER_ALIASES["\u0e23\u0e2b\u0e31\u0e2a\u0e19\u0e31\u0e01\u0e28\u0e36\u0e01\u0e29\u0e32"] = "studentid";
HEADER_ALIASES["\u0e23\u0e2b\u0e31\u0e2a\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19"] = "studentid";
HEADER_ALIASES["\u0e23\u0e2b\u0e31\u0e2a\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19"] = "employeecode";
HEADER_ALIASES["\u0e2a\u0e01\u0e38\u0e25"] = "lastname";
HEADER_ALIASES["\u0e2a\u0e32\u0e02\u0e32\u0e23\u0e49\u0e32\u0e19"] = "branchname";
HEADER_ALIASES["\u0e2a\u0e32\u0e02\u0e32\u0e1d\u0e36\u0e01\u0e07\u0e32\u0e19"] = "branchname";
HEADER_ALIASES["\u0e0a\u0e31\u0e49\u0e19"] = "classgroup";
HEADER_ALIASES["\u0e0a\u0e31\u0e49\u0e19\u0e40\u0e23\u0e35\u0e22\u0e19"] = "classgroup";
HEADER_ALIASES["\u0e17\u0e35\u0e48"] = "rownumber";
HEADER_ALIASES["\u0e23\u0e2b\u0e31\u0e2a\u0e23\u0e49\u0e32\u0e19"] = "branchname";
HEADER_ALIASES["\u0e0a\u0e31\u0e49\u0e19\u0e1b\u0e35"] = "yearlevel";

function spreadsheetCellToString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function readWorkbookRecords(buffer: ArrayBuffer): CsvRecord[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("ไม่พบ worksheet ในไฟล์ Excel");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
  return matrix.map((cells, index) => ({
    line: index + 1,
    cells: cells.map(spreadsheetCellToString),
  }));
}

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
    if (!row.branchName || row.branchName.length > 120) errors.push("กรุณาระบุสาขาร้านไม่เกิน 120 ตัวอักษร");
    if (!row.programLevel || row.programLevel.length > 40) errors.push("กรุณาระบุระดับการศึกษาไม่เกิน 40 ตัวอักษร");
    const yearLevel = Number(row.yearLevel);
    if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 20) errors.push("ชั้นปีต้องเป็นเลข 1–20");
    if (!row.section || row.section.length > 40) errors.push("กรุณาระบุห้องไม่เกิน 40 ตัวอักษร");
    const academicYear = Number(row.academicYear);
    if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > 2700) errors.push("ปีการศึกษาไม่ถูกต้อง");
    const semester = Number(row.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 3) errors.push("ภาคเรียนต้องเป็นเลข 1–3");
    return { ...row, errors };
  });
}

export default function ImportForm() {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileEncoding, setFileEncoding] = useState<CsvEncoding | "XLSX" | null>(null);
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
    const isXlsx = /\.xlsx$/i.test(file.name);
    if (!isXlsx && !/\.csv$/i.test(file.name)) {
      setFileError("กรุณาเลือกไฟล์ .xlsx หรือ .csv");
      setRows(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("ไฟล์ต้องมีขนาดไม่เกิน 1 MB");
      setRows(null);
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const decoded = isXlsx ? null : decodeCsvBytes(buffer);
      const records = (isXlsx ? readWorkbookRecords(buffer) : parseCsv(decoded!.text)).filter(
        ({ cells }) => cells.some((value) => value.trim().length > 0),
      );
      if (records.length < 2) {
        throw new Error("ไฟล์ว่างเปล่า (ต้องมีแถวหัวคอลัมน์และข้อมูลอย่างน้อย 1 แถว)");
      }
      const headerIndex = records.findIndex(({ cells }) => {
        const candidate = cells.map(normalizeHeader);
        return candidate.includes("studentid") &&
          (candidate.includes("employeecode") || candidate.includes("branchname") || candidate.includes("classgroup"));
      });
      if (headerIndex < 0) throw new Error("ไม่พบแถวหัวตารางที่มีรหัสนักศึกษาและรหัสพนักงาน/สาขา/ชั้น");
      const header = records[headerIndex].cells.map(normalizeHeader);
      const nonEmptyHeader = header.filter(Boolean);
      if (new Set(nonEmptyHeader).size !== nonEmptyHeader.length) {
        throw new Error("พบชื่อหัวคอลัมน์ซ้ำ กรุณาตรวจสอบไฟล์");
      }
      const idx = (name: string) => header.indexOf(name);
      const requiredHeaders = ["studentid", "employeecode"];
      const missingHeaders = requiredHeaders.filter((name) => idx(name) < 0);
      if (missingHeaders.length > 0) {
        throw new Error(`หัวคอลัมน์ต้องมี ${requiredHeaders.join(", ")}`);
      }

      const title = records.slice(0, headerIndex).flatMap(({ cells }) => cells).join(" ");
      const inferred = inferClassAndTerm(title);
      const studentIdIndex = idx("studentid");
      const employeeCodeIndex = idx("employeecode");
      const hasUnlabeledPrefixColumn = idx("firstname") < 0 && employeeCodeIndex - studentIdIndex >= 4;
      const inferredFirstNameIndex = studentIdIndex + (hasUnlabeledPrefixColumn ? 2 : 1);
      const firstNameIndex = idx("firstname") >= 0 ? idx("firstname") : inferredFirstNameIndex;
      const lastNameIndex = idx("lastname") >= 0 ? idx("lastname") : firstNameIndex + 1;
      const dataRecords = records.slice(headerIndex + 1);
      if (dataRecords.length > MAX_ROWS) {
        throw new Error(`นำเข้าได้ครั้งละไม่เกิน ${MAX_ROWS} รายชื่อ`);
      }
      const malformedRecord = dataRecords.find(
        ({ cells }) => cells.length <= Math.max(studentIdIndex, idx("employeecode"), idx("branchname"), idx("classgroup")),
      );
      if (malformedRecord) {
        throw new Error(`จำนวนคอลัมน์ในแถว ${malformedRecord.line} ไม่ตรงกับหัวตาราง`);
      }
      const parsed: ParsedRow[] = dataRecords.map(({ line, cells }) => {
        const get = (name: string) => {
          const at = idx(name);
          return at >= 0 ? (cells[at] ?? "") : "";
        };
        const getAt = (at: number) => at >= 0 ? (cells[at] ?? "") : "";
        const classGroup = parseClassGroup(get("classgroup"));
        return {
          line,
          studentId: get("studentid"),
          titlePrefix: get("titleprefix") || (hasUnlabeledPrefixColumn ? getAt(studentIdIndex + 1) : ""),
          firstName: get("firstname") || getAt(firstNameIndex),
          lastName: get("lastname") || getAt(lastNameIndex),
          employeeCode: get("employeecode"),
          branchName: get("branchname"),
          programLevel: get("programlevel") || classGroup?.programLevel || inferred.programLevel,
          yearLevel: get("yearlevel") || classGroup?.yearLevel || inferred.yearLevel,
          section: get("section") || classGroup?.section || inferred.section,
          academicYear: get("academicyear") || inferred.academicYear,
          semester: get("semester") || inferred.semester,
          errors: [],
        };
      });
      setFileError("");
      setFileEncoding(isXlsx ? "XLSX" : decoded!.encoding);
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
            titlePrefix: row.titlePrefix,
            firstName: row.firstName,
            lastName: row.lastName,
            employeeCode: row.employeeCode,
            branchName: row.branchName,
            programLevel: row.programLevel,
            yearLevel: Number(row.yearLevel),
            section: row.section,
            academicYear: Number(row.academicYear),
            semester: Number(row.semester),
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
        const details = typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "object" && result.error !== null && "details" in result.error
            ? result.error.details
            : undefined;
        const detailText = details && typeof details === "object"
          ? Object.entries(details).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : JSON.stringify(value)}`).join(" | ")
          : "";
        throw new Error(detailText ? `${message}: ${detailText}` : message);
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
          ไฟล์รายชื่อ (.xlsx หรือ .csv)
        </span>
        <label
          htmlFor="import-file"
          aria-labelledby="import-file-label"
          className="mt-1.5 flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#b3c2d8] bg-[#f8fafd] px-4 py-6 text-center transition hover:border-[#1d63d8]"
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1d63d8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
          <span className="max-w-full break-words text-[15px] font-semibold">
            {fileName || "เลือกไฟล์ CSV"}
          </span>
          <span className="muted text-[13px]">
            คอลัมน์บังคับ: studentId, firstName, lastName, employeeCode • ไม่เกิน 500 รายชื่อ / 1 MB
          </span>
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
            <table className="tbl min-w-[640px]">
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
                {rows.slice(0, 100).map((r, index) => (
                  <tr key={r.line}>
                    <td>{index + 1}</td>
                    <td>{r.studentId || "–"}</td>
                    <td>{r.employeeCode || "–"}</td>
                    <td>{`${r.firstName} ${r.lastName}`.trim() || "–"}</td>
                    <td>{[
                      r.branchName,
                      [r.programLevel, r.yearLevel ? `ปี ${r.yearLevel}` : "", r.section ? `ห้อง ${r.section}` : ""].filter(Boolean).join(" "),
                      r.semester && r.academicYear ? `ภาคเรียน ${r.semester}/${r.academicYear}` : "",
                    ].filter(Boolean).join(" • ") || "–"}</td>
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
