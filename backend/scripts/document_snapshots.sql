-- เอกสารที่อนุมัติแล้วไม่เปลี่ยนตามข้อมูลภายหลัง (โลโก้ ตราประทับ ลายเซ็น ตำแหน่ง เนื้อหาหนังสือรับรอง)
-- idempotent: รันซ้ำได้

-- 1) ลายเซ็น: ไม่เขียนทับ เก็บประวัติ + เวลาที่เลิกใช้
ALTER TABLE hrms.employee_signature ADD COLUMN IF NOT EXISTS deactivated_at timestamptz NULL;

-- 2) ข้อมูลบริษัทบนเอกสาร: เก็บประวัติทุกครั้งที่แก้
CREATE TABLE IF NOT EXISTS hrms.company_profile_history (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id bigint NOT NULL REFERENCES hrms.company(id) ON DELETE CASCADE,
    company_name varchar(255) NOT NULL,
    address text NULL,
    phone varchar(50) NULL,
    email varchar(255) NULL,
    logo_data bytea NULL,
    seal_data bytea NULL,
    valid_from timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_profile_history_company_valid
    ON hrms.company_profile_history (company_id, valid_from DESC);

-- ชุดตั้งต้น = ข้อมูลปัจจุบัน ใช้กับเอกสารทั้งหมดก่อนเริ่มเก็บประวัติ
INSERT INTO hrms.company_profile_history (company_id, company_name, address, phone, email, logo_data, seal_data, valid_from)
SELECT c.id, c.company_name, c.address, c.phone, c.email, c.logo_data, c.seal_data, '1900-01-01T00:00:00Z'
FROM hrms.company c
WHERE NOT EXISTS (SELECT 1 FROM hrms.company_profile_history h WHERE h.company_id = c.id);

-- 3) ชื่อและตำแหน่งผู้อนุมัติ ณ เวลาที่กดอนุมัติ
ALTER TABLE hrms.approval_action ADD COLUMN IF NOT EXISTS approver_name varchar(255) NULL;
ALTER TABLE hrms.approval_action ADD COLUMN IF NOT EXISTS approver_position_name varchar(255) NULL;

-- 4) หนังสือรับรองฉบับตรึง (JSON) ณ วันที่อนุมัติ
ALTER TABLE hrms.certificate_request ADD COLUMN IF NOT EXISTS document_snapshot text NULL;
