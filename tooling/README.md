# Tooling — เครื่องมือของโครงการ

- `hosting/`: Vite plugin สำหรับ Sites และใบอนุญาต รวมการจัดไฟล์ migrations ตอน build
- `scripts/`: ติดตั้ง dependencies ตั้งค่า runtime และทดสอบเบื้องต้น
- `scripts/mark-generated.mjs`: ซ่อนไฟล์และโฟลเดอร์ที่เครื่องมือสร้างบน Windows หลัง build เปิดดูได้ด้วย Hidden items
- `config/eslint.config.mjs`: กฎตรวจโค้ด ใช้ผ่าน `npm run lint` จาก root
- `reference/examples/`: ตัวอย่างจาก starter เก็บไว้อ้างอิง ไม่ใช่ส่วนที่รันในระบบ

โครงการใช้ Vite root ที่เดิม และกำหนด Vinext `appDir: "frontend"` เพื่อค้นหา `frontend/app/`
ใช้คำสั่ง dev/build และ Cloudflare Worker ที่กำหนดใน package.json; โหมด standalone/prerender ไม่ใช่รูปแบบที่โครงการนี้ตั้งค่าไว้

`.openai/hosting.json`, `vite.config.ts`, `tsconfig.json` และ package files อยู่ที่ root เพราะใช้เชื่อมทั้งโครงการ
ผล build อยู่ใน `dist/`; ไม่แก้ไฟล์ภายใน dist ด้วยมือ
