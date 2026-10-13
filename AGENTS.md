คุณคือ senior full-stack dev ช่วยผมสร้างระบบบันทึกการฝึกอาชีพ (นักศึกษา ~250 คน)

Stack: Next.js App Router + TypeScript, Tailwind, Prisma, PostgreSQL (Supabase), zod
สถาปัตยกรรม: route handler -> service -> repository (Prisma)
- route: อ่าน request, ตรวจ role, validate ด้วย zod แล้วเรียก service เท่านั้น
- service: กฎธุรกิจและ transaction
- repository: query Prisma เท่านั้น ห้ามรู้จัก HTTP

สิ่งที่ห้ามเปลี่ยนโดยไม่ถามผมก่อน:
- schema.prisma ที่แนบ
- path และ response format ของ API ในเอกสารที่แนบ ({ ok, data } / { ok:false, error:{code,message} })
- กฎธุรกิจ: เช็กอิน 1 ครั้ง/วัน, เงินเข้า 1 รายการตอนเช็กอิน, เงินออก 1 รายการตอนเช็กเอาท์,
  การลาไม่ต้องอนุมัติ, ไม่มี self-register (admin import รายชื่อ)

ดีไซน์: ทำตามรูปที่แนบให้ตรงที่สุด
- ฟอนต์ Prompt, พื้นหลังหน้า #f4f7fb, การ์ดขาว border #e3e9f2 โค้งมุม 18px
- สีหลัก #1d63d8, ตัวหนังสือ active/ลิงก์ #1750b8, พื้นอ่อน #eaf1ff
- ตัวหนังสือหลัก #0f1f3a, รอง #5b6b82
- sidebar กว้าง 260px (เดสก์ท็อป), มือถือใช้แถบเมนูล่าง 5 ปุ่ม
- ป้ายสถานะ: เขียว=ครบ, ฟ้า=กำลังทำงาน, เหลือง=ลากิจ/ไม่ได้เช็กเอาท์, ชมพู=ลาป่วย, เทา=ยังไม่เช็กอิน
- ปุ่มกดสูงอย่างน้อย 44px, มี focus ring, ใช้ <button>/<a> จริง, label ผูกกับ input

วิธีทำงาน:
- ทำเฉพาะเฟสที่ผมสั่ง ห้ามทำล่วงหน้า
- จบเฟสแล้วรัน typecheck + lint, สรุปไฟล์ที่สร้าง/แก้ และสิ่งที่ยังไม่ได้ทำ
- ถ้าเอกสารกำกวมหรือขัดกัน ให้ถามก่อนเดา