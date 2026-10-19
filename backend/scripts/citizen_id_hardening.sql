-- ============================================================================
-- เข้ารหัสเลขบัตรประชาชน (branch security/citizen-id-encryption)
-- รันก่อนเปิด backend เวอร์ชันนี้ · รันซ้ำได้ (idempotent)
--  1) view v_employee_full เลิกเปิดเผยเลขบัตรเต็ม (เหลือ citizen_id_masked)
--  2) ขยาย citizen_id เป็น varchar(255) เพื่อเก็บค่าที่เข้ารหัส "enc:v1:..."
--     (backend จะเข้ารหัสข้อมูลเดิมให้เองตอนเปิดระบบ — CitizenIdProtectionBackfill)
--  3) ล้างเลขบัตรเต็มที่เคยถูกบันทึกไว้ใน audit_log (แทนด้วย 4 ตัวท้าย)
-- ============================================================================
BEGIN;

-- 1) view: เอาคอลัมน์ citizen_id ออก (ต้อง drop ก่อนเปลี่ยนชนิดคอลัมน์)
DROP VIEW IF EXISTS hrms.v_employee_full;
CREATE VIEW hrms.v_employee_full AS
SELECT e.id,
       e.employee_code,
       e.prefix,
       e.first_name,
       e.last_name,
       e.citizen_id_masked,
       e.is_top_level,
       e.birth_date,
       e.gender_id,
       COALESCE(gt.gender_name, e.gender) AS gender_name,
       e.nationality_id,
       COALESCE(n.nationality_name, e.nationality) AS nationality_name,
       e.religion_id,
       COALESCE(r.religion_name, e.religion) AS religion_name,
       e.marital_status_id,
       COALESCE(mst.marital_status_name, e.marital_status) AS marital_status_name,
       e.military_status,
       e.spouse_has_income,
       e.number_of_children,
       e.parent_deduction_count,
       e.disability_deduction_count,
       e.created_at,
       e.updated_at
FROM hrms.employee e
LEFT JOIN hrms.gender_type gt ON e.gender_id = gt.id
LEFT JOIN hrms.nationality n ON e.nationality_id = n.id
LEFT JOIN hrms.religion r ON e.religion_id = r.id
LEFT JOIN hrms.marital_status_type mst ON e.marital_status_id = mst.id;

-- 2) ขยายคอลัมน์
ALTER TABLE hrms.employee      ALTER COLUMN citizen_id TYPE varchar(255);
ALTER TABLE hrms.family_member ALTER COLUMN citizen_id TYPE varchar(255);

-- 3) audit_log: เลขบัตรเต็ม → xxxxxxxxx1234, ค่าเข้ารหัส → [REDACTED]
CREATE OR REPLACE FUNCTION pg_temp.mask_cid(v jsonb) RETURNS jsonb LANGUAGE sql AS $$
    SELECT CASE
        WHEN v IS NULL OR jsonb_typeof(v) <> 'string' THEN v
        WHEN length(regexp_replace(v #>> '{}', '\D', '', 'g')) > 4
            THEN to_jsonb(repeat('x', length(regexp_replace(v #>> '{}', '\D', '', 'g')) - 4)
                          || right(regexp_replace(v #>> '{}', '\D', '', 'g'), 4))
        ELSE to_jsonb('xxxx'::text)
    END
$$;

UPDATE hrms.audit_log
SET old_value = CASE WHEN old_value ? 'CitizenId' THEN jsonb_set(old_value, '{CitizenId}', pg_temp.mask_cid(old_value -> 'CitizenId')) ELSE old_value END,
    new_value = CASE WHEN new_value ? 'CitizenId' THEN jsonb_set(new_value, '{CitizenId}', pg_temp.mask_cid(new_value -> 'CitizenId')) ELSE new_value END
WHERE (old_value ? 'CitizenId' AND (old_value ->> 'CitizenId') !~ '^x+[0-9]{0,4}$')
   OR (new_value ? 'CitizenId' AND (new_value ->> 'CitizenId') !~ '^x+[0-9]{0,4}$');

UPDATE hrms.audit_log
SET old_value = CASE WHEN old_value ? 'CitizenIdEncrypted' THEN jsonb_set(old_value, '{CitizenIdEncrypted}', '"[REDACTED]"') ELSE old_value END,
    new_value = CASE WHEN new_value ? 'CitizenIdEncrypted' THEN jsonb_set(new_value, '{CitizenIdEncrypted}', '"[REDACTED]"') ELSE new_value END
WHERE old_value ? 'CitizenIdEncrypted' OR new_value ? 'CitizenIdEncrypted';

COMMIT;
