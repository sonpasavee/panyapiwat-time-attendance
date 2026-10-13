type SpinnerProps = {
  /** เส้นผ่านศูนย์กลาง px (default 64 ตามรูปอ้างอิง) */
  size?: number;
  /** ข้อความสำหรับ screen reader + ข้อความใต้ spinner */
  label?: string;
  /** ซ่อนข้อความใต้ spinner (เหลือแค่ตัวหมุน + aria-label) */
  hideText?: boolean;
};

const TRACK = "#e3e9f2";
const ARC_PRIMARY = "#1d63d8";
const ARC_SECONDARY = "#93b4f0";

function DualArc({ size }: { size: number }) {
  return (
    <span aria-hidden="true" className="spinner" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" stroke={TRACK} strokeWidth="5" opacity="0.7" />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke={ARC_SECONDARY}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="52 124"
          transform="rotate(-90 32 32)"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke={ARC_PRIMARY}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="36 140"
          strokeDashoffset="-52"
          transform="rotate(-90 32 32)"
        />
      </svg>
    </span>
  );
}

export function LoadingSpinner({
  size = 64,
  label = "กำลังโหลดข้อมูล...",
  hideText = false,
}: SpinnerProps) {
  if (hideText) {
    return (
      <span role="status" aria-live="polite" aria-label={label}>
        <DualArc size={size} />
      </span>
    );
  }

  return (
    <span role="status" aria-live="polite" className="loading-inline">
      <DualArc size={size} />
      <span className="loading-text">{label}</span>
    </span>
  );
}

export function PageLoading({ message = "กำลังโหลดข้อมูล..." }: { message?: string }) {
  return (
    <div aria-busy="true" className="loading-page">
      <LoadingSpinner label={message} />
    </div>
  );
}
