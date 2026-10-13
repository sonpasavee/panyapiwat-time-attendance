import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบบันทึกการฝึกอาชีพ | ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่น",
  description:
    "ระบบสำหรับบันทึกเวลาเข้า-ออกปฏิบัติงาน เงินสดที่นำเข้าปฏิบัติงาน และการแจ้งลาของผู้ฝึกอาชีพ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={prompt.className}>{children}</body>
    </html>
  );
}
