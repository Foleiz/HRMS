-- ==============================================================================
-- ประวัติการทำงาน: เพิ่มช่อง "หน้าที่รับผิดชอบ" (ตาราง employee_work_experience มีอยู่แล้ว)
-- รันซ้ำได้ปลอดภัย (idempotent)
-- ==============================================================================
ALTER TABLE hrms.employee_work_experience ADD COLUMN IF NOT EXISTS job_description text NULL;
