"use client";

import { useState, type FormEvent } from "react";

type LoginFormProps = { role: "student" | "admin" };

export default function LoginForm({ role }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(
          response.status === 401
            ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง"
            : result.error?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง",
        );
        return;
      }

      if (result.user?.role !== (role === "admin" ? "ADMIN" : "STUDENT")) {
        setError(
          "บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบในส่วนที่เลือก กรุณาเลือกประเภทผู้ใช้ให้ถูกต้อง",
        );
        return;
      }

      setSuccess(
        `ยินดีต้อนรับ ${result.user.firstName} ${result.user.lastName}`,
      );
    } catch {
      setError(
        "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบเครือข่ายแล้วลองอีกครั้ง",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const label = role === "admin" ? "ชื่อผู้ใช้หรือรหัสพนักงาน" : "รหัสนักศึกษา";
  const placeholder =
    role === "admin" ? "กรอกชื่อผู้ใช้หรือรหัสพนักงาน" : "กรอกรหัสนักศึกษา";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="block text-sm font-semibold text-white/90"
        >
          {label}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          maxLength={80}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={placeholder}
          className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none placeholder:text-white/40 transition focus:border-blue-200 focus:ring-4 focus:ring-blue-200/15"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-white/90"
        >
          รหัสผ่าน
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="กรอกรหัสผ่าน"
          className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none placeholder:text-white/40 transition focus:border-blue-200 focus:ring-4 focus:ring-blue-200/15"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-100"
        >
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-base font-bold text-[#0b2f5c] shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#ffd666] disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      <p className="text-center text-xs leading-5 text-white/55">
        หากลืมชื่อผู้ใช้หรือรหัสผ่าน กรุณาติดต่อเจ้าหน้าที่ศูนย์การเรียน
      </p>
    </form>
  );
}
