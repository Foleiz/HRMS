#!/usr/bin/env bash
# ย้อน API กลับเวอร์ชันก่อนหน้า (โหลดจาก tar ที่เก็บไว้ ไม่พึ่ง image ใน docker เพราะ cron prune ลบได้)
set -euo pipefail
cd "$(dirname "$0")/../.."; . deploy/scripts/config.sh
ssh "$API_HOST" bash -s "$API_PORT" <<'REMOTE'
set -eu; cd /home/syaco/backend/hrms-api; PREV=$(cat PREV_TS) ; CUR=$(cat CURRENT_TS)
[ -f "releases/hrms-api-$PREV.tar.gz" ] || { echo "ไม่พบ tar ของ $PREV"; exit 1; }
gunzip -c "releases/hrms-api-$PREV.tar.gz" | docker load >/dev/null
docker tag "hrms-api:$PREV" hrms-api:current; docker compose up -d --no-build
echo "$PREV" > CURRENT_TS; echo "$CUR" > PREV_TS; echo "rolled back $CUR -> $PREV"
REMOTE
