type Entry = {
  moneyType: "CASH" | "TRUEMONEY";
  direction: "IN" | "OUT";
  amount: {
    toString(): string;
  };
};

function cents(value: string) {
  const negative = value.trim().startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");

  const total = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -total : total;
}

function amount(value: number) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

function signedAmount(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// สตางค์ -> ใช้รวมยอดรายเดือน (export ไว้ให้ service รวมยอดรายเดือน)
export function amountToCents(value: string) {
  return cents(value);
}

// รวมยอดใช้รายเดือนจากยอดรายวัน (สตางค์ -> string ทศนิยม 2 ตำแหน่ง)
export function centsToAmount(value: number) {
  return signedAmount(value);
}

export type DailyMoneyTypeSummary = {
  in: string;
  out: string;
  // ใช้ไป = IN − OUT (ติดลบได้ = ได้เงินเพิ่มระหว่างวัน)
  spent: string;
  // ครบ = มีทั้งแถว IN และ OUT ของประเภทนี้
  complete: boolean;
};

export type DailyMoneySummary = {
  CASH: DailyMoneyTypeSummary;
  TRUEMONEY: DailyMoneyTypeSummary;
  totalSpent: string;
  // ครบ = อย่างน้อยหนึ่งประเภทมีทั้ง IN และ OUT
  complete: boolean;
};

// สรุปรายวันต่อ attendance เดียว: เอาเข้า / คงเหลือ / ใช้ไป แยกสด+ทรู+รวม
// ช่องที่ไม่มีแถวบันทึกถือเป็น 0 (เว้นว่างตอนกรอก = ไม่บันทึก)
export function summarizeDailyMoney(entries: Entry[]): DailyMoneySummary {
  const sums = {
    CASH: { in: 0, out: 0, hasIn: false, hasOut: false },
    TRUEMONEY: { in: 0, out: 0, hasIn: false, hasOut: false },
  };

  for (const entry of entries) {
    const slot = sums[entry.moneyType];
    if (entry.direction === "IN") {
      slot.in += cents(entry.amount.toString());
      slot.hasIn = true;
    } else {
      slot.out += cents(entry.amount.toString());
      slot.hasOut = true;
    }
  }

  const build = (
    slot: (typeof sums)["CASH"],
  ): DailyMoneyTypeSummary => ({
    in: amount(slot.in),
    out: amount(slot.out),
    spent: signedAmount(slot.in - slot.out),
    complete: slot.hasIn && slot.hasOut,
  });

  const CASH = build(sums.CASH);
  const TRUEMONEY = build(sums.TRUEMONEY);

  return {
    CASH,
    TRUEMONEY,
    totalSpent: signedAmount(
      sums.CASH.in - sums.CASH.out + (sums.TRUEMONEY.in - sums.TRUEMONEY.out),
    ),
    complete: CASH.complete || TRUEMONEY.complete,
  };
}

export function summarizeMoneyEntries(entries: Entry[]) {
  const totals = {
    CASH: {
      in: 0,
      out: 0,
    },
    TRUEMONEY: {
      in: 0,
      out: 0,
    },
  };

  for (const entry of entries) {
    totals[entry.moneyType][entry.direction.toLowerCase() as "in" | "out"] +=
      cents(entry.amount.toString());
  }

  const cashNet = totals.CASH.in - totals.CASH.out;
  const trueMoneyNet = totals.TRUEMONEY.in - totals.TRUEMONEY.out;

  return {
    CASH: {
      in: amount(totals.CASH.in),
      out: amount(totals.CASH.out),
      net: amount(cashNet),
    },

    TRUEMONEY: {
      in: amount(totals.TRUEMONEY.in),
      out: amount(totals.TRUEMONEY.out),
      net: amount(trueMoneyNet),
    },

    net: amount(cashNet + trueMoneyNet),
  };
}
