-- วันตัดรอบเงินเบิกสวัสดิการต่อรอบเงินเดือน (รันหลัง benefit_payroll_link.sql)
-- NULL = ใช้วันกำหนดจ่าย (payment_date) ถ้าไม่มีใช้วันสิ้นสุดรอบ (end_date)
-- รันซ้ำได้
ALTER TABLE hrms.payroll_period
    ADD COLUMN IF NOT EXISTS claim_cutoff_date date NULL;

COMMENT ON COLUMN hrms.payroll_period.claim_cutoff_date IS
    'วันตัดรอบเงินเบิกสวัสดิการ: คำขอที่อนุมัติไม่เกินวันนี้เข้ารอบนี้ (NULL = payment_date หรือ end_date)';
