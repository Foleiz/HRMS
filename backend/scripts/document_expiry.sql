-- ==============================================================================
-- แจ้งเตือนเอกสารใกล้หมดอายุ (ขอบเขต: การอนุมัติและการแจ้งเตือน)
-- 1) ตั้งค่าต่อประเภทเอกสาร: แจ้งเตือนล่วงหน้า (วัน) / อายุเอกสาร (เดือน)
-- 2) บันทึกว่าแจ้งเตือนเอกสารแต่ละใบไปแล้ว (กันแจ้งซ้ำ)
-- 3) ล้างวันหมดอายุที่ฟอร์มเดิมเติมให้อัตโนมัติ (+1 ปี) กับเอกสารที่ไม่ต้องมีวันหมดอายุ
-- รันซ้ำได้ปลอดภัย (idempotent) — ต้องรัน general_request.sql และ employee_document.sql ก่อน
-- ==============================================================================
BEGIN;

ALTER TABLE hrms.document_type ADD COLUMN IF NOT EXISTS notify_before_days integer NOT NULL DEFAULT 30;
ALTER TABLE hrms.document_type ADD COLUMN IF NOT EXISTS validity_months integer NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_type_notify_before_days_check') THEN
        ALTER TABLE hrms.document_type ADD CONSTRAINT document_type_notify_before_days_check
            CHECK (notify_before_days BETWEEN 1 AND 365);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_type_validity_months_check') THEN
        ALTER TABLE hrms.document_type ADD CONSTRAINT document_type_validity_months_check
            CHECK (validity_months IS NULL OR validity_months BETWEEN 1 AND 600);
    END IF;
END $$;

ALTER TABLE hrms.employee_document ADD COLUMN IF NOT EXISTS expiry_warning_notified_at timestamptz NULL;
ALTER TABLE hrms.employee_document ADD COLUMN IF NOT EXISTS expired_notified_at timestamptz NULL;

-- ค่าเริ่มต้นที่เหมาะสม: บัตรประชาชนแจ้งล่วงหน้า 60 วัน (ต้องใช้เวลาไปทำบัตรใหม่)
UPDATE hrms.document_type SET notify_before_days = 60
WHERE document_code = 'DOC_ID_CARD' AND notify_before_days = 30;

-- ล้างวันหมดอายุที่ถูกเติมอัตโนมัติ (+1 ปีจากวันที่ออก) ในเอกสารประเภทที่ไม่ต้องมีวันหมดอายุ
UPDATE hrms.employee_document e
SET expiry_date = NULL
FROM hrms.document_type t
WHERE t.id = e.document_type_id
  AND t.is_expiry_required = false
  AND e.source_general_request_id IS NOT NULL
  AND e.issued_date IS NOT NULL
  AND e.expiry_date = (e.issued_date + INTERVAL '1 year')::date;

UPDATE hrms.general_request g
SET expiry_date = NULL
WHERE g.issue_date IS NOT NULL
  AND g.expiry_date = (g.issue_date + INTERVAL '1 year')::date
  AND (g.document_type_id IS NULL
       OR EXISTS (SELECT 1 FROM hrms.document_type t
                  WHERE t.id = g.document_type_id AND t.is_expiry_required = false));

COMMIT;
