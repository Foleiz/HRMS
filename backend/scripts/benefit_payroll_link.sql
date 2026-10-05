-- ============================================================================
-- ผูกสวัสดิการกับรายการได้-หัก + คำขอเบิกสรุปพร้อมเงินเดือน (branch feat/benefit-payroll-link)
-- ต้องรันก่อนใช้ backend เวอร์ชันนี้ · รันซ้ำได้ (idempotent)
-- รอบเงินเดือนและสลิปที่มีอยู่แล้วไม่ถูกแก้
-- ============================================================================

BEGIN;

-- 1) สวัสดิการ → รายการได้-หักที่ใช้จ่าย
ALTER TABLE hrms.benefit_item
    ADD COLUMN IF NOT EXISTS payroll_item_id bigint NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'benefit_item_payroll_item_fk') THEN
        ALTER TABLE hrms.benefit_item
            ADD CONSTRAINT benefit_item_payroll_item_fk
            FOREIGN KEY (payroll_item_id) REFERENCES hrms.payroll_item(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2) คำขอเบิก → สถานะการจ่าย / รอบเงินเดือนที่จ่าย
ALTER TABLE hrms.employee_benefit_claim
    ADD COLUMN IF NOT EXISTS payment_status    varchar(20) NULL,
    ADD COLUMN IF NOT EXISTS payroll_period_id bigint      NULL,
    ADD COLUMN IF NOT EXISTS paid_at           timestamptz NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_benefit_claim_payroll_period_fk') THEN
        ALTER TABLE hrms.employee_benefit_claim
            ADD CONSTRAINT employee_benefit_claim_payroll_period_fk
            FOREIGN KEY (payroll_period_id) REFERENCES hrms.payroll_period(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_employee_benefit_claim_payment ON hrms.employee_benefit_claim (payment_status, payroll_period_id);

-- คำขอที่อนุมัติไปก่อนหน้านี้ถือว่าจ่ายนอกระบบไปแล้ว (ไม่ดึงเข้าเงินเดือนย้อนหลัง)
UPDATE hrms.employee_benefit_claim
SET payment_status = 'PAID', paid_at = COALESCE(approved_at, now())
WHERE status = 'APPROVED' AND payment_status IS NULL;

-- 3) ผูกสวัสดิการกับรหัส BEN_<รหัสสวัสดิการ> ที่ระบบเคยสร้างไว้ + ให้เป็นแบบ "กรอกเอง" (ยอดมาจากสวัสดิการ)
UPDATE hrms.benefit_item b
SET payroll_item_id = p.id
FROM hrms.payroll_item p
WHERE b.payroll_item_id IS NULL AND p.item_code = 'BEN_' || upper(b.benefit_code);

UPDATE hrms.payroll_item
SET calculation_type = 'MANUAL'
WHERE item_code LIKE 'BEN\_%' AND formula_template IS NULL AND calculation_type <> 'MANUAL';

-- 4) รายได้แบบ "ยอดคงที่จ่ายทุกคน" → แปลงเป็นสวัสดิการเบี้ยเลี้ยงที่ให้ทุกประเภทพนักงานเท่าเดิม
--    (ผลการจ่ายเท่าเดิม แต่จากนี้ HR เลือกได้ว่าประเภทไหนได้เท่าไหร่)
CREATE TEMP TABLE fixed_earning ON COMMIT DROP AS
SELECT p.id, p.item_code, p.item_name,
       COALESCE(NULLIF(substring(replace(p.formula_value, ',', '') from '[0-9]+(?:\.[0-9]+)?'), '')::numeric, 0) AS amount
FROM hrms.payroll_item p
WHERE p.item_type = 'EARNING' AND p.calculation_type = 'FIXED' AND p.status = 'ACTIVE'
  AND NOT EXISTS (SELECT 1 FROM hrms.benefit_item b WHERE b.payroll_item_id = p.id);

INSERT INTO hrms.benefit_item (benefit_code, benefit_name, category, description, is_statutory,
                               default_coverage_amount, default_frequency, payout_type, status, payroll_item_id)
SELECT 'PI_' || f.item_code, f.item_name, 'ALLOWANCE',
       'ย้ายมาจากรายการรายได้แบบยอดคงที่ ' || f.item_code, false,
       f.amount, 'MONTHLY', 'PAYROLL', 'ACTIVE', f.id
FROM fixed_earning f
WHERE NOT EXISTS (SELECT 1 FROM hrms.benefit_item b WHERE b.benefit_code = 'PI_' || f.item_code);

INSERT INTO hrms.employee_type_benefit (employee_type_id, benefit_item_id, coverage_amount, frequency, is_active)
SELECT t.id, b.id, f.amount, 'MONTHLY', true
FROM fixed_earning f
JOIN hrms.benefit_item b ON b.payroll_item_id = f.id
CROSS JOIN hrms.employee_type t
WHERE t.status = 'ACTIVE'
  AND NOT EXISTS (SELECT 1 FROM hrms.employee_type_benefit x
                  WHERE x.employee_type_id = t.id AND x.benefit_item_id = b.id);

UPDATE hrms.payroll_item p
SET calculation_type = 'MANUAL'
FROM fixed_earning f
WHERE p.id = f.id;

-- รายการที่ถูกแปลง (ตรวจดูว่าตรงกับที่ตั้งใจไหม)
SELECT f.item_code AS "รหัสรายได้เดิม", f.item_name AS "ชื่อ", f.amount AS "ยอดต่อเดือน",
       'PI_' || f.item_code AS "รหัสสวัสดิการใหม่"
FROM fixed_earning f;

COMMIT;
