-- ============================================================================
-- เลขบัตรประชาชน/ประกันสังคมแบบปิดบัง: เปลี่ยนรูปแบบเก่า (เปิดเผยตัวหน้า) ในประวัติ audit_log
-- คอลัมน์ในตารางหลัก (citizen_id_masked, social_security_no_masked) backend ปรับให้เองตอนเปิดระบบ
-- รูปแบบเก่า 1-2345-xxxxx-xx-6  → x-xxxx-xxxxx-xx-6   (ข้อมูลเก่ารู้แค่ตัวสุดท้าย)
-- รูปแบบเก่า 12*****34          → xx*****34 → xxxxxxx34
-- รันซ้ำได้
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.remask(v jsonb) RETURNS jsonb LANGUAGE sql AS $$
    SELECT CASE
        WHEN v IS NULL OR jsonb_typeof(v) <> 'string' THEN v
        WHEN (v #>> '{}') ~ '^[0-9]-[0-9]{4}-x{5}-xx-[0-9]$'
            THEN to_jsonb('x-xxxx-xxxxx-xx-' || right(v #>> '{}', 1))
        WHEN (v #>> '{}') ~ '^[0-9]{2}\*+[0-9]{2}$'
            THEN to_jsonb(repeat('x', length(v #>> '{}') - 2) || right(v #>> '{}', 2))
        ELSE v
    END
$$;

UPDATE hrms.audit_log
SET old_value = CASE WHEN jsonb_typeof(old_value) = 'object' THEN
        (SELECT jsonb_object_agg(k, CASE WHEN k IN ('CitizenIdMasked', 'SocialSecurityNoMasked') THEN pg_temp.remask(val) ELSE val END)
         FROM jsonb_each(old_value) AS e(k, val))
        ELSE old_value END,
    new_value = CASE WHEN jsonb_typeof(new_value) = 'object' THEN
        (SELECT jsonb_object_agg(k, CASE WHEN k IN ('CitizenIdMasked', 'SocialSecurityNoMasked') THEN pg_temp.remask(val) ELSE val END)
         FROM jsonb_each(new_value) AS e(k, val))
        ELSE new_value END
WHERE (old_value ->> 'CitizenIdMasked') ~ '^[0-9]' OR (new_value ->> 'CitizenIdMasked') ~ '^[0-9]'
   OR (old_value ->> 'SocialSecurityNoMasked') ~ '^[0-9]' OR (new_value ->> 'SocialSecurityNoMasked') ~ '^[0-9]';

COMMIT;
