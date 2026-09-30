-- ยกเลิกชุดนำเข้าเวลาแบบไม่ลบถาวร (สถานะ REVERTED + ผู้ยกเลิก/เวลา) — รันซ้ำได้
ALTER TABLE hrms.attendance_import_batch ADD COLUMN IF NOT EXISTS reverted_at timestamptz NULL;
ALTER TABLE hrms.attendance_import_batch ADD COLUMN IF NOT EXISTS reverted_by_user_id bigint NULL REFERENCES hrms.user_account(id) ON DELETE SET NULL;

ALTER TABLE hrms.attendance_import_batch DROP CONSTRAINT IF EXISTS attendance_import_batch_status_check;
ALTER TABLE hrms.attendance_import_batch ADD CONSTRAINT attendance_import_batch_status_check
    CHECK (status IN ('IMPORTED', 'PARTIAL', 'FAILED', 'REVERTED'));
