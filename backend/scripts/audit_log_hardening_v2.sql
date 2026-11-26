-- =============================================================================
-- HRMS Audit Log Security Hardening v2 (Enterprise & PDPA Compliance)
-- แก้ไขความเสี่ยงทั้ง 6 ด้านแบบ Idempotent (รันซ้ำได้อย่างปลอดภัย 100%)
-- 1. Actor Snapshot + Soft Delete ผู้ใช้ + FK ON DELETE RESTRICT
-- 2. รองรับ Action VIEW / DOWNLOAD / EXPORT / LOGIN_FAILED พร้อม Metadata
-- 3. Append-Only Immutability Trigger บล็อก UPDATE / DELETE บน hrms.audit_log
-- 4. ย้ายข้อมูลโครงสร้างเข้าคอลัมน์ metadata jsonb และขยาย changed_column_name
-- 5. เพิ่ม subject_employee_id + Snapshot + Composite Index ตอนเขียน (Write-time)
-- =============================================================================

-- 1) เพิ่มคอลัมน์ Soft Delete บน hrms.user_account และอัปเดต CHECK constraint ของ status
ALTER TABLE hrms.user_account ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

DO $$
DECLARE
    chk_rec record;
BEGIN
    FOR chk_rec IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'hrms'
          AND t.relname = 'user_account'
          AND c.contype = 'c'
          AND a.attname = 'status'
          AND pg_get_constraintdef(c.oid) NOT LIKE '%DELETED%'
    LOOP
        EXECUTE format('ALTER TABLE hrms.user_account DROP CONSTRAINT %I', chk_rec.conname);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'hrms'
          AND t.relname = 'user_account'
          AND c.conname = 'chk_user_account_status_v2'
    ) THEN
        ALTER TABLE hrms.user_account
            ADD CONSTRAINT chk_user_account_status_v2
            CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED', 'DELETED'));
    END IF;
END $$;

-- 2) ขยายคอลัมน์ตาราง hrms.audit_log
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS actor_type varchar(20) NOT NULL DEFAULT 'USER';
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS actor_username varchar(100) NULL;
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS actor_name varchar(255) NULL;
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS actor_role varchar(255) NULL;
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS metadata jsonb NULL;
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS subject_employee_id bigint NULL REFERENCES hrms.employee(id) ON DELETE SET NULL;
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS subject_employee_code varchar(50) NULL;
ALTER TABLE hrms.audit_log ADD COLUMN IF NOT EXISTS subject_employee_name varchar(255) NULL;
ALTER TABLE hrms.audit_log ALTER COLUMN changed_column_name TYPE varchar(500);

-- 3) อัปเดต CHECK constraint ของ audit_action ให้รองรับ VIEW, DOWNLOAD, LOGIN_FAILED, CLEANUP
DO $$
DECLARE
    chk_rec record;
BEGIN
    FOR chk_rec IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'hrms'
          AND t.relname = 'audit_log'
          AND c.contype = 'c'
          AND a.attname = 'audit_action'
          AND (pg_get_constraintdef(c.oid) NOT LIKE '%VIEW%' OR pg_get_constraintdef(c.oid) NOT LIKE '%DOWNLOAD%' OR pg_get_constraintdef(c.oid) NOT LIKE '%LOGIN_FAILED%')
    LOOP
        EXECUTE format('ALTER TABLE hrms.audit_log DROP CONSTRAINT %I', chk_rec.conname);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'hrms'
          AND t.relname = 'audit_log'
          AND c.conname = 'chk_audit_log_action_v2'
    ) THEN
        ALTER TABLE hrms.audit_log
            ADD CONSTRAINT chk_audit_log_action_v2
            CHECK (audit_action IN ('INSERT', 'UPDATE', 'DELETE', 'VIEW', 'DOWNLOAD', 'EXPORT', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'APPROVE', 'REJECT', 'CLEANUP'));
    END IF;
END $$;

-- 4) สร้างฟังก์ชันป้องกันการแก้ไข/ลบข้อมูลใน hrms.audit_log (Append-Only Immutability)
CREATE OR REPLACE FUNCTION hrms.fn_protect_audit_log_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- อนุญาตเฉพาะงาน Retention / Migration ที่เปิด session flag เฉพาะกิจใน transaction เท่านั้น
    IF current_setting('hrms.allow_audit_maintenance', true) = 'on' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Audit log is immutable: % operation on hrms.audit_log is prohibited.', TG_OP
        USING ERRCODE = '42501';
END;
$$;

-- 5) Backfill ข้อมูลเก่าให้มี Actor Snapshot & Subject Employee และเปลี่ยน FK user_id เป็น ON DELETE RESTRICT
DO $$
DECLARE
    fk_rec record;
