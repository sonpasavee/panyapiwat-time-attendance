import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

// โลโก้ศูนย์การเรียนปัญญาภิวัฒน์ (ไฟล์ app/icon.png)
// - พื้นหลังโปร่งใส ตัวอักษรสีขาว → วางบนพื้นสีเข้ม/พื้นแบรนด์เท่านั้น
// - เป็นรูปตกแต่ง (aria-hidden อยู่ที่ wrapper) เพราะมีข้อความชื่ออยู่ข้าง ๆ เสมอ
export default function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/icon.png"
      alt=""
      width={1050}
      height={311}
      priority={priority}
      className={className}
    />
  );
}
