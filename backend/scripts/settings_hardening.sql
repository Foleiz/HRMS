-- ============================================================================
-- ปรับปรุงส่วนตั้งค่าระบบ (branch feat/settings-hardening) · รันซ้ำได้
-- 1) ตำแหน่ง: อัตรากำลัง (headcount_plan)
-- 2) ยุบตารางกะซ้ำ: work_schedule ไม่ถูกใช้แล้ว (ใช้ shift อย่างเดียว)
--    ลบคอลัมน์/ตารางเฉพาะเมื่อไม่มีข้อมูลอ้างอิงจริง ถ้ามีข้อมูลจะข้ามและแจ้งเตือน
-- ============================================================================
BEGIN;

ALTER TABLE hrms.position ADD COLUMN IF NOT EXISTS headcount_plan int NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'position_headcount_plan_chk') THEN
        ALTER TABLE hrms.position ADD CONSTRAINT position_headcount_plan_chk CHECK (headcount_plan IS NULL OR headcount_plan >= 0);
    END IF;
END $$;

DO $$
DECLARE
    used_assign int := 0;
    used_daily int := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hrms' AND table_name = 'employee_assignment' AND column_name = 'work_schedule_id') THEN
        EXECUTE 'SELECT count(*) FROM hrms.employee_assignment WHERE work_schedule_id IS NOT NULL' INTO used_assign;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'hrms' AND table_name = 'attendance_daily' AND column_name = 'work_schedule_id') THEN
        EXECUTE 'SELECT count(*) FROM hrms.attendance_daily WHERE work_schedule_id IS NOT NULL' INTO used_daily;
    END IF;

    IF used_assign = 0 AND used_daily = 0 THEN
        ALTER TABLE hrms.employee_assignment DROP COLUMN IF EXISTS work_schedule_id;
        ALTER TABLE hrms.attendance_daily DROP COLUMN IF EXISTS work_schedule_id;
        DROP TABLE IF EXISTS hrms.work_schedule;
        RAISE NOTICE 'ลบตาราง work_schedule และคอลัมน์ work_schedule_id แล้ว';
    ELSE
        RAISE WARNING 'ยังมีข้อมูลอ้างอิง work_schedule (assignment=%, attendance_daily=%) — ไม่ได้ลบ ระบบเลิกใช้คอลัมน์นี้แล้ว', used_assign, used_daily;
    END IF;
END $$;

COMMIT;