BEGIN
    PERFORM set_config('hrms.allow_audit_maintenance', 'on', true);

    -- แปลงแถว LOGIN ที่ล้มเหลวเดิมให้เป็น LOGIN_FAILED เพื่อความแม่นยำ
    UPDATE hrms.audit_log
    SET audit_action = 'LOGIN_FAILED'
    WHERE audit_action = 'LOGIN'
      AND changed_column_name = 'เข้าสู่ระบบไม่สำเร็จ';

    -- เติม Actor Snapshot ให้แถวเดิมที่มี user_id
    UPDATE hrms.audit_log al
    SET actor_type = 'USER',
        actor_username = u.username,
        actor_name = COALESCE(NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), ''), u.username),
        actor_role = r_agg.roles
    FROM hrms.user_account u
    LEFT JOIN hrms.employee e ON e.id = u.employee_id
    LEFT JOIN LATERAL (
        SELECT string_agg(r.role_code, ', ' ORDER BY r.role_code) AS roles
        FROM hrms.user_role ur
        JOIN hrms.role r ON r.id = ur.role_id
        WHERE ur.user_id = u.id
    ) r_agg ON true
    WHERE al.user_id = u.id
      AND al.actor_username IS NULL;

    -- แถวเดิมที่ไม่มี user_id ให้ระบุเป็น SYSTEM
    UPDATE hrms.audit_log
    SET actor_type = 'SYSTEM',
        actor_username = 'SYSTEM',
        actor_name = 'ระบบอัตโนมัติ'
    WHERE user_id IS NULL
      AND actor_username IS NULL;

    -- เติม Subject Employee ย้อนหลังสำหรับตาราง employee
    UPDATE hrms.audit_log al
    SET subject_employee_id = e.id,
        subject_employee_code = e.employee_code,
        subject_employee_name = TRIM(CONCAT(e.first_name, ' ', e.last_name))
    FROM hrms.employee e
    WHERE LOWER(al.target_table_name) = 'employee'
      AND al.target_record_id = e.id
      AND al.subject_employee_id IS NULL;

    -- เติม Subject Employee ย้อนหลังจาก JSON ที่มี EmployeeId
    UPDATE hrms.audit_log al
    SET subject_employee_id = e.id,
        subject_employee_code = e.employee_code,
        subject_employee_name = TRIM(CONCAT(e.first_name, ' ', e.last_name))
    FROM hrms.employee e
    WHERE al.subject_employee_id IS NULL
      AND COALESCE(
            CASE WHEN jsonb_typeof(al.new_value) = 'object' AND (al.new_value->>'EmployeeId') ~ '^\d+$' THEN (al.new_value->>'EmployeeId')::bigint END,
            CASE WHEN jsonb_typeof(al.old_value) = 'object' AND (al.old_value->>'EmployeeId') ~ '^\d+$' THEN (al.old_value->>'EmployeeId')::bigint END
          ) = e.id;

    -- เปลี่ยน Foreign Key user_id จาก ON DELETE SET NULL เป็น ON DELETE RESTRICT
    FOR fk_rec IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'hrms'
          AND t.relname = 'audit_log'
          AND c.contype = 'f'
          AND a.attname = 'user_id'
          AND c.confdeltype <> 'r'
    LOOP
        EXECUTE format('ALTER TABLE hrms.audit_log DROP CONSTRAINT %I', fk_rec.conname);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'hrms'
          AND t.relname = 'audit_log'
          AND c.contype = 'f'
          AND a.attname = 'user_id'
    ) THEN
        UPDATE hrms.audit_log al
        SET user_id = NULL
        WHERE user_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM hrms.user_account u WHERE u.id = al.user_id);

        ALTER TABLE hrms.audit_log
            ADD CONSTRAINT fk_audit_log_user_account
            FOREIGN KEY (user_id) REFERENCES hrms.user_account(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 6) เปิดใช้งาน Trigger ล็อกการแก้ไขและลบตาราง hrms.audit_log
DROP TRIGGER IF EXISTS trg_protect_audit_log_immutability ON hrms.audit_log;
CREATE TRIGGER trg_protect_audit_log_immutability
BEFORE UPDATE OR DELETE ON hrms.audit_log
FOR EACH ROW EXECUTE FUNCTION hrms.fn_protect_audit_log_immutability();

-- 7) สร้าง Composite Indexes สำหรับสืบค้นด้วยความเร็วสูง
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_desc ON hrms.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_subject_emp_created ON hrms.audit_log (subject_employee_id, created_at DESC) WHERE subject_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created ON hrms.audit_log (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_action_created ON hrms.audit_log (audit_action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON hrms.audit_log (target_table_name, target_record_id);

-- หมายเหตุสำหรับ Production Deployment ที่แยก DB Role:
-- REVOKE UPDATE, DELETE, TRUNCATE ON hrms.audit_log FROM hrms_app_role;
-- GRANT SELECT, INSERT ON hrms.audit_log TO hrms_app_role;
