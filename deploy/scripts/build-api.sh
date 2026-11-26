#!/usr/bin/env bash
# build image API บนเครื่องนี้ (linux/amd64) แล้ว save เป็น tar.gz ใน deploy/dist/  -- ไม่แตะ server
set -euo pipefail
cd "$(dirname "$0")/../.."
TS=$(date +%Y%m%d-%H%M%S); OUT=deploy/dist; mkdir -p "$OUT"
git diff --quiet HEAD 2>/dev/null || echo "WARN: มีไฟล์ที่ยังไม่ commit (build จะรวมไปด้วย)"
docker buildx build --platform linux/amd64 -t "hrms-api:$TS" -f backend/Dockerfile backend --load
docker save "hrms-api:$TS" | gzip > "$OUT/hrms-api-$TS.tar.gz"
echo "$TS" > "$OUT/api.latest"
ls -lh "$OUT/hrms-api-$TS.tar.gz"
echo "OK build api $TS (commit $(git rev-parse --short HEAD))"
