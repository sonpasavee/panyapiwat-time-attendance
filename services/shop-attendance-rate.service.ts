export type ShopAttendanceRate = { shop: string; rate: number };

export function calculateShopAttendanceRates(
  students: Array<{ id: string; shopCode: string | null }>,
  attendanceDays: Array<{ userId: string; _count: { _all: number } }>,
  elapsedWeekdays: number,
) {
  const studentShopById = new Map(
    students.map((student) => [student.id, student.shopCode ?? "–"]),
  );
  const checkDaysByShop = new Map<string, number>();
  for (const row of attendanceDays) {
    const shop = studentShopById.get(row.userId);
    if (shop)
      checkDaysByShop.set(
        shop,
        (checkDaysByShop.get(shop) ?? 0) + row._count._all,
      );
  }

  const studentsByShop = new Map<string, number>();
  for (const student of students) {
    const shop = student.shopCode ?? "–";
    studentsByShop.set(shop, (studentsByShop.get(shop) ?? 0) + 1);
  }

  const rates: ShopAttendanceRate[] = [...studentsByShop.entries()]
    .map(([shop, count]) => ({
      shop,
      rate: Math.min(
        100,
        Math.round(
          ((checkDaysByShop.get(shop) ?? 0) / (count * elapsedWeekdays)) * 100,
        ),
      ),
    }))
    .sort((a, b) => a.rate - b.rate || a.shop.localeCompare(b.shop, "th"));

  const totalStudents = rates.reduce(
    (sum, row) => sum + (studentsByShop.get(row.shop) ?? 0),
    0,
  );
  const avgRate =
    totalStudents === 0
      ? 0
      : Math.round(
          rates.reduce(
            (sum, row) => sum + row.rate * (studentsByShop.get(row.shop) ?? 0),
            0,
          ) / totalStudents,
        );

  return { rates, avgRate };
}
