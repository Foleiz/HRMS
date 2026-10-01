-- เติมรหัสอ้างอิง สัญชาติ/ศาสนา/สถานภาพสมรส ที่ถูกล้างเป็น NULL จากการบันทึกหน้าแก้ไขพนักงาน (บั๊กเดิม)
-- จับคู่จากข้อความที่เก็บอยู่ — รันซ้ำได้
UPDATE hrms.employee e SET nationality_id = n.id
FROM hrms.nationality n
WHERE e.nationality_id IS NULL AND e.nationality IS NOT NULL AND trim(e.nationality) = n.nationality_name;

UPDATE hrms.employee e SET religion_id = r.id
FROM hrms.religion r
WHERE e.religion_id IS NULL AND e.religion IS NOT NULL AND trim(e.religion) = r.religion_name;

UPDATE hrms.employee e SET marital_status_id = m.id
FROM hrms.marital_status_type m
WHERE e.marital_status_id IS NULL AND e.marital_status IS NOT NULL AND trim(e.marital_status) = m.marital_status_name;
