import { requireStudentPage } from "@/lib/page-auth";
import { formatTime } from "@/lib/format";
import { getTodayAttendance } from "@/services/attendance.service";

import AttendanceForm from "../../components/attendance-form";
import { Badge, Card } from "../../components/ui";

export const instant = false;

export default async function StudentCheckInPage() {
  const session = await requireStudentPage();
  const today = await getTodayAttendance(session.id);
  const checkedIn = !!today;
  const checkedOut = !!today?.checkOutAt;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <header>
        <h1 className="m-0 text-[28px] font-bold leading-snug">เช็กอิน / เช็กเอาท์</h1>
        <p className="mt-0.5 text-[15px] muted">
          บันทึกเวลาเข้า–ออกงานพร้อมรูปถ่ายและเงินส่วนตัว
        </p>
      </header>

      <Card labelledBy="status-h" className="card-pad">
        <h2 id="status-h" className="m-0 text-[19px] font-semibold">สถานะวันนี้</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f4f7fb] p-4">
            <p className="m-0 text-[13px] muted">เช็กอิน</p>
            <p className="mt-1 font-semibold">{checkedIn ? `${formatTime(today?.checkInAt)} น.` : "–"}</p>
          </div>
          <div className="rounded-2xl bg-[#f4f7fb] p-4">
            <p className="m-0 text-[13px] muted">เช็กเอาท์</p>
            <p className="mt-1 font-semibold">{checkedOut ? `${formatTime(today?.checkOutAt)} น.` : "–"}</p>
          </div>
          <div className="rounded-2xl bg-[#f4f7fb] p-4">
            <p className="m-0 text-[13px] muted">สถานะ</p>
            <p className="mt-1.5">
              {checkedOut ? (
                <Badge tone="green">ครบ</Badge>
              ) : checkedIn ? (
                <Badge tone="blue">กำลังทำงาน</Badge>
              ) : (
                <Badge tone="gray">ยังไม่เช็กอิน</Badge>
              )}
            </p>
          </div>
        </div>
      </Card>

      <Card labelledBy="form-h" className="card-pad">
        <h2 id="form-h" className="m-0 text-[19px] font-semibold">
          {!checkedIn ? "เช็กอินเข้างาน" : !checkedOut ? "เช็กเอาท์ออกงาน" : "บันทึกวันนี้ครบแล้ว"}
        </h2>
        {!checkedIn ? (
          <AttendanceForm action="check-in" />
        ) : !checkedOut ? (
          <AttendanceForm action="check-out" />
        ) : (
          <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            วันนี้เช็กอินและเช็กเอาท์ครบแล้ว เจอกันใหม่พรุ่งนี้
          </p>
        )}
      </Card>
    </div>
  );
}
