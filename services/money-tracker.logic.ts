type Entry = {
  moneyType: "CASH" | "TRUEMONEY";
  direction: "IN" | "OUT";
  amount: {
    toString(): string;
  };
};

function cents(value: string) {
  const [whole, fraction = ""] = value.split(".");

  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function amount(value: number) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
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
