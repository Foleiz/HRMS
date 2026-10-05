-- แก้กรณีเพิ่มวันหยุดไม่ได้เพราะลำดับรหัส (identity) ของตาราง hrms.holiday ตามหลังข้อมูลจริง
-- (มักเกิดหลัง import/seed ข้อมูลโดยระบุ id เอง) — รันซ้ำได้ ปลอดภัย
DO $$
DECLARE seq text := pg_get_serial_sequence('hrms.holiday', 'id');
BEGIN
  IF seq IS NOT NULL THEN
    PERFORM setval(seq, COALESCE((SELECT MAX(id) FROM hrms.holiday), 0) + 1, false);
  END IF;
END $$;

-- ตรวจว่ามีบริษัทรหัส 1 (ระบบใช้บริษัทหลักรหัส 1 สำหรับวันหยุด/วันทำงาน)
SELECT id, company_code, company_name FROM hrms.company ORDER BY id LIMIT 5;
