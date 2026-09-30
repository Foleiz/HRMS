-- ==============================================================================
-- สายการอนุมัติแบบอ้างอิงผู้ยื่น (ใช้สายเดียวได้ทุกแผนก)
-- approver_scope : ขอบเขตผู้อนุมัติแบบ ROLE — ORG / DIVISION / DEPARTMENT
-- fallback_action: ถ้าหาผู้อนุมัติไม่เจอ — HR / SKIP / ESCALATE / WAIT
-- ขั้นเดิมทั้งหมดได้ ORG + HR (ทำงานเหมือนเดิม แต่ไม่ค้างถ้าหาผู้อนุมัติไม่เจอ)
-- รันซ้ำได้ปลอดภัย (idempotent)
-- ==============================================================================
BEGIN;

ALTER TABLE hrms.approval_step ADD COLUMN IF NOT EXISTS approver_scope varchar(20) NOT NULL DEFAULT 'ORG';
ALTER TABLE hrms.approval_step ADD COLUMN IF NOT EXISTS fallback_action varchar(20) NOT NULL DEFAULT 'HR';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_step_approver_scope_check') THEN
        ALTER TABLE hrms.approval_step ADD CONSTRAINT approval_step_approver_scope_check
            CHECK (approver_scope IN ('ORG', 'DIVISION', 'DEPARTMENT'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_step_fallback_action_check') THEN
        ALTER TABLE hrms.approval_step ADD CONSTRAINT approval_step_fallback_action_check
            CHECK (fallback_action IN ('HR', 'SKIP', 'ESCALATE', 'WAIT'));
    END IF;
END $$;

COMMIT;
