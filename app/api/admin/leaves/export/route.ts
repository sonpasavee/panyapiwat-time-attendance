import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { adminLeavesQuerySchema, monthYear } from "@/validators/api";
import {
  buildAdminLeaveFilter,
  listAdminLeaves,
} from "@/services/leave.service";

const TYPE_LABEL = {
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  HOLIDAY: "วันหยุด",
} as const;

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireUser("ADMIN");
    const query = new URL(request.url).searchParams;
    const filters = adminLeavesQuerySchema.parse(Object.fromEntries(query));
    const monthYearFilter =
      query.has("month") || query.has("year") ? monthYear(query) : undefined;
    const where = await buildAdminLeaveFilter({
      type: filters.type,
      month: monthYearFilter?.month,
      year: monthYearFilter?.year,
      userId: filters.userId,
      shopCode: filters.shopCode,
      gradeLevel: filters.gradeLevel,
      section: filters.section,
      academicTermId: filters.academicTermId,
      q: filters.q,
    });

    const { items } = await listAdminLeaves(where, 0, 20_000, filters.academicTermId);
    const rows = items.map((leave) => [
      `${leave.user.firstName} ${leave.user.lastName}`,
      leave.user.studentId ?? "–",
      leave.user.shopCode ?? "–",
      TYPE_LABEL[leave.type],
      `${dateFmt.format(leave.startDate)} – ${dateFmt.format(leave.endDate)}`,
      leave.reason ?? "–",
      timeFmt.format(leave.createdAt),
    ]);
    const csv = "\uFEFF" + [
      ["ชื่อ", "รหัสนักศึกษา", "ร้าน", "ประเภท", "วันที่", "เหตุผล", "บันทึกเมื่อ"],
      ...rows,
    ].map((row) => row.map(csvCell).join(",")).join("\r\n");

    const label = monthYearFilter
      ? `${monthYearFilter.year}-${String(monthYearFilter.month).padStart(2, "0")}`
      : "all";
    const filename = `การลา_${label}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leaves-${label}.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
