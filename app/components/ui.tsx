import type { ReactNode } from "react";

export function Card({
  children,
  labelledBy,
  label,
  className = "",
}: {
  children: ReactNode;
  labelledBy?: string;
  label?: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={`card ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  id,
  title,
  aside,
}: {
  id?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3.5">
      <h2 id={id} className="m-0 text-[19px] font-semibold">
        {title}
      </h2>
      {aside}
    </div>
  );
}

type BadgeTone = "green" | "blue" | "yellow" | "pink" | "gray";

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// ป้ายสถานะการลงเวลา (ตาม AGENTS.md)
export function AttendanceBadge({
  checkedOut,
  missed,
}: {
  checkedOut: boolean;
  missed?: boolean;
}) {
  if (checkedOut) return <Badge tone="green">ครบ</Badge>;
  if (missed) return <Badge tone="yellow">ไม่ได้เช็กเอาท์</Badge>;
  return <Badge tone="blue">กำลังทำงาน</Badge>;
}

// ป้ายประเภทการลา (HOLIDAY ใช้เทาตามโทนกลาง — mock ระบุแค่ลาป่วย/ลากิจ)
export function LeaveBadge({ type }: { type: string }) {
  if (type === "SICK") return <Badge tone="pink">ลาป่วย</Badge>;
  if (type === "PERSONAL") return <Badge tone="yellow">ลากิจ</Badge>;
  return <Badge tone="gray">วันหยุด</Badge>;
}

export function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="card card-pad">
      <div
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <p className="mt-3 text-[13px] muted">{label}</p>
      <p className="mt-0.5 text-[26px] font-bold leading-[1.25]">{value}</p>
      {sub && <p className="m-0 text-xs muted">{sub}</p>}
    </div>
  );
}
