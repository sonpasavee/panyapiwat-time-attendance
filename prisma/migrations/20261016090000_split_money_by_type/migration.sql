-- Allow one money row per type per direction per day (cash + TrueMoney).
-- Safe: existing rows were unique on (attendanceId, direction),
-- so extending the key with moneyType cannot create duplicates.
DROP INDEX "MoneyEntry_attendanceId_direction_key";
CREATE UNIQUE INDEX "MoneyEntry_attendanceId_direction_moneyType_key" ON "MoneyEntry"("attendanceId", "direction", "moneyType");
