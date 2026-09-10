# Frontend — หน้าจอและไฟล์เว็บ

- `app/page.tsx`, `app/layout.tsx`: จุดเริ่มหน้าเว็บและ layout
- `features/inventory/`: ทะเบียน ตัวกรอง ฟอร์ม รายละเอียด QR และแบ่งล็อต
- `features/imports/`: หน้าตรวจทาน Excel ก่อนนำเข้า
- `features/operations/`: คำขอ อนุมัติ ตรวจนับ รายงาน และผู้ใช้
- `components/common.tsx`: UI ที่ใช้ร่วมกันและ HTTP client
- `components/ui/`: ชุดส่วนประกอบ shadcn
- `hooks/`: React hooks และเครื่องมือ WebMCP ทางเลือก
- `services/excel-export.ts`: สร้างไฟล์ Excel และพิมพ์จากข้อมูลที่ผู้ใช้เข้าถึงได้
- `styles/globals.css`: รูปแบบหน้าจอ responsive และงานพิมพ์
- `styles/vendor/`: CSS ภายนอกพร้อมใบอนุญาต
- `public/`: favicon และไฟล์สาธารณะ ห้ามเก็บ Excel ต้นฉบับหรือข้อมูลลับที่นี่
- `utils/classnames.ts`: รวมชื่อ CSS classes
- `config/`: การตั้งค่า Next.js และ PostCSS ที่ Vite โหลดจาก root

`app/api/` มีเพียงตัวส่งต่อ route ไป `backend/routes/` ตามโครงสร้าง framework
การอ่าน Excel นำเข้า การตรวจสิทธิ์ และการเข้าฐานข้อมูลทำใน backend ผ่าน `/api/data` และ `/api/source`

รัน `npm run dev` จาก root ของโครงการ ใช้ package.json และ dependencies ร่วมกับ backend
