"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import "./change-password.css";

type Role = "ADMIN" | "STUDENT";
type SessionAction = "KEEP_CURRENT" | "REVOKE_ALL";
type RevokedSession = { createdAt: string };

type ChangePasswordResult = {
  success: true;
  sessionAction: SessionAction;
  revokedSessions: RevokedSession[];
};

function strengthOf(password: string) {
  if (!password) return { score: 0, label: "กรอกรหัสผ่านใหม่" };
  if (password.length < 8) return { score: 1, label: "อ่อน" };
  if (password.length < 15) return { score: 2, label: "พอใช้" };
  if (password.length < 20) return { score: 3, label: "ดี" };
  return { score: 4, label: "แข็งแรง" };
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A11.5 11.5 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.3 3.1M6.2 6.2C4.3 7.4 3 9.4 2.5 12c1 2.5 4.5 7 9.5 7 1 0 1.9-.2 2.8-.5" />
        </>
      ) : (
        <>
          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  invalid,
  invalidMessage,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  invalidMessage?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <label className="password-label" htmlFor={id}>{label}</label>
      <div className={`password-input-wrap${invalid ? " is-invalid" : ""}`}>
        <span className="password-lock"><LockIcon /></span>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={id === "current-password" ? "current-password" : "new-password"}
          maxLength={128}
          required
          aria-invalid={invalid || undefined}
          aria-describedby={invalid && invalidMessage ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? `ซ่อน${label}` : `แสดง${label}`}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
      {invalid && invalidMessage && (
        <p className="password-field-error" id={`${id}-error`} role="alert">
          <span aria-hidden="true">!</span> {invalidMessage}
        </p>
      )}
    </div>
  );
}

