#!/usr/bin/env bash
# ส่ง image ที่ build แล้วขึ้น 112 และสลับ container (restart ~5-10 วินาที) พร้อม health check + rollback อัตโนมัติ
# ใช้: deploy/scripts/ship-api.sh [timestamp]     (ไม่ใส่ = ตัวล่าสุดจาก build-api.sh)
# ข้อกำหนด: 112 เป็น production -> รันเมื่อผู้ใช้อนุญาตเท่านั้น และอย่ารันช่วง 02:45-03:15 (cron docker prune)
set -euo pipefail
cd "$(dirname "$0")/../.."; . deploy/scripts/config.sh
TS=${1:-$(cat deploy/dist/api.latest)}; F=deploy/dist/hrms-api-$TS.tar.gz
[ -f "$F" ] || { echo "ไม่พบ $F"; exit 1; }
ssh "$API_HOST" 'mkdir -p /home/syaco/backend/hrms-api/releases'
ssh "$API_HOST" 'test -f /home/syaco/backend/hrms-api/hrms-api.env' || { echo "ABORT: ยังไม่มี /home/syaco/backend/hrms-api/hrms-api.env บน $API_HOST (ดู deploy/api/hrms-api.env.example)"; exit 1; }
scp -q "$F" "$API_HOST:/home/syaco/backend/hrms-api/releases/"
scp -q deploy/api/docker-compose.yml "$API_HOST:/home/syaco/backend/hrms-api/docker-compose.yml"
ssh "$API_HOST" bash -s "$TS" "$API_PORT" <<'REMOTE'
set -u
TS=$1; PORT=$2; cd /home/syaco/backend/hrms-api
OLD=$(cat CURRENT_TS 2>/dev/null || true)
gunzip -c "releases/hrms-api-$TS.tar.gz" | docker load >/dev/null
docker tag "hrms-api:$TS" hrms-api:current
docker compose up -d --no-build
ok=0
for i in $(seq 1 20); do
  c=$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://127.0.0.1:$PORT/api/auth/login" || true)
  case "$c" in 2*|3*|4*) ok=1; break;; esac; sleep 3
done
if [ "$ok" = 1 ]; then
  [ -n "$OLD" ] && echo "$OLD" > PREV_TS; echo "$TS" > CURRENT_TS
  echo "OK hrms-api $TS online (HTTP $c, ก่อนหน้า: ${OLD:-none})"
else
  echo "FAIL (HTTP ${c:-000}) -> rollback"; docker logs --tail 30 hrms-api 2>&1 | tail -30
  if [ -n "$OLD" ] && [ -f "releases/hrms-api-$OLD.tar.gz" ]; then
    gunzip -c "releases/hrms-api-$OLD.tar.gz" | docker load >/dev/null; docker tag "hrms-api:$OLD" hrms-api:current; docker compose up -d --no-build; echo "rolled back to $OLD"
  else docker compose down; echo "ไม่มีเวอร์ชันก่อนหน้า -> หยุด container"; fi
  exit 1
fi
REMOTE
