-- ==============================================================================
-- แจ้งเตือนรอบ 1: สิ้นสุดทดลองงาน / สัญญาจ้างใกล้หมดอายุ / เตือนรายการค้างอนุมัติ
-- เพิ่มคอลัมน์กันแจ้งซ้ำ — รันซ้ำได้ปลอดภัย (idempotent)
-- ==============================================================================
BEGIN;

ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS probation_notified_at timestamptz NULL;
ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz NULL;
ALTER TABLE hrms.approval_instance ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz NULL;

COMMIT;
