# ย้ายฐานข้อมูล Supabase จากโตเกียวมาสิงคโปร์

## ทำไมต้องย้าย
ฐานข้อมูลปัจจุบันอยู่ `ap-northeast-1` (โตเกียว) ทุก query ต้องวิ่งไทย ↔ ญี่ปุ่น
คำขอที่ยิง 20-40 query (เช่น ยื่นใบลา, เปิดหน้าพนักงาน) จึงช้า 4-15 วินาที
สิงคโปร์ (`ap-southeast-1`) ใกล้ไทยกว่ามาก ทุก query จะเร็วขึ้นพร้อมกันโดยไม่ต้องแก้โค้ด

## ขั้นตอน (ใช้เวลาประมาณ 30-60 นาที)

### 1. สร้างโปรเจกต์ใหม่
- Supabase Dashboard → New project → Region: **Southeast Asia (Singapore)**
- จดรหัสผ่านฐานข้อมูลไว้ (อย่าใส่ลงไฟล์ที่ commit เข้า git)

### 2. ติดตั้งเครื่องมือ (ครั้งเดียว)
ติดตั้ง PostgreSQL client เวอร์ชันเดียวกับ Supabase (ดูได้ที่ Settings → Database) เพื่อให้มี `pg_dump` และ `psql`

### 3. Export จากโปรเจกต์เดิม
ใช้ connection string แบบ **Session pooler (port 5432)** ของโปรเจกต์เดิม
```bash
pg_dump "postgresql://postgres.<OLD_REF>:<OLD_PASSWORD>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres" \
  --schema=hrms --no-owner --no-privileges -Fc -f hrms.dump
```

### 4. Import เข้าโปรเจกต์ใหม่
```bash
psql "postgresql://postgres.<NEW_REF>:<NEW_PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
  -c "CREATE SCHEMA IF NOT EXISTS hrms;"
pg_restore --no-owner --no-privileges -d "postgresql://postgres.<NEW_REF>:<NEW_PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" hrms.dump
```

### 5. ตรวจข้อมูล
รันใน SQL Editor ทั้งสองโปรเจกต์ แล้วเทียบตัวเลข
```sql
SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'hrms' ORDER BY relname;
```
หรือนับตารางสำคัญตรง ๆ: `employee`, `user_account`, `leave_request`, `payroll`

### 6. เปลี่ยน connection string
แก้ `backend/src/Hrms.Api/appsettings.Development.json` (และ `appsettings.json`)
- `Host=aws-0-ap-southeast-1.pooler.supabase.com`
- `Username=postgres.<NEW_REF>` และ `Password=<NEW_PASSWORD>`
- เก็บค่าอื่นไว้เหมือนเดิม (`SearchPath=hrms;SslMode=Require;Maximum Pool Size=20;Minimum Pool Size=2;Connection Idle Lifetime=300;Keepalive=30;...`)

แนะนำ: ย้ายรหัสผ่านออกจากไฟล์ที่ commit ไปไว้ใน User Secrets
```bash
cd backend/src/Hrms.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<connection string ใหม่>"
```

### 7. รีสตาร์ตและวัดผล
รีสตาร์ต backend แล้วดู log `[SLOW]` ในหน้าต่าง backend หรือ DevTools → Network → Timing (Server-Timing: db)
เทียบเวลากับก่อนย้าย

### 8. เมื่อมั่นใจแล้ว
- แจ้งเพื่อนในทีมให้ใช้ connection string ใหม่
- เปลี่ยนรหัสผ่านโปรเจกต์เดิม (รหัสเดิมเคยหลุดอยู่ในสคริปต์ `backend/scripts/add_employment_status.py`) หรือ pause โปรเจกต์เดิม
