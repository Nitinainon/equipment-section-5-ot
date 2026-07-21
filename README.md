# Equipment Section 5 - OT

เว็บแอปสำหรับวางแผน ลงทะเบียน และตรวจสอบ OT ของสมาชิก Equipment Section 5 โดยไม่ต้องมีระบบสมัครสมาชิกหรือเข้าสู่ระบบ ผู้ใช้ทั่วไปลง OT ได้ทันที ส่วนการแก้ไขข้อมูลสมาชิกและวันหยุดประจำสัปดาห์ต้องใช้รหัส admin

## ฟีเจอร์หลัก

- ปฏิทิน OT รายเดือนแบบ responsive สำหรับมือถือ แท็บเล็ต และคอมพิวเตอร์
- ลงทะเบียน แก้ไข และลบ OT พร้อมหน้าต่างยืนยัน
- ค้นหาและกรองตามสมาชิก
- แสดงวันหยุดประจำสัปดาห์บนปฏิทินและรายละเอียดรายวัน
- สรุปรายเดือน: จำนวนรายการ วันที่มี OT สมาชิกที่ลง OT ชั่วโมงรวม และชั่วโมงรายบุคคล
- จัดการสมาชิกผ่านรหัส admin
- จัดการชื่อเต็ม ชื่อเล่น และชื่อภาษาจีนของสมาชิก
- ปฏิทินแสดงชื่อเล่น/ชื่อภาษาจีนแบบย่อ ส่วนรายละเอียดด้านล่างแสดงข้อมูลเต็ม
- เพิ่มและลบวันหยุดประจำสัปดาห์ผ่านรหัส admin
- ตรวจสอบข้อมูลซ้ำและช่วงเวลาทับซ้อนที่ฝั่ง Server และฐานข้อมูล

## สมาชิกเริ่มต้น

1. NITINAI YASUTORN
2. SASITHORN YODLEE
3. ATCHARATHORN DAENGHOT
4. THANAKORN OUNLAMAI
5. SARINYA THORANESUK
6. SAOWALAK SRISAWAN
7. PORAMIN PAKKRONG

## Environment Variables

สร้างไฟล์ `.env.local` จาก `.env.example`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_CODE=change-this-admin-code
```

หมายเหตุ: `SUPABASE_SERVICE_ROLE_KEY` และ `ADMIN_CODE` ใช้เฉพาะฝั่ง Server ห้ามตั้งเป็น `NEXT_PUBLIC_*`

## ตั้งค่า Supabase

1. สร้าง Project ใน Supabase
2. เปิด SQL Editor
3. รัน `supabase/schema.sql`
4. รัน `supabase/seed.sql`
5. ตั้งค่า Environment Variables ใน `.env.local`

หากมีฐานข้อมูลเดิมอยู่แล้ว ให้รัน `supabase/schema.sql` ซ้ำได้ เพื่อเพิ่มคอลัมน์ `updated_at` และตาราง `weekly_holidays`
หากอัปเดตจากเวอร์ชันก่อนหน้า ให้รัน `supabase/schema.sql` ซ้ำเพื่อเพิ่มคอลัมน์ `nickname` และ `chinese_name`
หากอัปเดตกติกาคำนวณ OT ให้รัน `supabase/schema.sql` ซ้ำเพื่อให้ฐานข้อมูลนับ OT เฉพาะเวลาหลัง 18:00
หากต้องการใช้ตัวเลือก `ไม่มาทำงาน` พร้อมประเภท `หยุดวันที่ 6`, `ลากิจ`, `ลาป่วย`, `ลาพักร้อน` ให้รัน `supabase/schema.sql` ซ้ำเพื่อเพิ่มคอลัมน์ `entry_type` และ `absence_type`
หากต้องการใช้ `รหัสพนักงาน` และแท็บตั้งค่าการแสดงผล ให้รัน `supabase/schema.sql` ซ้ำเพื่อเพิ่มคอลัมน์ `employee_code` และตาราง `app_settings`

## รันในเครื่อง

```bash
npm install
npm run dev
```

เปิด URL ที่แสดงใน terminal เช่น `http://localhost:3000/`

## Build และทดสอบ

```bash
npx tsc --noEmit
npm run lint
npm test
```

`npm test` จะรัน build และ smoke test หน้าเว็บหลัก

## Deploy บน Netlify

โปรเจกต์เตรียมไฟล์ `netlify.toml` ไว้แล้ว เมื่อ Import repository เข้า Netlify ระบบจะใช้ค่าเหล่านี้อัตโนมัติ:

- Build command: `npm run build:netlify`
- Publish directory: `.next`
- Node.js: `22.13.0`
- Plugin: `@netlify/plugin-nextjs`

