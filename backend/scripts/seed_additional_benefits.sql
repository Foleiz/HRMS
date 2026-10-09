-- ============================================================================
-- Seed Additional Standard Company Benefits
-- เพิ่มรายการสวัสดิการมาตรฐานบริษัท (ค่าเดินทาง, เบี้ยขยัน, ค่าโทรศัพท์, ฟิตเนส, ประกันชีวิต, อบรม)
-- ============================================================================

BEGIN;

INSERT INTO hrms.benefit_item (
    benefit_code,
    benefit_name,
    category,
    description,
    is_statutory,
    default_coverage_amount,
    default_frequency,
    payout_type,
    is_document_required,
    payroll_item_id,
    status,
    created_at,
    updated_at
)
VALUES 
(
    'TRAVEL_ALLOWANCE',
    'ค่าเดินทาง / ค่ายานพาหนะ',
    'ALLOWANCE',
    'เบิกจ่ายค่าเดินทางหรือเบี้ยเลี้ยงการเดินทางตามระเบียบบริษัท',
    false,
    1500.00,
    'MONTHLY',
    'PAYROLL',
    true,
    (SELECT id FROM hrms.payroll_item WHERE item_code = 'INC_REIMBURSE' LIMIT 1),
    'ACTIVE',
    now(),
    now()
),
(
    'DILIGENCE_ALLOWANCE',
    'เบี้ยขยันประจำเดือน',
    'ALLOWANCE',
    'เบี้ยขยันกรณีไม่ขาด ลา มาสายตามเกณฑ์ระเบียบบริษัท',
    false,
    1000.00,
    'MONTHLY',
    'PAYROLL',
    false,
    (SELECT id FROM hrms.payroll_item WHERE item_code = 'INC_DILIGENCE' LIMIT 1),
    'ACTIVE',
    now(),
    now()
),
(
    'PHONE_ALLOWANCE',
    'ค่าโทรศัพท์และอินเทอร์เน็ต',
    'ALLOWANCE',
    'เงินช่วยเหลือค่าโทรศัพท์และค่าสื่อสารเพื่อการทำงาน',
    false,
    500.00,
    'MONTHLY',
    'PAYROLL',
    false,
    NULL,
    'ACTIVE',
    now(),
    now()
),
(
    'FITNESS',
    'สวัสดิการฟิตเนสและสุขภาพกาย',
    'WELLNESS',
    'เบิกจ่ายค่าสมาชิกฟิตเนส สนามกีฬา หรือกิจกรรมเพื่อสุขภาพ',
    false,
    1500.00,
    'YEARLY',
    'REIMBURSEMENT',
    true,
    NULL,
    'ACTIVE',
    now(),
    now()
),
(
    'LIFE_INS',
    'ประกันชีวิตและอุบัติเหตุกลุ่ม',
    'HEALTH',
    'วงเงินคุ้มครองประกันชีวิตและอุบัติเหตุกลุ่มสำหรับพนักงาน',
    false,
    100000.00,
    'YEARLY',
    'DIRECT',
    false,
    NULL,
    'ACTIVE',
    now(),
    now()
),
(
    'TRAINING',
    'ทุนฝึกอบรมและพัฒนาทักษะ',
    'OTHER',
    'ทุนสนับสนุนการอบรม สัมมนา และสอบใบรับรองวิชาชีพ',
    false,
    5000.00,
    'YEARLY',
    'REIMBURSEMENT',
    true,
    NULL,
    'ACTIVE',
    now(),
    now()
)
ON CONFLICT (benefit_code) DO NOTHING;

-- ผูกสวัสดิการใหม่เข้ากับประเภทพนักงานประจำ (PERM)
INSERT INTO hrms.employee_type_benefit (employee_type_id, benefit_item_id, coverage_amount, frequency, is_active, created_at)
SELECT t.id, b.id, b.default_coverage_amount, b.default_frequency, true, now()
FROM hrms.employee_type t
CROSS JOIN hrms.benefit_item b
WHERE t.type_code = 'PERM'
  AND b.benefit_code IN ('TRAVEL_ALLOWANCE', 'DILIGENCE_ALLOWANCE', 'PHONE_ALLOWANCE', 'FITNESS', 'LIFE_INS', 'TRAINING')
  AND NOT EXISTS (
      SELECT 1 FROM hrms.employee_type_benefit x 
      WHERE x.employee_type_id = t.id AND x.benefit_item_id = b.id
  );

COMMIT;
