-- ============================================================================
-- อัปเดตประเภทพนักงานตามสัญญาจ้างอัตโนมัติ (branch feat/employee-type-sync)
-- ต้องรันก่อนใช้ backend เวอร์ชันนี้ (EF อ้างคอลัมน์ employee_type_applied_at)
-- ============================================================================

ALTER TABLE hrms.employment_contract
    ADD COLUMN IF NOT EXISTS employee_type_applied_at timestamptz NULL;

COMMENT ON COLUMN hrms.employment_contract.employee_type_applied_at
    IS 'เวลาที่นำประเภทพนักงานของสัญญานี้ไปอัปเดตข้อมูลพนักงานแล้ว (NULL = ยังไม่ได้นำไปใช้)';

-- สัญญาเดิมที่เริ่มแล้วทั้งหมด: ถือว่านำไปใช้แล้ว เพื่อไม่ให้ระบบไปเปลี่ยนประเภทพนักงานเดิมย้อนหลัง
-- (สัญญาที่ลงวันเริ่มล่วงหน้าจะยังเป็น NULL และถูกอัปเดตเมื่อถึงวันเริ่ม)
UPDATE hrms.employment_contract
SET employee_type_applied_at = now()
WHERE employee_type_applied_at IS NULL
  AND start_date <= CURRENT_DATE;
