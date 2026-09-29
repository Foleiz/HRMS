-- ==============================================================================
-- ปรับปรุงการตั้งค่าการลา (ประเภทการลา / สิทธิ์การลา)
-- - เพิ่มหมวดแบบฟอร์มใบลา, ยกยอดสูงสุด (วัน), ยื่นย้อนหลังได้กี่วัน, วิธีคิดสิทธิ์พนักงานใหม่
-- - แก้ข้อมูลที่เคยบันทึกผิดจากฟอร์มเดิม
-- รันซ้ำได้ปลอดภัย (idempotent)
-- ==============================================================================
BEGIN;

-- 1) คอลัมน์ใหม่
ALTER TABLE hrms.leave_type   ADD COLUMN IF NOT EXISTS form_category          varchar(20)   NULL;
ALTER TABLE hrms.leave_policy ADD COLUMN IF NOT EXISTS carry_forward_max_days numeric(8,2) NULL;
ALTER TABLE hrms.leave_policy ADD COLUMN IF NOT EXISTS max_backdate_days      int4          NULL;
ALTER TABLE hrms.leave_policy ADD COLUMN IF NOT EXISTS proration_method       varchar(20)   NOT NULL DEFAULT 'FULL';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_leave_type_form_category') THEN
        ALTER TABLE hrms.leave_type ADD CONSTRAINT ck_leave_type_form_category
            CHECK (form_category IS NULL OR form_category IN ('SICK', 'PERSONAL', 'VACATION', 'SPECIAL'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_leave_policy_proration_method') THEN
        ALTER TABLE hrms.leave_policy ADD CONSTRAINT ck_leave_policy_proration_method
            CHECK (proration_method IN ('FULL', 'PRORATA_MONTHLY'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_leave_policy_backdate_nonneg') THEN
        ALTER TABLE hrms.leave_policy ADD CONSTRAINT ck_leave_policy_backdate_nonneg
            CHECK (max_backdate_days IS NULL OR max_backdate_days >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_leave_policy_carry_max_nonneg') THEN
        ALTER TABLE hrms.leave_policy ADD CONSTRAINT ck_leave_policy_carry_max_nonneg
            CHECK (carry_forward_max_days IS NULL OR carry_forward_max_days >= 0);
    END IF;
END $$;

-- 2) หมวดแบบฟอร์มของประเภทการลาเดิม (เดาจากรหัส/ชื่อ — แก้ไขภายหลังได้ในหน้าประเภทการลา)
UPDATE hrms.leave_type
SET form_category = CASE
        WHEN upper(leave_code) LIKE '%SICK%' OR leave_name LIKE '%ป่วย%' THEN 'SICK'
        WHEN upper(leave_code) LIKE '%PERSONAL%' OR upper(leave_code) LIKE '%BUSINESS%' OR leave_name LIKE '%กิจ%' THEN 'PERSONAL'
        WHEN upper(leave_code) LIKE '%ANNUAL%' OR upper(leave_code) LIKE '%VACATION%'
             OR leave_name LIKE '%พักร้อน%' OR leave_name LIKE '%พักผ่อน%' THEN 'VACATION'
        ELSE 'SPECIAL'
    END
WHERE form_category IS NULL;

-- 3) ฟอร์มเดิมเก็บ "ยกยอดสูงสุด (วัน)" ไว้ในคอลัมน์ carry_forward_max_months (ผิดหน่วย) → ย้ายไปคอลัมน์ใหม่
UPDATE hrms.leave_policy
SET carry_forward_max_days   = carry_forward_max_months,
    carry_forward_max_months = NULL
WHERE carry_forward_max_days IS NULL
  AND carry_forward_max_months IS NOT NULL;

-- 4) ฟอร์มเดิมบังคับ employee_type_id = 1 ทุกนโยบาย (ไม่มีช่องให้เลือก)
--    ทำให้พนักงานประเภทอื่นไม่ได้สิทธิ์ลา → เปลี่ยนเป็น "ทุกประเภทพนักงาน"
UPDATE hrms.leave_policy
SET employee_type_id = NULL
WHERE employee_type_id = 1;

-- 5) เดิมอาจมี unique (leave_type_id, employee_type_id) ซึ่งทำให้ตั้งสิทธิ์แยกตามระดับไม่ได้
--    ระบบตรวจนโยบายซ้ำในโค้ดแล้ว (ประเภทการลา + ประเภทพนักงาน + ระดับ + ช่วงวันที่มีผล)
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'hrms' AND t.relname = 'leave_policy' AND c.contype = 'u'
          AND NOT EXISTS (
              SELECT 1 FROM unnest(c.conkey) k
              JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k
              WHERE a.attname = 'employee_level_id')
    LOOP
        EXECUTE format('ALTER TABLE hrms.leave_policy DROP CONSTRAINT %I', r.conname);
        RAISE NOTICE 'dropped unique constraint %', r.conname;
    END LOOP;
END $$;

COMMIT;
