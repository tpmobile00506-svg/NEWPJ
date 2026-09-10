# ระบบบริหารจัดการครุภัณฑ์

คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์

## โครงสร้าง Frontend / Backend

```text
asset-manager/
├── frontend/                 หน้าจอและไฟล์เว็บ
│   ├── app/                  หน้าเว็บ layout และตัวเชื่อม route ของ framework
│   ├── features/             inventory, imports, operations
│   ├── components/           UI และส่วนประกอบที่ใช้ร่วมกัน
│   ├── hooks/                React hooks
│   ├── services/             ส่งออก Excel และพิมพ์
│   ├── styles/               CSS และ vendor styles
│   ├── public/               favicon และรูปที่เปิดผ่านเว็บได้
│   ├── utils/                ตัวช่วย UI
│   └── config/               การตั้งค่า Next.js และ PostCSS
├── backend/                  การทำงานบน server
│   ├── routes/               API รับส่งข้อมูลและไฟล์ต้นฉบับ
│   ├── services/             กฎธุรกิจ สิทธิ์ และธุรกรรม
│   ├── auth/                 ยืนยันตัวตน
│   ├── db/                   schema, config และ migrations
│   ├── imports/              อ่านและวิเคราะห์ Excel
│   ├── data/                 ข้อมูลและไฟล์ต้นฉบับ
│   ├── tests/                ทดสอบกฎสำคัญและ API
│   └── types/                ชนิดข้อมูลสำหรับ server
├── shared/                   ชนิดข้อมูลและกฎคำนวณที่ใช้ทั้งสองฝั่ง
├── tooling/                  เครื่องมือ build, hosting และ scripts
├── package.json              คำสั่งและ dependencies ของทั้งโครงการ
├── package-lock.json         เวอร์ชัน dependencies ที่ติดตั้ง
├── tsconfig.json             TypeScript และเส้นทาง import
└── vite.config.ts            เชื่อม frontend, backend และ hosting
```

เริ่มแก้หน้าจอที่ `frontend/features/` และแก้ API ที่ `backend/routes/` / `backend/services/`
ไฟล์ใน `frontend/app/api/` เป็นเพียงตัวส่งต่อ route ที่ framework ต้องใช้; การตรวจสิทธิ์ การอ่าน Excel และการเข้าฐานข้อมูลอยู่ใน backend

ไฟล์ที่เครื่องมือสร้าง เช่น `node_modules/`, `dist/`, `.next/`, `.vinext/`, `.wrangler/` และ `.sites-runtime/` ไม่ใช่ source และไม่ต้องย้ายเข้า frontend หรือ backend
บน Windows จะซ่อนโฟลเดอร์เหล่านี้หลัง build เพื่อให้มองเห็นโครงสร้างหลักง่ายขึ้น เปิดดูได้ผ่าน Explorer → View → Hidden items
`.openai/` เก็บการตั้งค่า Sites จึงอยู่ที่ root ตามที่ hosting ต้องใช้

รายละเอียดเพิ่มเติม: [Frontend](frontend/README.md), [Backend](backend/README.md), [Tooling](tooling/README.md)

Frontend และ Backend แยก source ชัดเจน แต่รุ่นนี้รันด้วยคำสั่งเดียวและ origin เดียว ไม่ใช่บริการแยกสองพอร์ตในการใช้งานปกติ

## สิ่งที่ทำได้

1. ทะเบียน 11 คอลัมน์ ค้นหา กรอง เรียงลำดับ เพิ่มและแก้ไข พร้อมประวัติ
2. อ่าน Excel .xlsx ทุกชีต รวมแถวหัวกระดาษ ยอดยก และข้อความชุดไว้ในต้นฉบับ
3. ตรวจทานก่อนนำเข้า เก็บ hash ไฟล์ ชีต แถว และค่าต้นทาง; ไม่เพิ่มไฟล์หรือแถวเดิมซ้ำ
4. แยกรหัสช่วง 2 เครื่องที่อ่านได้แน่นอนเป็นรายการและ QR อิสระ
5. แบ่งล็อตแบบ atomic เก็บรายการแม่เป็นประวัติไม่นับยอดซ้ำ; ผลรวมจำนวนและเงินของลูกเท่าต้นทาง
6. คำขอโอนย้าย ซ่อม จำหน่าย และอนุมัติตามลำดับ บันทึกผลซ่อมและค่าซ่อม
7. ตรวจนับประจำปี เก็บภาพทะเบียน ณ วันเปิดรอบ ผลตรวจ เวลา ผู้ตรวจ และปิดรอบเมื่อครบ
8. ส่งออก .xlsx เป็นตัวเลขจริง ไม่มีหัวกระดาษหรือยอดยกแทรกในข้อมูล; ฟอนต์และความกว้างเป็นมาตรฐาน
9. รายงานมูลค่าตามสาขา และประมาณค่าเสื่อมเส้นตรงเมื่อมีวันที่รับ/อายุใช้งานครบ
10. ผู้ใช้ 5 กลุ่ม และตรวจสิทธิ์บน server ทุก API

## บทบาทและสายอนุมัติ

- เจ้าหน้าที่: ทะเบียน นำเข้า แบ่งล็อต QR ส่งคำขอ ตรวจนับ และรายงาน
- หัวหน้าสำนักงาน: อนุมัติขั้นที่ 1 และดูทะเบียน/รายงาน
- รองฝ่ายบริการ: อนุมัติขั้นที่ 2 และดูทะเบียน/รายงาน
- คณบดี: อนุมัติขั้นสุดท้าย และดูทะเบียน/รายงาน
- Admin: ผู้ใช้ สิทธิ์ ตั้งค่าสายอนุมัติ และดูแลทะเบียน แต่ไม่อนุมัติแทนผู้บริหาร

