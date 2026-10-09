-- ==============================================================================
-- เพิ่มคอลัมน์แนบไฟล์เอกสารสัญญาจ้างงานใน hrms.employment_contract
-- รองรับการแนบเอกสารสัญญาจ้างงานรายคน, ดาวน์โหลด และดูเอกสาร
-- รันซ้ำได้ปลอดภัย (idempotent)
-- ==============================================================================
BEGIN;

ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_name varchar(255) NULL;
ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_data bytea NULL;
ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_mime_type varchar(100) NULL;
ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_file_size bigint NULL;
ALTER TABLE hrms.employment_contract ADD COLUMN IF NOT EXISTS document_uploaded_at timestamptz NULL;

COMMIT;
