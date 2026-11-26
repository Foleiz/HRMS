#!/usr/bin/env bash
# ส่ง frontend ที่ build แล้วขึ้น 186: แตกเป็น release ใหม่ -> สลับ symlink current -> pm2 restart (3-5 วินาที) -> health check -> rollback อัตโนมัติ
# ใช้: deploy/scripts/ship-web.sh [timestamp]    186 เป็น production + RAM น้อย: เช็ค RAM ก่อน และไม่ลบ release เก่าเลย
set -euo pipefail
cd "$(dirname "$0")/../.."; . deploy/scripts/config.sh
TS=${1:-$(cat deploy/dist/web.latest)}; F=deploy/dist/hrms-web-$TS.tar.gz
[ -f "$F" ] || { echo "ไม่พบ $F"; exit 1; }
ssh "$WEB_HOST" 'mkdir -p /home/syaco/standalone_frontend/hrms-web/releases'
scp -q "$F" "$WEB_HOST:/home/syaco/standalone_frontend/hrms-web/hrms-web-$TS.tar.gz"
scp -q deploy/web/ecosystem.config.js "$WEB_HOST:/home/syaco/standalone_frontend/hrms-web/ecosystem.config.js"
ssh "$WEB_HOST" bash -s "$TS" "$WEB_PORT" <<'REMOTE'
set -u
TS=$1; PORT=$2; cd /home/syaco/standalone_frontend/hrms-web
avail=$(free -m | awk '/Mem:/{print $7}'); [ "$avail" -ge 150 ] || { echo "ABORT: RAM ว่างเหลือ ${avail}MB (<150)"; exit 1; }
R=releases/$TS; mkdir -p "$R"; tar -xzf "hrms-web-$TS.tar.gz" -C "$R" && rm -f "hrms-web-$TS.tar.gz"
[ -x ~/ops/sharp-swap.sh ] && ~/ops/sharp-swap.sh "/home/syaco/standalone_frontend/hrms-web/$R" || true   # สลับ sharp เป็น 0.35.5 (linux) ถ้ามีใน release
OLD=$(readlink current 2>/dev/null || true)
ln -sfn "$R" current.new && mv -T current.new current
rollback() { echo "ROLLBACK"; if [ -n "$OLD" ]; then ln -sfn "$OLD" current.new && mv -T current.new current; pm2 restart hrms-web-4001 >/dev/null 2>&1; fi; exit 1; }
if pm2 describe hrms-web-4001 >/dev/null 2>&1; then pm2 restart hrms-web-4001 --update-env >/dev/null; else pm2 start ecosystem.config.js >/dev/null; fi
for i in $(seq 1 15); do ss -ltn | grep -q "127.0.0.1:$PORT " && break; sleep 2; done
ss -ltn | grep "[: ]$PORT " | grep -q "127.0.0.1:$PORT" || { echo "ไม่ฟังที่ 127.0.0.1:$PORT"; pm2 logs hrms-web-4001 --err --lines 15 --nostream | tail -15; rollback; }
for i in 1 2 3 4 5; do c=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "http://127.0.0.1:$PORT/login" || true); case "$c" in 2*|3*) break;; esac; sleep 3; done
case "$c" in 2*|3*) ;; *) echo "FAIL HTTP $c"; rollback;; esac
pm2 save >/dev/null; echo "OK hrms-web $TS online (HTTP $c, ก่อนหน้า: ${OLD:-none})"
REMOTE
