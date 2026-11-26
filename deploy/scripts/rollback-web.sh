#!/usr/bin/env bash
# ย้อน frontend ไป release ก่อนหน้า (release เก่าเก็บไว้ใน /home/syaco/standalone_frontend/hrms-web/releases/)
set -euo pipefail
cd "$(dirname "$0")/../.."; . deploy/scripts/config.sh
ssh "$WEB_HOST" bash -s <<'REMOTE'
set -eu; cd /home/syaco/standalone_frontend/hrms-web
CUR=$(readlink current); PREV=$(ls -1d releases/* | grep -vx "$CUR" | sort | tail -1)
[ -n "$PREV" ] || { echo "ไม่มี release ก่อนหน้า"; exit 1; }
ln -sfn "$PREV" current.new && mv -T current.new current; pm2 restart hrms-web-4001 >/dev/null; pm2 save >/dev/null
echo "rolled back $CUR -> $PREV"
REMOTE
