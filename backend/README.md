Backend เป็นชั้น API และกฎธุรกิจ

- api.ts: GET/POST /api/data และรูปแบบข้อผิดพลาด
- source-route.ts: ดาวน์โหลดไฟล์ต้นฉบับหลังตรวจสิทธิ์
- server.ts: ตรวจบทบาท บันทึกธุรกรรม นำเข้า อนุมัติ ตรวจนับ ประวัติ
- auth.ts: ยืนยันตัวตนจาก Sites/ChatGPT
- db/schema.ts: schema 16 ตาราง
- data/: Excel ที่ให้มาในรูปข้อมูลภายใน server รวมสำเนา byte เดิม

เงินเก็บ integer satang; parent ของ split มี lifecycle=split และไม่รวมยอดทะเบียน
D1 batch + assertion guard ใช้ป้องกันข้อมูลเปลี่ยนพร้อมกัน การเขียนหลาย statement สำเร็จหรือ rollback ทั้งหมด

API หลัก GET /api/data?view=state|source|history|stocktake
POST JSON /api/data action: create, import, edit, split, request, approve, reject, repairComplete, round, check, closeRound, user, workflow
POST multipart /api/data field file: อ่าน .xlsx บน server และเก็บไฟล์ใน R2
GET /api/source?source=...: ดาวน์โหลดไฟล์เดิม

ข้อจำกัดปัจจุบัน: ใช้ D1/Drizzle ไม่ใช่ PostgreSQL/Prisma; รันรวม origin เดียวกับ frontend ผ่านตัวเชื่อม app/