export default function ChangePasswordScreen({ role }: { role: Role }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionAction, setSessionAction] = useState<SessionAction>("KEEP_CURRENT");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ChangePasswordResult | null>(null);
  const strength = useMemo(() => strengthOf(newPassword), [newPassword]);
  const dashboardPath = role === "ADMIN" ? "/admin" : "/student";

  const newPasswordError = attempted && newPassword.length < 15
    ? "รหัสผ่านใหม่ต้องมีอย่างน้อย 15 ตัวอักษร"
    : attempted && newPassword === currentPassword
      ? "รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน"
      : undefined;
  const confirmPasswordError = attempted && confirmPassword !== newPassword
    ? "ยืนยันรหัสผ่านไม่ตรงกัน"
    : undefined;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setError("");
    setErrorCode("");

    if (!currentPassword || newPassword.length < 15 || newPassword === currentPassword || confirmPassword !== newPassword) {
      setError("กรุณาตรวจสอบข้อมูลรหัสผ่านให้ครบถ้วนและถูกต้อง");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, sessionAction }),
      });
      const body = await response.json().catch(() => null) as
        | (ChangePasswordResult & { error?: { code?: string; message?: string } })
        | null;

      if (!response.ok) {
        setErrorCode(body?.error?.code ?? "");
        throw new Error(body?.error?.message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }

      setResult(body as ChangePasswordResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    const mustLoginAgain = result.sessionAction === "REVOKE_ALL";
    return (
      <div className="password-page">
        <header className="password-page-heading">
          <h1>เปลี่ยนรหัสผ่าน</h1>
          <p>ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว</p>
        </header>
        <section className="password-success-card card" aria-labelledby="password-success-title">
          <span className="password-success-icon" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>
          </span>
          <h2 id="password-success-title">เปลี่ยนรหัสผ่านสำเร็จ</h2>
          <p className="password-success-copy">
            {mustLoginAgain
              ? "ระบบออกจากบัญชีนี้ทุกอุปกรณ์แล้ว กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่"
              : "รหัสผ่านใหม่พร้อมใช้งานแล้ว และคุณยังใช้บัญชีบนเครื่องนี้ต่อได้"}
          </p>

          <div className="password-revoked-list">
            <h3>เซสชันที่ออกจากระบบแล้ว ({result.revokedSessions.length})</h3>
            {result.revokedSessions.length > 0 ? (
              <ul>
                {result.revokedSessions.map((session, index) => (
                  <li key={`${session.createdAt}-${index}`}>
                    <span className="password-device-icon" aria-hidden="true">▯</span>
                    <span className="password-device-copy">
                      <strong>เซสชัน {index + 1}</strong>
                      <small>เริ่มใช้งาน {formatSessionDate(session.createdAt)}</small>
                    </span>
                    <span className="password-signed-out">ออกจากระบบแล้ว</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="password-no-sessions">ไม่มีเซสชันอื่นที่ต้องออกจากระบบ</p>
            )}
          </div>

          <div className="password-success-actions">
            {mustLoginAgain ? (
              <button className="btn btn-primary" type="button" onClick={() => router.replace(`/login?role=${role.toLowerCase()}`)}>
                ไปหน้าเข้าสู่ระบบ
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => router.push(dashboardPath)}>
                กลับหน้าหลัก
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="password-page">
      <header className="password-page-heading">
        <h1>เปลี่ยนรหัสผ่าน</h1>
        <p>กรอกรหัสผ่านปัจจุบัน แล้วตั้งรหัสผ่านใหม่</p>
      </header>

      <div className="password-layout">
        <section className="password-form-card card" aria-label="แบบฟอร์มเปลี่ยนรหัสผ่าน">
          <form onSubmit={submit} noValidate>
            {error && (
              <div className="password-alert" role="alert">
                <span aria-hidden="true">!</span>{error}
              </div>
            )}

            <PasswordField
              id="current-password"
              label="รหัสผ่านปัจจุบัน"
              value={currentPassword}
              onChange={(value) => { setCurrentPassword(value); setError(""); setErrorCode(""); }}
              invalid={errorCode === "INVALID_CURRENT_PASSWORD" || (attempted && !currentPassword)}
              invalidMessage={errorCode === "INVALID_CURRENT_PASSWORD" ? "รหัสผ่านปัจจุบันไม่ถูกต้อง" : attempted && !currentPassword ? "กรุณากรอกรหัสผ่านปัจจุบัน" : undefined}
            />

            <div className="password-new-group">
              <PasswordField
                id="new-password"
                label="รหัสผ่านใหม่"
                value={newPassword}
                onChange={setNewPassword}
                invalid={Boolean(newPasswordError)}
                invalidMessage={newPasswordError}
              />
              <div className={`password-strength strength-${strength.score}`} aria-label={`ความแข็งแรง: ${strength.label}`}>
                <div className="password-strength-bars" aria-hidden="true">
                  {[1, 2, 3, 4].map((bar) => <span key={bar} data-active={bar <= strength.score} />)}
                </div>
                <span>{strength.score > 0 ? `ความแข็งแรง: ${strength.label}` : strength.label}</span>
              </div>
            </div>

            <PasswordField
              id="confirm-password"
              label="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={setConfirmPassword}
              invalid={Boolean(confirmPasswordError)}
              invalidMessage={confirmPasswordError}
            />

            <ul className="password-requirements" aria-label="เงื่อนไขรหัสผ่าน">
              <li data-valid={newPassword.length >= 15}><span aria-hidden="true">✓</span>ยาวอย่างน้อย 15 ตัวอักษร</li>
              <li data-valid={Boolean(newPassword && newPassword !== currentPassword)}><span aria-hidden="true">✓</span>ต่างจากรหัสผ่านปัจจุบัน</li>
              <li data-valid={Boolean(confirmPassword && confirmPassword === newPassword)}><span aria-hidden="true">✓</span>ยืนยันรหัสผ่านตรงกัน</li>
            </ul>

            <fieldset className="password-session-fieldset">
              <legend>หลังเปลี่ยนรหัสผ่านสำเร็จ</legend>
              <label className="password-session-option" data-selected={sessionAction === "KEEP_CURRENT"}>
                <input
                  type="radio"
                  name="session-action"
                  value="KEEP_CURRENT"
                  checked={sessionAction === "KEEP_CURRENT"}
                  onChange={() => setSessionAction("KEEP_CURRENT")}
                />
                <span className="password-radio-dot" aria-hidden="true" />
                <span className="password-session-copy">
                  <strong>ใช้งานต่อบนเครื่องนี้</strong>
                  <span className="password-recommended">แนะนำ</span>
                  <small>ออกจากระบบอุปกรณ์อื่นทั้งหมดของบัญชีนี้</small>
                </span>
              </label>
              <label className="password-session-option" data-selected={sessionAction === "REVOKE_ALL"}>
                <input
                  type="radio"
                  name="session-action"
                  value="REVOKE_ALL"
                  checked={sessionAction === "REVOKE_ALL"}
                  onChange={() => setSessionAction("REVOKE_ALL")}
                />
                <span className="password-radio-dot" aria-hidden="true" />
                <span className="password-session-copy">
                  <strong>ออกจากระบบทุกอุปกรณ์</strong>
                  <small>รวมเครื่องนี้ด้วย แล้วเข้าสู่ระบบใหม่</small>
                </span>
              </label>
            </fieldset>

            <button className="btn btn-primary password-submit" type="submit" disabled={saving}>
              {saving ? "กำลังเปลี่ยนรหัสผ่าน…" : "เปลี่ยนรหัสผ่าน"}
            </button>
          </form>
        </section>

        <aside className="password-tip-card card" aria-labelledby="password-tip-title">
          <div className="password-tip-heading">
            <span className="password-tip-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Z" /></svg>
            </span>
            <h2 id="password-tip-title">รหัสผ่านที่ดี</h2>
          </div>
          <p>ใช้ <strong>วลีผ่าน (passphrase)</strong> ที่ยาวและจำง่าย เช่น หลายคำต่อกัน แทนการใช้ตัวเลขกับสัญลักษณ์ที่เดาได้ง่าย</p>
          <p>ไม่ต้องใช้รหัสพิเศษก็ได้ ขอแค่ยาวพอและไม่ซ้ำกับที่อื่น</p>
          <div className="password-tip-note">รหัสผ่านของคุณจัดเก็บด้วยการแฮชแบบทางเดียว ผู้ดูแลระบบจะไม่เห็นรหัสผ่านจริงของคุณ</div>
        </aside>
      </div>
    </div>
  );
}
