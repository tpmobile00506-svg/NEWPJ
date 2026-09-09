Frontend ใช้ React และองค์ประกอบ UI ใน components/ui

- workspace.tsx: หน้าหลัก ทะเบียน และตัวกรอง
- import-view.tsx: ตรวจทาน Excel
- editor.tsx: ฟอร์ม รายละเอียด QR และแบ่งล็อต
- operations.tsx: อนุมัติ ตรวจนับ รายงาน และผู้ใช้
- widgets.tsx: UI ที่ใช้ร่วมกัน และ HTTP client
- lib/excel.ts: ส่งออก Excel และพิมพ์
- styles/globals.css: รูปแบบหน้าจอ responsive และงานพิมพ์

ไม่มีข้อมูลลับหรือการเข้าฐานข้อมูลใน frontend; เรียก /api/data และ /api/source ผ่าน backend

