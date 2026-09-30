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

-- ผู้อนุมัติแทนรายขั้น (ไม่บังคับ)
ALTER TABLE hrms.approval_step ADD COLUMN IF NOT EXISTS delegate_type varchar(20) NULL;
ALTER TABLE hrms.approval_step ADD COLUMN IF NOT EXISTS delegate_employee_id bigint NULL;
ALTER TABLE hrms.approval_step ADD COLUMN IF NOT EXISTS delegate_role_id bigint NULL;
ALTER TABLE hrms.approval_step ADD COLUMN IF NOT EXISTS delegate_scope varchar(20) NOT NULL DEFAULT 'ORG';
ALTER TABLE hrms.approval_step ADD COLUMN IF NOT EXISTS delegate_mode varchar(20) NOT NULL DEFAULT 'WHEN_ABSENT';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_step_delegate_check') THEN
        ALTER TABLE hrms.approval_step ADD CONSTRAINT approval_step_delegate_check CHECK (
            (delegate_type IS NULL OR delegate_type IN ('EMPLOYEE', 'ROLE'))
            AND delegate_scope IN ('ORG', 'DIVISION', 'DEPARTMENT')
            AND delegate_mode IN ('WHEN_ABSENT', 'ALWAYS'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_step_delegate_employee_fkey') THEN
        ALTER TABLE hrms.approval_step ADD CONSTRAINT approval_step_delegate_employee_fkey
            FOREIGN KEY (delegate_employee_id) REFERENCES hrms.employee(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_step_delegate_role_fkey') THEN
        ALTER TABLE hrms.approval_step ADD CONSTRAINT approval_step_delegate_role_fkey
            FOREIGN KEY (delegate_role_id) REFERENCES hrms.role(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;