ก่อน Deploy ให้รัน `supabase/schema.sql` ใน Supabase SQL Editor ให้เรียบร้อย แล้วตั้งค่า Environment Variables ใน Netlify:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_CODE`

ขั้นตอนแนะนำ:

1. อัปโหลดโปรเจกต์ขึ้น GitHub/GitLab
2. เข้า Netlify > Add new site > Import an existing project
3. เลือก repository ของโปรเจกต์นี้
4. ตรวจว่า Build command เป็น `npm run build:netlify`
5. ตรวจว่า Publish directory เป็น `.next`
6. ใส่ Environment Variables ทั้ง 3 ค่าใน Site configuration > Environment variables
7. กด Deploy

ทดสอบ build สำหรับ Netlify ในเครื่อง:

```bash
npm run build:netlify
```

## โครงสร้างฐานข้อมูล

### `members`

- `id`: UUID
- `employee_no`: เลขลำดับสมาชิก
- `employee_code`: รหัสพนักงาน
- `name`: ชื่อสมาชิก
- `nickname`: ชื่อเล่น
- `chinese_name`: ชื่อภาษาจีน
- `sick_leave_remaining`: สิทธิลาป่วยคงเหลือ ค่าเริ่มต้น 30 วัน
- `personal_leave_remaining`: สิทธิลากิจคงเหลือ ค่าเริ่มต้น 3 วัน
- `vacation_leave_remaining`: สิทธิลาพักร้อนคงเหลือ ค่าเริ่มต้น 0 วัน
- `color`: สีประจำสมาชิก
- `is_active`: สถานะใช้งาน
- `created_at`: วันที่สร้างข้อมูล
- `updated_at`: วันที่แก้ไขล่าสุด

### `overtime_entries`

- `id`: UUID
- `member_id`: เชื่อมกับ `members.id`
- `ot_date`: วันที่ทำ OT
- `entry_type`: ประเภทข้อมูล `ot` หรือ `absent`
- `absence_type`: ประเภทการไม่มาทำงาน ใช้กับ `absent` ได้แก่ `sixth_day_off`, `personal_leave`, `sick_leave`, `vacation_leave`
- `start_time`: เวลาเริ่มต้น ใช้กับ `ot`
- `end_time`: เวลาสิ้นสุด ใช้กับ `ot`
- `total_minutes`: จำนวนนาที OT โดย `absent` จะเป็น 0
- ระบบนับชั่วโมง OT เฉพาะเวลาหลัง 18:00 เช่น 17:00-20:00 เท่ากับ 120 นาที
- `created_at`: วันที่และเวลาสร้าง
- `updated_at`: วันที่และเวลาแก้ไขล่าสุด

### `weekly_holidays`

- `id`: UUID
- `member_id`: เชื่อมกับ `members.id`
- `weekday`: วันในสัปดาห์แบบ 0-6 โดย 0 คือวันอาทิตย์ และ 6 คือวันเสาร์
- `created_at`: วันที่สร้างข้อมูล
- `updated_at`: วันที่แก้ไขล่าสุด

### `app_settings`

- `id`: ค่าเริ่มต้น `main`
- `show_employee_code`: เปิด/ปิดการแสดงรหัสพนักงานในหน้าผู้ใช้
- `updated_at`: วันที่แก้ไขล่าสุด

## API สำคัญ

- `GET /api/members`: ดึงรายชื่อสมาชิกที่ใช้งาน
- `GET /api/weekly-holidays`: ดึงวันหยุดประจำสัปดาห์ที่ใช้งาน
- `GET /api/overtime?month=YYYY-MM`: ดึงข้อมูล OT และสรุปรายเดือน
- `POST /api/overtime`: เพิ่มข้อมูล OT
- `PATCH /api/overtime/:id`: แก้ไขข้อมูล OT
- `DELETE /api/overtime/:id`: ลบข้อมูล OT
- `GET /api/admin/members`: ดึงสมาชิกทั้งหมด ต้องส่ง header `x-admin-code`
- `POST /api/admin/members`: เพิ่มสมาชิก ต้องส่ง header `x-admin-code`
- `PATCH /api/admin/members/:id`: แก้ไขสมาชิก ต้องส่ง header `x-admin-code`
- `GET /api/admin/weekly-holidays`: ดึงวันหยุดทั้งหมด ต้องส่ง header `x-admin-code`
- `POST /api/admin/weekly-holidays`: เพิ่มวันหยุด ต้องส่ง header `x-admin-code`
- `DELETE /api/admin/weekly-holidays/:id`: ลบวันหยุด ต้องส่ง header `x-admin-code`
- `GET /api/settings`: ดึงการตั้งค่าการแสดงผล
- `GET /api/admin/settings`: ดึงการตั้งค่าสำหรับ admin ต้องส่ง header `x-admin-code`
- `PATCH /api/admin/settings`: แก้ไขการตั้งค่าการแสดงผล ต้องส่ง header `x-admin-code`

ทุก API ที่แก้ไขข้อมูลมี validation ฝั่ง Server และ rate limit พื้นฐาน