ค่าเริ่มต้น หัวหน้าสำนักงาน → รองฝ่ายบริการ → คณบดี เป็นข้อเสนอจากข้อกำหนด 5 กลุ่มใหม่ ไม่ใช่ลำดับที่ยืนยันไว้ใน Word เดิม สามารถปรับในหน้าผู้ใช้และสิทธิ์; คำขอที่ส่งแล้วไม่เปลี่ยนสายตามค่าตั้งใหม่

ใช้บัญชี ChatGPT ผ่านการยืนยันตัวตนของ Sites บัญชีแรกใน Site ส่วนตัวจะเป็น Admin จากนั้นเพิ่มอีเมล/บทบาทได้ การอนุญาตเข้าชม Site ของแพลตฟอร์มเป็นอีกชั้นหนึ่ง รุ่นเผยแพร่แรกยังเปิดเฉพาะเจ้าของ

## ข้อมูลจริงที่เตรียมไว้

Excel ที่ผู้ใช้ให้มี 18 ชีต และ 4,312 แถวที่มีข้อมูล เก็บใน backend/data พร้อมไฟล์เดิมแบบไม่แก้ไข
SHA-256: e8032a3ea82ed5d6846e03dea096bc5d0b64512e20d05b293b9136660eecbaeb

ข้อมูลนี้อยู่ในหน้าตรวจทาน ยังไม่ถือเป็นทะเบียนที่เจ้าหน้าที่รับรอง จึงเริ่มทะเบียนกลางด้วยศูนย์รายการ
แถวที่ถูกวิเคราะห์ว่าอาจเป็นครุภัณฑ์เป็นเพียงข้อเสนอ ไม่ใช่จำนวนสินทรัพย์ที่รับรอง

- คอม แถว 31 เป็นหัวชุด NonLinear 160,500 บาท; แถว 32–33 เป็นรายการย่อยที่ราคายังไม่ครบ
- หัวชุดและโครงการถูกเสนอในหมวดของรายการย่อย และยังตรวจดูเซลล์ต้นฉบับได้
- กรณีชุดที่ราคาต้นทางไม่ชัดเจน ผู้ตรวจต้องกำหนดรหัสย่อย วิธีจัดสรรมูลค่า และเหตุผลก่อนนำเข้า ระบบยังไม่กระจายมูลค่าชุดคลุมเครือให้อัตโนมัติ
- ชีต “ไม่มีตัวตน” หมายถึงสินทรัพย์ซอฟต์แวร์ ไม่ได้หมายถึงสูญหาย
- ชีตชำรุดในอดีตไม่ถูกใช้สรุปสถานะปัจจุบันโดยอัตโนมัติ
- G เดิมอาจเป็นทั้งหมายเหตุและสถานที่ ระบบเสนอทั้งสองช่องให้ตรวจทานโดยยังเก็บต้นฉบับครบ

## เทคโนโลยีและการรัน

รุ่นทดลองนี้ใช้ React / Next.js บน Vinext, Cloudflare Worker, D1 (SQLite) และ R2
Word เดิมเสนอ PostgreSQL + Prisma; รุ่นนี้ยังไม่ได้ใช้สองเทคโนโลยีนั้น หากเป็นข้อกำหนดบังคับของสถาบันต้องเปลี่ยนชั้นฐานข้อมูลและ deployment ก่อนส่งมอบติดตั้งจริง

ต้องมี Node.js 22.13 ขึ้นไป และ npm

    npm ci
    npm run db:generate
    npm run build

ติดตั้ง schema ฐานข้อมูล local ครั้งแรก (อย่ารัน migration เดิมซ้ำ):

    node --import ./tooling/scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file backend/db/migrations/0000_cool_ender_wiggin.sql

เริ่มพัฒนา:

    npm run dev

เปิด URL ที่ terminal แสดง ปกติ http://localhost:5173 แล้วเข้าสู่ระบบ
การเข้าสู่ระบบ local ใช้บัญชีจำลอง seedy@sites.test ของ starter เฉพาะ loopback เท่านั้น ไม่มีบัญชีจำลองนี้ใน production

## การตรวจสอบ

    npm run typecheck

ชุดทดสอบแยกฐานข้อมูลและพื้นที่ไฟล์จาก preview:

    node --import ./tooling/scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/test-state --file backend/db/migrations/0000_cool_ender_wiggin.sql
    node --import ./tooling/scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/test-state --ip 127.0.0.1 --port 5174 --inspector-port 0
    npm test

backend/tests/critical-workflows.mjs ใช้ identity headers เฉพาะเซิร์ฟเวอร์ทดสอบ local เพื่อจำลองทั้ง 5 บทบาท ห้ามนำเซิร์ฟเวอร์ทดสอบนี้เปิดสาธารณะ

ผ่านการทดสอบ: เงินและจำนวน Split Lot, แบ่งซ้ำพร้อมกัน, idempotency, แอร์สองรายการ, ลำดับอนุมัติ, ป้องกันโอนตรง, enum/date validation, ตรวจนับและปิดรอบ, อ่าน XLSX ฝั่ง server แทนข้อมูลที่ client ปลอม, ปฏิเสธ anonymous

ยังไม่ได้ตรวจ UI ด้วย browser automation และไม่มี WebMCP context สำหรับทดสอบเครื่องมือใน browser; WebMCP เป็น optional และไม่เกี่ยวกับความถูกต้องของ API ปกติ

