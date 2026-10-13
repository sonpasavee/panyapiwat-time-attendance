
import { z } from "zod";

// NOTE: Turbopack dev เคยเสิร์ฟโมดูลนี้เวอร์ชันเก่า (ไม่มี studentImportSchema)
// คอมเมนต์บรรทัดนี้ไว้บังคับ re-transform — ลบได้เมื่อ dev server รีสตาร์ตแล้ว
const studentImportRowSchema = z
  .object({
    line: z.number().int().positive(),
    studentId: z.string().trim().min(1).max(40),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    employeeCode: z.string().trim().min(1).max(40),
    shopCode: z
      .string()
      .trim()
      .max(40)
      .optional()
      .or(z.literal("")),
    gradeLevel: z.preprocess(
      (value) => (value === "" || value === undefined ? undefined : value),
      z.coerce.number().int().min(1).max(20).optional(),
    ),
  })
  .strict();

export const studentImportSchema = z
  .object({
    rows: z.array(studentImportRowSchema).min(1).max(500),
  })
  .strict()
  .superRefine(({ rows }, context) => {
    const seenIdentifiers = new Map<string, number>();

    rows.forEach((row, index) => {
      for (const [field, value] of [
        ["studentId", row.studentId],
        ["employeeCode", row.employeeCode],
      ] as const) {
        const previousLine = seenIdentifiers.get(value);
        if (previousLine !== undefined) {
          context.addIssue({
            code: "custom",
            path: ["rows", index, field],
            message: `รหัสซ้ำกับแถวที่ ${previousLine}`,
          });
        } else {
          seenIdentifiers.set(value, row.line);
        }
      }
    });
  });

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;

// ============================================
// 2. Login Schema
// ============================================

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128),
});

// ============================================
// 3. Money Amount Schema
// ============================================

export const moneyAmountSchema = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/)
  .refine((value) => {
    const [whole, fraction = ""] = value.split(".");

    const amountInSatang =
      BigInt(whole) * BigInt(100) +
      BigInt(fraction.padEnd(2, "0"));

    return amountInSatang <= BigInt("9999999999");
  }, "Amount is too large");

// ============================================
// 4. Attendance Fields Schema
// ============================================

export const attendanceFieldsSchema = z.object({
  moneyAmount: moneyAmountSchema,
  moneyType: z.enum(["CASH", "TRUEMONEY"]),

  note: z
    .string()
    .trim()
    .max(1000)
    .optional(),
});

// ============================================
// 5. ID Schema
// ============================================

export const idSchema = z.string().uuid();

// ============================================
// 6. Admin Users Query Schema
// ============================================

export const adminUsersQuerySchema = z.object({
  role: z.enum(["STUDENT", "ADMIN"]).optional(),

  shopCode: z
    .string()
    .trim()
    .max(40)
    .optional(),

  gradeLevel: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional(),

  q: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

// ============================================
// 7. Admin Attendance Query Schema
// ============================================

export const adminAttendanceQuerySchema = z.object({
  date: z.string().date().optional(),

  status: z
    .enum(["checked-in", "checked-out"])
    .optional(),

  sort: z.enum(["asc", "desc"]).optional(),

  shopCode: z
    .string()
    .trim()
    .max(40)
    .optional(),

  q: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

// ============================================
// 8. Admin Leaves Query Schema
// ============================================

export const adminLeavesQuerySchema = z.object({
  type: z
    .enum(["HOLIDAY", "SICK", "PERSONAL"])
    .optional(),

  month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional(),

  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2200)
    .optional(),

  userId: idSchema.optional(),

  shopCode: z
    .string()
    .trim()
    .max(40)
    .optional(),
});

// ============================================
// 9. Role Change Schema
// ============================================

export const roleChangeSchema = z.object({
  role: z.enum(["ADMIN", "STUDENT"]),
});

// ============================================
// 10. Leave Schema
// ============================================

export const leaveSchema = z
  .object({
    leaveType: z
      .enum(["HOLIDAY", "SICK", "PERSONAL"])
      .optional(),

    type: z
      .enum(["HOLIDAY", "SICK", "PERSONAL"])
      .optional(),

    startDate: z.string().date(),
    endDate: z.string().date(),

    reason: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable(),
  })
  .refine(
    (value) => value.startDate <= value.endDate,
    {
      path: ["endDate"],
      message: "endDate must not precede startDate",
    },
  )
  .refine(
    (value) => value.leaveType || value.type,
    {
      path: ["leaveType"],
      message: "leaveType is required",
    },
  );

// ============================================
// 11. Profile Schema
// ============================================

export const profileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional(),

    lastName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional(),

    gradeLevel: z
      .number()
      .int()
      .min(1)
      .max(20)
      .nullable()
      .optional(),

    shopCode: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .optional(),
  })
  .strict();

// ============================================
// 12. Admin User Schema
// ============================================

export const userAdminSchema = profileSchema
  .extend({
    employeeCode: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .optional(),

    studentId: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .optional(),

    isActive: z.boolean().optional(),

    role: z
      .enum(["ADMIN", "STUDENT"])
      .optional(),
  })
  .strict();

// ============================================
// 13. Pagination Helper
// ============================================

export function pagination(search: URLSearchParams) {
  const paginationSchema = z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
  });

  const { page, pageSize } = paginationSchema.parse({
    page: search.get("page") ?? undefined,
    pageSize: search.get("pageSize") ?? undefined,
  });

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

// ============================================
// 14. Month / Year Helper
// ============================================

export function monthYear(search: URLSearchParams) {
  const now = new Date();

  const currentMonth = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Bangkok",
    month: "numeric",
  }).format(now);

  const currentYear = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).format(now);

  const monthYearSchema = z.object({
    month: z.coerce
      .number()
      .int()
      .min(1)
      .max(12),

    year: z.coerce
      .number()
      .int()
      .min(2000)
      .max(2200),
  });

  return monthYearSchema.parse({
    month: search.get("month") ?? currentMonth,
    year: search.get("year") ?? currentYear,
  });
}