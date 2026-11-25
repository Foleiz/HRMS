#!/usr/bin/env bash
# รันบน 112 (ต้อง sudo): สร้าง role + database ใหม่สำหรับ HRMS โดยไม่แตะ DB/role อื่น
#   sudo bash ~/ops/hrms/create-db.sh
# รหัสผ่านอ่านจาก /home/syaco/backend/hrms-api/hrms-api.env (ไม่ต้องพิมพ์/วางรหัสในแชท) และ idempotent (รันซ้ำได้)
set -euo pipefail
ENVF=${1:-/home/syaco/backend/hrms-api/hrms-api.env}; DB=hrmsdb; ROLE=hrms_app; HOSTIP=103.13.228.112
PW=$(grep '^ConnectionStrings__DefaultConnection=' "$ENVF" | sed -n 's/.*Password=\([^;]*\);.*/\1/p')
[ -n "$PW" ] && [ "$PW" != CHANGE_ME ] || { echo "ABORT: ไม่พบรหัสผ่านจริงใน $ENVF"; exit 1; }
case "$PW" in *[!A-Za-z0-9]*) echo "ABORT: รหัสผ่านต้องเป็นตัวอักษร/ตัวเลขล้วน"; exit 1;; esac
PSQL="sudo -u postgres psql -X -q -v ON_ERROR_STOP=1"
echo "[1/4] role $ROLE (ไม่ใช่ superuser, สร้าง DB/role ไม่ได้)"
$PSQL -v pw="$PW" <<'SQL'
SELECT format('CREATE ROLE hrms_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'pw')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrms_app') \gexec
SELECT format('ALTER ROLE hrms_app PASSWORD %L', :'pw') \gexec
SQL
echo "[2/4] database $DB (owner $ROLE) + ตัดสิทธิ์ PUBLIC"
$PSQL <<'SQL'
SELECT 'CREATE DATABASE hrmsdb OWNER hrms_app ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'hrmsdb') \gexec
REVOKE ALL ON DATABASE hrmsdb FROM PUBLIC;
GRANT CONNECT ON DATABASE hrmsdb TO hrms_app;
SQL
sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -d "$DB" <<'SQL'
CREATE SCHEMA IF NOT EXISTS hrms AUTHORIZATION hrms_app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER ROLE hrms_app IN DATABASE hrmsdb SET search_path = hrms, public;
SQL
echo "[3/4] pg_hba (เฉพาะ $ROLE -> $DB จาก docker และ host IP) + reload แบบ graceful"
HBA=$($PSQL -At -c "SHOW hba_file")
if ! grep -q "$ROLE" "$HBA"; then
  cp -a "$HBA" "$HBA.bak-hrms-$(date +%F-%H%M)"
  printf '\n# HRMS (create-db.sh)\nhost %s %s 172.16.0.0/12 scram-sha-256\nhost %s %s %s/32 scram-sha-256\n' "$DB" "$ROLE" "$DB" "$ROLE" "$HOSTIP" >> "$HBA"
  $PSQL -c "SELECT pg_reload_conf()" >/dev/null
fi
# unix socket: API (docker) ต่อผ่าน /var/run/postgresql ไม่ผ่านเครือข่าย  กฎ local ต้องอยู่ "ก่อน" กฎ local peer เดิม (match แรกชนะ)
if ! grep -qE "^local[[:space:]]+$DB[[:space:]]+$ROLE" "$HBA"; then
  cp -a "$HBA" "$HBA.bak-hrms-local-$(date +%F-%H%M)"
  awk -v r="local $DB $ROLE scram-sha-256" '!d && /^local[[:space:]]/ {print "# HRMS (create-db.sh) unix socket"; print r; d=1} {print}' "$HBA" > "$HBA.new" && cat "$HBA.new" > "$HBA" && rm -f "$HBA.new"
  $PSQL -c "SELECT pg_reload_conf()" >/dev/null
fi
echo "[4/4] ทดสอบเชื่อมต่อด้วย role ใหม่ (TCP และ unix socket)"
PGPASSWORD="$PW" psql -X -h /var/run/postgresql -U "$ROLE" -d "$DB" -Atc "select 'OK socket user='||current_user" \
  || { echo "FAIL: unix socket เชื่อมต่อไม่ได้ ตรวจลำดับกฎ local ใน $HBA"; exit 1; }
PGPASSWORD="$PW" psql -X -h "$HOSTIP" -U "$ROLE" -d "$DB" -Atc "select 'OK user='||current_user||' db='||current_database()||' search_path='||current_setting('search_path')" \
  || { echo "FAIL: เชื่อมต่อไม่ได้ ตรวจลำดับกฎใน $HBA (อาจมีกฎ reject ก่อนบรรทัดที่เพิ่ม)"; exit 1; }
# [5/5] ให้ backup_mgr (ใช้โดย ~/backup-db/backup_script.sh) อ่าน hrmsdb ได้ ทั้งของที่มีอยู่และตารางที่ hrms_app สร้างทีหลัง
if sudo -u postgres psql -X -Atc "select 1 from pg_roles where rolname='backup_mgr'" | grep -q 1; then
  sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -d "$DB" <<'SQL'
GRANT CONNECT ON DATABASE hrmsdb TO backup_mgr;
GRANT USAGE ON SCHEMA hrms TO backup_mgr;
GRANT SELECT ON ALL TABLES IN SCHEMA hrms TO backup_mgr;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA hrms TO backup_mgr;
ALTER DEFAULT PRIVILEGES FOR ROLE hrms_app IN SCHEMA hrms GRANT SELECT ON TABLES TO backup_mgr;
ALTER DEFAULT PRIVILEGES FOR ROLE hrms_app IN SCHEMA hrms GRANT SELECT ON SEQUENCES TO backup_mgr;
SQL
  echo "backup_mgr: อ่าน hrmsdb ได้แล้ว -> เพิ่มบรรทัด \"hrmsdb|backup_mgr|/home/syaco/backup-db/hrmsdb\" ใน DATABASES ของ backup_script.sh และ mkdir โฟลเดอร์นั้น"
fi
