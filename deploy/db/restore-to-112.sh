#!/usr/bin/env bash
# ส่ง dump ขึ้น 112 แล้ว restore เข้า hrmsdb ด้วย role hrms_app (ใน transaction เดียว ล้มแล้ว rollback ทั้งหมด)
# ปฏิเสธถ้า schema hrms มีตารางอยู่แล้ว (กันทับข้อมูล)  ต้องรัน create-db.sh บน 112 ก่อน
set -euo pipefail
cd "$(dirname "$0")/../.."; . deploy/scripts/config.sh
# ไฟล์เดียวที่ได้จาก filter-dump.py (schema + function + trigger + ข้อมูลตั้งต้นที่เลือก)
LOAD=${1:-deploy/dist/hrms-prod-load.sql}
[ -f "$LOAD" ] || { echo "ไม่พบ $LOAD (รัน deploy/db/filter-dump.py ก่อน)"; exit 1; }
ssh "$API_HOST" 'mkdir -p /home/syaco/backend/hrms-api/db && chmod 700 /home/syaco/backend/hrms-api/db'
scp -q "$LOAD" "$API_HOST:/home/syaco/backend/hrms-api/db/hrms-load.sql"
ssh "$API_HOST" bash -s <<'REMOTE'
set -eu; cd /home/syaco/backend/hrms-api/db
export PGPASSWORD=$(grep '^ConnectionStrings__DefaultConnection=' /home/syaco/backend/hrms-api/hrms-api.env | sed -n 's/.*Password=\([^;]*\);.*/\1/p')
P="psql -X -h /var/run/postgresql -U hrms_app -d hrmsdb -v ON_ERROR_STOP=1"
n=$($P -Atc "select count(*) from information_schema.tables where table_schema='hrms'")
[ "$n" = 0 ] || { echo "ABORT: hrms มี $n ตารางอยู่แล้ว ไม่ restore ทับ"; exit 1; }
PGOPTIONS='-c client_min_messages=warning' $P -1 -q -f hrms-load.sql
echo "tables: $($P -Atc "select count(*) from information_schema.tables where table_schema='hrms' and table_type='BASE TABLE'")"
$P -Atc "select 'role='||count(*) from hrms.\"role\"" 2>/dev/null || true
REMOTE
