-- ============================================================================
-- พนักงานยื่นเบิกสวัสดิการเอง + สายการอนุมัติ (branch feat/benefit-claim-request)
-- ต้องรันก่อนใช้ backend เวอร์ชันนี้ (EF อ้างคอลัมน์ใหม่ของ employee_benefit_claim)
-- ============================================================================

BEGIN;

ALTER TABLE hrms.employee_benefit_claim
    ADD COLUMN IF NOT EXISTS request_no               varchar(30)  NULL,
    ADD COLUMN IF NOT EXISTS approval_instance_id     bigint       NULL,
    ADD COLUMN IF NOT EXISTS requested_by_employee_id bigint       NULL,
    ADD COLUMN IF NOT EXISTS approved_by_employee_id  bigint       NULL,
    ADD COLUMN IF NOT EXISTS reject_reason            text         NULL,
    ADD COLUMN IF NOT EXISTS completed_at             timestamptz  NULL,
    ADD COLUMN IF NOT EXISTS file_name                varchar(255) NULL,
    ADD COLUMN IF NOT EXISTS file_mime_type           varchar(100) NULL,
    ADD COLUMN IF NOT EXISTS file_size                bigint       NULL,
    ADD COLUMN IF NOT EXISTS file_data                bytea        NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_benefit_claim_approval_instance_fk') THEN
        ALTER TABLE hrms.employee_benefit_claim
            ADD CONSTRAINT employee_benefit_claim_approval_instance_fk
            FOREIGN KEY (approval_instance_id) REFERENCES hrms.approval_instance(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_benefit_claim_approved_by_employee_fk') THEN
        ALTER TABLE hrms.employee_benefit_claim
            ADD CONSTRAINT employee_benefit_claim_approved_by_employee_fk
            FOREIGN KEY (approved_by_employee_id) REFERENCES hrms.employee(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_employee_benefit_claim_status ON hrms.employee_benefit_claim (status);

COMMIT;

-- เพิ่มค่าใน enum ประเภทเอกสารของสายการอนุมัติ (ALTER TYPE ... ADD VALUE ต้องรันนอก transaction)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
               WHERE n.nspname = 'hrms' AND t.typname = 'approval_document_type_enum') THEN
        ALTER TYPE hrms.approval_document_type_enum ADD VALUE IF NOT EXISTS 'BENEFIT_CLAIM';
    END IF;
END $$;
