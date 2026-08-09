# 🏸 บันทึกลูกแบด (Shuttle Ledger)

เว็บแอปสำหรับบันทึกลูกแบดและค่าใช้จ่ายของกลุ่มแบดมินตัน — พอร์ตจากไฟล์ HTML เดี่ยวเดิมมาเป็น Next.js + PostgreSQL
ทุกคนที่เปิดลิงก์เดียวกันเห็นและแก้ไขข้อมูลชุดเดียวกันแบบเรียลไทม์ (ไม่ต้องแยกโหมดส่วนตัว/ใช้ร่วมกันอีกต่อไป)

## สแตก

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **Prisma 7** + **PostgreSQL** (ผ่าน `@prisma/adapter-pg`)
- ฟอนต์ Baloo 2 + Nunito, ธีมสีและ UI พอร์ตมาจากไฟล์ต้นฉบับเกือบทั้งหมด

## โครงสร้างข้อมูล

- `Player` — ชื่อผู้เล่น, อยู่ในสนามวันนี้ไหม (`isToday`), กลับแล้วไหม (`hasLeft`)
- `Payment` — ประวัติการจ่ายเงินของผู้เล่นแต่ละคน
- `Shuttle` — ลูกแบดแต่ละลูก (หมายเลขลูก, รายชื่อคนใช้ร่วม, วันที่)
- `Settings` — ราคาต่อลูก, หมายเลขลูกสูงสุด (แถวเดียว)

## รันบนเครื่องตัวเอง (Local Development)

โปรเจกต์นี้ตั้งค่าให้ใช้ **Prisma local dev database** (Postgres จำลองบนเครื่อง ไม่ต้องสมัครอะไรเพิ่ม) อยู่แล้ว:

```bash
npm install
npx prisma dev          # เปิด Postgres จำลองไว้เบื้องหลัง (เปิดทิ้งไว้ในอีกหน้าต่าง terminal)
npx prisma migrate dev  # สร้างตาราง (รันครั้งแรกครั้งเดียว)
npm run dev              # เปิดเว็บที่ http://localhost:3000
```

## Deploy ขึ้นจริง (ฟรี): Vercel + Neon

### ขั้นตอนที่ 1 — สร้างฐานข้อมูลจริงที่ Neon

1. ไปที่ [neon.tech](https://neon.tech) แล้วสมัครสมาชิก (ฟรี ไม่ต้องใช้บัตรเครดิต)
2. กด **Create a project** ตั้งชื่ออะไรก็ได้ เช่น `badminton-tracker`
3. เมื่อสร้างเสร็จ ไปที่หน้า **Connection Details** แล้วเลือกแบบ **Direct connection** (ไม่ใช่ Pooled) — คัดลอก connection string ที่ขึ้นต้นด้วย `postgresql://...`
   > หมายเหตุ: โปรเจกต์นี้ต่อฐานข้อมูลแบบ direct TCP ผ่าน `pg`/`@prisma/adapter-pg` ซึ่งใช้ได้ดีกับขนาดกลุ่มแบดมินตันทั่วไป ถ้าจะขยายไปหลายร้อยผู้ใช้พร้อมกันในอนาคต ค่อยพิจารณาเปลี่ยนไปใช้ `@prisma/adapter-neon` (ตัว driver แบบ HTTP ที่ Neon แนะนำสำหรับ serverless)

### ขั้นตอนที่ 2 — เตรียมโค้ดขึ้น GitHub

```bash
git init
git add .
git commit -m "Initial commit: badminton tracker web app"
```

จากนั้นสร้าง repo ใหม่บน GitHub (ผ่านเว็บ github.com/new) แล้วรัน:

```bash
git remote add origin https://github.com/<your-username>/badminton-tracker.git
git branch -M main
git push -u origin main
```

### ขั้นตอนที่ 3 — Deploy บน Vercel

1. ไปที่ [vercel.com/new](https://vercel.com/new) แล้ว sign in ด้วย GitHub
2. เลือก import repo `badminton-tracker` ที่เพิ่ง push ไป
3. ในหน้า **Environment Variables** ใส่:
   - `DATABASE_URL` = connection string จาก Neon ที่คัดลอกไว้ (ขั้นตอนที่ 1) — เติม `?sslmode=require` ต่อท้ายถ้ายังไม่มี
4. กด **Deploy**

### ขั้นตอนที่ 4 — สร้างตารางบนฐานข้อมูลจริง

หลัง deploy ครั้งแรก ต้องรัน migration กับฐานข้อมูล Neon หนึ่งครั้ง (จากเครื่องตัวเอง):

```bash
# ตั้งค่า DATABASE_URL ชั่วคราวให้ชี้ไป Neon แล้วรัน migrate deploy
DATABASE_URL="<connection string จาก Neon>" npx prisma migrate deploy
```

(บน Windows PowerShell ใช้: `$env:DATABASE_URL="<connection string>"; npx prisma migrate deploy`)

เสร็จแล้วเปิดลิงก์ Vercel ที่ได้ — ทุกคนที่เปิดลิงก์นี้จะเห็นข้อมูลชุดเดียวกัน

### นำเข้าข้อมูลเดิม (ถ้ามี)

เปิดแอปที่ deploy แล้ว → กด ⚙️ ตั้งค่า → 📥 นำเข้า → วางข้อความสำรอง JSON จากแอปเวอร์ชันเดิม (ปุ่ม "ส่งออก" ในแอปเก่า หรือไฟล์ backup ที่มีอยู่) แล้วกด "นำเข้าข้อมูล"

## หมายเหตุด้านสถาปัตยกรรม

- **Undo/Redo**: ทุกการแก้ไขจะถูกเก็บ snapshot ของข้อมูลทั้งหมดไว้ในเบราว์เซอร์ (สูงสุด 50 ขั้น) กดปุ่ม ↶ ↷ มุมขวาล่างเพื่อย้อนกลับ/ทำซ้ำ ซึ่งจะเขียนทับข้อมูลในฐานข้อมูลจริงด้วย snapshot นั้น
- **หลายอุปกรณ์พร้อมกัน**: ทุกการกระทำจะดึงข้อมูลล่าสุดจากฐานข้อมูลกลับมาแสดงทันที แต่แอปไม่มีการ sync แบบเรียลไทม์ข้ามอุปกรณ์ (ต้องรีเฟรชหน้าเพื่อเห็นการเปลี่ยนแปลงจากอุปกรณ์อื่น)
