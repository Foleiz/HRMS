-- ============================================================
-- แก้ข้อมูลจากรอบทดสอบ UI ครั้งที่ 1 (7 ต.ค. 2569)
-- รันใน Supabase SQL Editor ทีละส่วน (ดูผล SELECT ก่อน แล้วค่อยรัน UPDATE)
-- ============================================================

-- ----------------------------------------------------------------
-- P2-4 ที่อยู่ถูกเก็บรวมไว้ใน address_line ช่องเดียว (ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ว่าง)
-- ----------------------------------------------------------------
-- 1) ดูแถวที่มีปัญหา
SELECT id, employee_id, address_type, address_line, sub_district, district, province, postal_code
FROM hrms.employee_address
WHERE sub_district IS NULL AND district IS NULL AND province IS NULL AND postal_code IS NULL;

-- 2) แยกที่อยู่รูปแบบ "<บ้านเลขที่/ถนน> <ตำบล> <อำเภอ> <จังหวัด> <รหัสไปรษณีย์ 5 หลัก>"
--    (คำสุดท้าย 4 คำ = ตำบล อำเภอ จังหวัด รหัสไปรษณีย์) — แถวที่ไม่ตรงรูปแบบจะไม่ถูกแก้
UPDATE hrms.employee_address a
SET address_line = p.line,
    sub_district = p.sub_district,
    district     = p.district,
    province     = p.province,
    postal_code  = p.postal_code
FROM (
    SELECT id,
           m[1] AS line, m[2] AS sub_district, m[3] AS district, m[4] AS province, m[5] AS postal_code
    FROM (
        SELECT id, regexp_match(trim(address_line), '^(.+?)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d{5})$') AS m
        FROM hrms.employee_address
        WHERE sub_district IS NULL AND district IS NULL AND province IS NULL AND postal_code IS NULL
    ) x
    WHERE m IS NOT NULL
) p
WHERE a.id = p.id;
-- 3) ตรวจผล
SELECT id, employee_id, address_line, sub_district, district, province, postal_code
FROM hrms.employee_address ORDER BY employee_id;

-- ----------------------------------------------------------------
-- P3-4 ชื่อตำแหน่งมีคำว่า "ตำแหน่ง" นำหน้า → หนังสือรับรองแสดง "ตำแหน่ง ตำแหน่ง..."
-- ----------------------------------------------------------------
SELECT id, position_code, position_name FROM hrms.position WHERE position_name LIKE 'ตำแหน่ง%';

UPDATE hrms.position p
SET position_name = btrim(substr(p.position_name, length('ตำแหน่ง') + 1))
WHERE p.position_name LIKE 'ตำแหน่ง%'
  AND btrim(substr(p.position_name, length('ตำแหน่ง') + 1)) <> ''
  AND NOT EXISTS (   -- กันชื่อซ้ำกับตำแหน่งที่มีอยู่แล้วในแผนกเดียวกัน
      SELECT 1 FROM hrms.position q
      WHERE q.department_id = p.department_id
        AND q.position_name = btrim(substr(p.position_name, length('ตำแหน่ง') + 1))
  );

-- ----------------------------------------------------------------
-- P3-7 คำนำหน้าไม่ตรงกับเพศ (เช่น EMP0001 "นางสาว" แต่เพศ "ชาย")
-- ----------------------------------------------------------------
-- ดูรายการที่ไม่ตรงกันก่อน แล้วเลือกแก้ "คำนำหน้า" หรือ "เพศ" ตามข้อมูลจริงของพนักงาน
SELECT id, employee_code, prefix, first_name, gender, gender_id
FROM hrms.employee
WHERE (prefix IN ('นาง', 'นางสาว') AND gender = 'ชาย')
   OR (prefix = 'นาย' AND gender = 'หญิง');

-- ตัวอย่าง: EMP0001 (admin) ให้คำนำหน้าเป็น "นาย" ตามเพศที่บันทึกไว้
UPDATE hrms.employee SET prefix = 'นาย'
WHERE employee_code = 'EMP0001' AND prefix IN ('นาง', 'นางสาว') AND gender = 'ชาย';
