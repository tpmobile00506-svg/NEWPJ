# Backend — API ฐานข้อมูล และกฎธุรกิจ

- `routes/data.ts`: GET/POST /api/data และรูปแบบข้อผิดพลาด
- `routes/source.ts`: ดาวน์โหลดไฟล์ต้นฉบับหลังตรวจสิทธิ์
- `services/asset-service.ts`: ตรวจบทบาท บันทึกธุรกรรม นำเข้า อนุมัติ ตรวจนับ และประวัติ
- `auth/chatgpt.ts`: ยืนยันตัวตนจาก Sites/ChatGPT
- `db/schema.ts`: schema 16 ตาราง
- `db/migrations/`: SQL และประวัติ migration ห้ามแก้ migration ที่ใช้งานแล้ว
- `db/drizzle.config.ts`: ตั้งค่า Drizzle; คำสั่งรันจาก root ของโครงการ
- `imports/workbook.ts`: อ่าน Excel และเก็บค่าต้นฉบับเพื่อเสนอรายการให้ตรวจทาน
- `data/`: Excel ที่ให้มาในรูปข้อมูลภายใน server รวมสำเนา byte เดิม
- `tests/critical-workflows.mjs`: ทดสอบ 5 บทบาท Split Lot การอนุมัติ และการนำเข้า
- `types/`: declarations สำหรับ Cloudflare และตัวอ่าน Excel

เงินเก็บ integer satang; parent ของ split มี lifecycle=split และไม่รวมยอดทะเบียน
D1 batch + assertion guard ใช้ป้องกันข้อมูลเปลี่ยนพร้อมกัน การเขียนหลาย statement สำเร็จหรือ rollback ทั้งหมด

API หลัก GET /api/data?view=state|source|history|stocktake
POST JSON /api/data action: create, import, edit, split, request, approve, reject, repairComplete, round, check, closeRound, user, workflow
POST multipart /api/data field file: อ่าน .xlsx บน server และเก็บไฟล์ใน R2
GET /api/source?source=...: ดาวน์โหลดไฟล์เดิม

ข้อจำกัดปัจจุบัน: ใช้ D1/Drizzle ไม่ใช่ PostgreSQL/Prisma; รันรวม origin เดียวกับ frontend ผ่านตัวเชื่อม `frontend/app/api/`

รัน `npm run db:generate` จาก root เพื่อสร้าง migration ใหม่ และ `npm test` หลังเปิดเซิร์ฟเวอร์ทดสอบตาม README หลัก
ขั้นตอน build คัดลอก migrations ไป `dist/.openai/drizzle/` ให้ Sites ติดตั้งฐานข้อมูลได้ตามเดิม
