-- ==============================================================================
-- อายุหนังสือรับรอง (เดือน) ต่อประเภท — ตั้งค่าที่เมนูข้อมูลหลัก > ประเภทหนังสือรับรอง
-- ใช้คำนวณ "ใช้ได้ถึงวันที่" ในหนังสือรับรองจากวันที่ออก (วันที่อนุมัติ)
-- รันซ้ำได้ปลอดภัย (idempotent)
-- ==============================================================================
BEGIN;

ALTER TABLE hrms.certificate_type ADD COLUMN IF NOT EXISTS validity_months integer NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificate_type_validity_months_check') THEN
        ALTER TABLE hrms.certificate_type ADD CONSTRAINT certificate_type_validity_months_check
            CHECK (validity_months IS NULL OR validity_months BETWEEN 1 AND 24);
    END IF;
END $$;

-- ค่าเริ่มต้น 3 เดือน (ธนาคาร/สถานทูตส่วนใหญ่รับหนังสือรับรองที่ออกไม่เกิน 1-3 เดือน)
UPDATE hrms.certificate_type SET validity_months = 3 WHERE validity_months IS NULL;

COMMIT;
