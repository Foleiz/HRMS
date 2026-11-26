# HRMS deploy -- ใช้: make help
# build บนเครื่องนี้เสมอ แล้วส่งขึ้น server (112 = API, 186 = Web) ดูรายละเอียดที่ deploy/README.md
SHELL := /bin/bash
S := deploy/scripts
.DEFAULT_GOAL := help
.PHONY: help deploy deploy-api deploy-web rollback-api rollback-web status logs-api logs-web check confirm

help:
	@echo "make deploy         build + ส่งขึ้น API (112) แล้ว Web (186)"
	@echo "make deploy-api     เฉพาะ API (112)"
	@echo "make deploy-web     เฉพาะ Web (186)"
	@echo "make rollback-api   ย้อน API กลับเวอร์ชันก่อนหน้า"
	@echo "make rollback-web   ย้อน Web กลับเวอร์ชันก่อนหน้า"
	@echo "make status         ตรวจ domain + container/pm2 บน server"
	@echo "make logs-api       ดู log API สด (Ctrl+C ออก)"
	@echo "make logs-web       ดู log Web"
	@echo "make check          ตรวจ build/typecheck ในเครื่องก่อน deploy (ไม่แตะ server)"
	@echo ""
	@echo "production จะถามยืนยันก่อนเสมอ ข้ามด้วย YES=1  เช่น: make deploy YES=1"

confirm:
	@if [ "$(YES)" != "1" ]; then read -r -p "Deploy ขึ้น PRODUCTION: $(TARGET) ใช่ไหม? [y/N] " a; [ "$$a" = y ] || [ "$$a" = Y ] || { echo "ยกเลิก"; exit 1; }; fi

deploy-api:
	@$(MAKE) --no-print-directory confirm TARGET="API -> 112 (hrms-api.syaco.co.th)"
	$(S)/build-api.sh
	$(S)/ship-api.sh

deploy-web:
	@$(MAKE) --no-print-directory confirm TARGET="Web -> 186 (hrms.syaco.co.th)"
	$(S)/build-web.sh
	$(S)/ship-web.sh
	@git checkout -q frontend/package-lock.json 2>/dev/null || true

deploy:
	@$(MAKE) --no-print-directory confirm TARGET="API -> 112 และ Web -> 186"
	@$(MAKE) --no-print-directory deploy-api YES=1
	@$(MAKE) --no-print-directory deploy-web YES=1

rollback-api:
	@$(MAKE) --no-print-directory confirm TARGET="ย้อน API (112)"
	$(S)/rollback-api.sh

rollback-web:
	@$(MAKE) --no-print-directory confirm TARGET="ย้อน Web (186)"
	$(S)/rollback-web.sh

status:
	@. $(S)/config.sh; \
	for u in $$WEB_DOMAIN/login $$API_DOMAIN/api/auth/login; do printf "%-38s " $$u; curl -sk -o /dev/null -m 10 -w "HTTP %{http_code}  (ปกติ: web 200, api 405)\n" https://$$u; done; \
	echo "--- API ($$API_HOST)"; ssh $$API_HOST 'docker ps --filter name=^hrms-api$$ --format "{{.Names}}  {{.Status}}"; docker stats --no-stream --format "mem {{.MemUsage}}  cpu {{.CPUPerc}}" hrms-api; echo "version: $$(cat /home/syaco/backend/hrms-api/CURRENT_TS 2>/dev/null)"'; \
	echo "--- Web ($$WEB_HOST)"; ssh $$WEB_HOST 'pm2 ls | grep hrms-web; echo "release: $$(readlink /home/syaco/standalone_frontend/hrms-web/current)"; free -m | sed -n 2p'

logs-api:
	@. $(S)/config.sh; ssh $$API_HOST 'docker logs --tail 100 -f hrms-api'

logs-web:
	@. $(S)/config.sh; ssh $$WEB_HOST 'pm2 logs hrms-web-4001 --lines 100'

check:
	cd backend && dotnet build src/Hrms.Api/Hrms.Api.csproj -c Release -v q | tail -3
	cd frontend && npx tsc --noEmit && echo "tsc OK"
