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
        await fetch("/api/auth/logout", { method: "POST" });
        setError(
          "บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบในส่วนที่เลือก กรุณาเลือกประเภทผู้ใช้ให้ถูกต้อง",
        );
        return;
      }

      if (role === "student") {
        window.location.assign("/student");
      } else {
        window.location.assign("/admin");
      }
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block text-sm font-semibold text-[#0f1f3a]"
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
          className="min-h-[52px] w-full rounded-full border border-[#d5deeb] bg-white px-4 text-sm text-[#0f1f3a] outline-none placeholder:text-[#8696ae] transition focus:border-[#1d63d8] focus:ring-4 focus:ring-[#1d63d8]/10"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-[#0f1f3a]"
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
          className="min-h-[52px] w-full rounded-full border border-[#d5deeb] bg-white px-4 text-sm text-[#0f1f3a] outline-none placeholder:text-[#8696ae] transition focus:border-[#1d63d8] focus:ring-4 focus:ring-[#1d63d8]/10"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
        >
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#1d63d8] px-5 text-base font-bold text-white transition hover:bg-[#1750b8] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#1d63d8] disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      <p className="text-center text-xs leading-5 text-[#5b6b82]">
        หากลืมชื่อผู้ใช้หรือรหัสผ่าน กรุณาติดต่อเจ้าหน้าที่ศูนย์การเรียน
      </p>
    </form>
  );
}
