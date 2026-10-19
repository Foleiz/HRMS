-- ============================================================================
-- ลบคอลัมน์ citizen_id_encrypted (ซ้ำกับ citizen_id ที่เข้ารหัส enc:v1 แล้ว)
-- ⚠️ รันหลังจากทุกคนในทีมใช้ backend ที่ไม่มี CitizenIdEncrypted แล้วเท่านั้น
--    (โค้ดเก่ายัง SELECT คอลัมน์นี้ → ถ้าลบก่อน หน้าพนักงานจะ error)
-- ============================================================================
BEGIN;
-- กันพลาด: ต้องไม่มีข้อมูลเหลือในคอลัมน์
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM hrms.employee WHERE citizen_id_encrypted IS NOT NULL)
       OR EXISTS (SELECT 1 FROM hrms.family_member WHERE citizen_id_encrypted IS NOT NULL) THEN
        RAISE EXCEPTION 'ยังมีข้อมูลใน citizen_id_encrypted — ยกเลิกการลบ';
    END IF;
END $$;
ALTER TABLE hrms.employee      DROP COLUMN IF EXISTS citizen_id_encrypted;
ALTER TABLE hrms.family_member DROP COLUMN IF EXISTS citizen_id_encrypted;
COMMIT;
