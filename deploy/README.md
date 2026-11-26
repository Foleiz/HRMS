# Deploy HRMS: API -> 112 (Docker), Web -> 186 (pm2)

build บนเครื่อง dev ทั้งหมด ไม่ build บน server. ค่า domain/host ดู `scripts/config.sh`
(สมมติ: web `hrms.syaco.co.th` @186, api `hrms-api.syaco.co.th` @112 - แก้ได้ที่เดียว)

## ครั้งแรก (setup)
1. DNS: A record `hrms-api` -> 103.13.228.112, `hrms` -> 103.13.228.186
2. 112: สร้าง `/home/syaco/backend/hrms-api/hrms-api.env` จาก `api/hrms-api.env.example` (chmod 600, ค่าลับใหม่ทั้งหมด)
3. nginx: คัดลอก `nginx/*.conf` ไปเครื่องที่ตรงกัน + `nginx -t` + reload + `certbot --nginx -d <domain>` (ต้อง sudo)

## ฐานข้อมูล (PostgreSQL 17 บน 112, DB `hrmsdb`, role `hrms_app`)
1. 112: `sudo bash ~/ops/hrms/create-db.sh` (สร้าง role/db ใหม่ + pg_hba + สิทธิ์ backup, รหัสผ่านอ่านจาก hrms-api.env, รันซ้ำได้)
2. เครื่อง dev: `deploy/db/dump-from-dev.sh` (schema + ข้อมูลตั้งต้น; `WITH_SEED=0` = schema เปล่า) แล้ว `deploy/db/restore-to-112.sh` (ปฏิเสธถ้ามีตารางอยู่แล้ว, ทำใน transaction เดียว)
3. เพิ่ม `hrmsdb|backup_mgr|/home/syaco/backup-db/hrmsdb` ใน `~/backup-db/backup_script.sh` (backup 23:00)
- API เชื่อม PostgreSQL ผ่าน unix socket `/var/run/postgresql` (mount เข้า container แบบ read-only) ไม่ผ่านเครือข่าย/IP/firewall

## วิธีใช้แบบง่าย (จาก root ของ repo)
    make deploy        # build + ส่งขึ้น API (112) แล้ว Web (186) ถามยืนยันก่อน (ข้ามด้วย YES=1)
    make deploy-api    # เฉพาะ API        make deploy-web   # เฉพาะ Web
    make status        # ตรวจ domain + container/pm2     make rollback-api / rollback-web
    make logs-api / logs-web     make check   # ตรวจ build ในเครื่องก่อน (ไม่แตะ server)
    make help

## deploy ทุกครั้ง (ทำเองทีละขั้น)
    deploy/scripts/build-api.sh && deploy/scripts/ship-api.sh      # 112: restart ~5-10 วิ, rollback อัตโนมัติถ้า health check ไม่ผ่าน
    deploy/scripts/build-web.sh && deploy/scripts/ship-web.sh      # 186: สลับ release + pm2 restart ~3-5 วิ, rollback อัตโนมัติ

## rollback ด้วยมือ
    deploy/scripts/rollback-api.sh      # โหลด image ก่อนหน้าจาก tar ที่เก็บ (/home/syaco/backend/hrms-api/releases) ไม่พึ่ง docker prune
    deploy/scripts/rollback-web.sh      # ชี้ symlink current ไป release ก่อนหน้า (/home/syaco/standalone_frontend/hrms-web/releases)

## หมายเหตุ
- 112/186 เป็น production: ship-* ทำเมื่อผู้ใช้อนุญาต, อย่าทำช่วง 02:45-03:15 บน 112 (cron docker prune)
- API ฟัง `127.0.0.1:5229`, Web ฟัง `127.0.0.1:4001` (ไม่เปิด firewall, เข้าผ่าน nginx เท่านั้น)
- ความลับอยู่ใน env บน server เท่านั้น (`Cors__AllowedOrigins__0`, `Jwt__SecretKey`, `ConnectionStrings__DefaultConnection`, ...)
- Next ฝัง `NEXT_PUBLIC_API_URL` ตอน build: เปลี่ยน domain API ต้อง build-web ใหม่
