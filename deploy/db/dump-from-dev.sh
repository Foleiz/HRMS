#!/usr/bin/env bash
# รันบนเครื่อง dev (ไม่แตะ server): dump schema (+ข้อมูลตั้งต้นบางตาราง) จาก Supabase dev ออกเป็นไฟล์ใน deploy/dist/
# ใช้: deploy/db/dump-from-dev.sh        (ถามเชื่อมต่อแบบซ่อนรหัสผ่าน หรือตั้ง DEV_DB_URL=postgresql://user:pass@host:5432/postgres)
# ตั้ง WITH_SEED=0 ถ้าไม่ต้องการข้อมูลตั้งต้น (ได้ schema ว่างอย่างเดียว)
set -euo pipefail
cd "$(dirname "$0")/../.."; OUT=deploy/dist; mkdir -p "$OUT"
if [ -z "${DEV_DB_URL:-}" ]; then read -rsp "DEV_DB_URL (postgresql://...): " DEV_DB_URL; echo; fi
PGD=/opt/homebrew/opt/postgresql@17/bin/pg_dump; [ -x "$PGD" ] || PGD=pg_dump
$PGD "$DEV_DB_URL" --schema=hrms --schema-only --no-owner --no-privileges -f "$OUT/hrms-schema.sql"
sed -i '' 's/^CREATE SCHEMA hrms;/CREATE SCHEMA IF NOT EXISTS hrms;/' "$OUT/hrms-schema.sql"
echo "schema: $(grep -c '^CREATE TABLE' "$OUT/hrms-schema.sql") ตาราง -> $OUT/hrms-schema.sql"
if [ "${WITH_SEED:-1}" = 1 ]; then
  # ข้อมูลตั้งต้น (master/สิทธิ์) -- แก้รายการนี้ได้ ตรวจให้ครบก่อนใช้จริง; ไม่รวมพนักงาน/บัญชีผู้ใช้/ข้อมูลทดสอบ
  SEED="bank certificate_type document_type employee_type gender_type leave_type marital_status_type nationality religion permission role role_permission role_data_scope employee_level benefit_item employee_type_benefit"
  args=(); for t in $SEED; do args+=(-t "hrms.\"$t\""); done
  $PGD "$DEV_DB_URL" --data-only --no-owner --no-privileges "${args[@]}" -f "$OUT/hrms-seed.sql"
  echo "seed:   $(grep -c '^COPY' "$OUT/hrms-seed.sql") ตาราง -> $OUT/hrms-seed.sql"
fi
echo "ตรวจไฟล์ก่อนส่ง: grep -n 'supabase\|auth\.' $OUT/hrms-schema.sql"
