#!/usr/bin/env bash
# build frontend บนเครื่องนี้ (NEXT_PUBLIC_* ฝังตอน build) แล้วแพ็ก standalone เป็น tar.gz -- ไม่แตะ server
set -euo pipefail
cd "$(dirname "$0")/../.."; . deploy/scripts/config.sh
TS=$(date +%Y%m%d-%H%M%S); OUT=$PWD/deploy/dist; mkdir -p "$OUT"
git diff --quiet HEAD 2>/dev/null || echo "WARN: มีไฟล์ที่ยังไม่ commit (build จะรวมไปด้วย)"
cd frontend
export NEXT_PUBLIC_API_URL="https://$API_DOMAIN/api" NEXT_PUBLIC_API_URL_FORCE=1
# package-lock.json ใน repo ขาด optional deps (@emnapi) ทำให้ npm ci ล้ม -> fallback เป็น npm install (อาจแก้ package-lock.json ในเครื่องนี้ ให้ทีม commit lockfile ใหม่)
npm ci --no-audit --no-fund || { echo "WARN: lockfile ไม่ sync -> npm install"; npm install --no-audit --no-fund; }
npm run build
S=.next/standalone; [ -f "$S/server.js" ] || { echo "ไม่พบ $S/server.js (โครงสร้าง standalone เปลี่ยน)"; exit 1; }
rm -rf "$OUT/web-stage"; mkdir -p "$OUT/web-stage/.next"
cp -R "$S/." "$OUT/web-stage/"; cp -R .next/static "$OUT/web-stage/.next/static"
[ -d public ] && cp -R public "$OUT/web-stage/public"
# ไม่ส่ง binary ของเครื่อง mac ไปด้วย (sharp ถูกสลับเป็นตัว linux บน server โดย ship-web.sh)
rm -rf "$OUT"/web-stage/node_modules/@img/sharp-darwin-* "$OUT"/web-stage/node_modules/@img/sharp-libvips-darwin-* 2>/dev/null || true
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$OUT/hrms-web-$TS.tar.gz" -C "$OUT/web-stage" . ; rm -rf "$OUT/web-stage"
echo "$TS" > "$OUT/web.latest"; ls -lh "$OUT/hrms-web-$TS.tar.gz"
echo "OK build web $TS (API=$NEXT_PUBLIC_API_URL)"
