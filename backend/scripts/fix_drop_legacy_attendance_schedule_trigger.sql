-- แก้บั๊ก: อนุมัติใบลาขั้นสุดท้ายไม่ผ่าน (error 42703: column "work_schedule_id" does not exist)
-- สาเหตุ: trigger เก่า trg_auto_sync_attendance_schedule (BEFORE INSERT บน attendance_daily)
--   อ่าน employee_assignment.work_schedule_id และเขียน attendance_daily.work_schedule_id ซึ่งไม่มีแล้วทั้งคู่
--   ทุกครั้งที่ระบบสร้างแถว attendance_daily ใหม่ (อนุมัติลา, นำเข้าเวลา) จึงล้ม
-- โค้ด C# (AttendanceDailyService / CompanyWorkSchedule) กำหนด shift และเวลาเข้า-ออกตามตารางเองอยู่แล้ว
--   และ trigger นี้แปลงเวลาเป็น timestamptz ตาม timezone ของ session (UTC) ซึ่งจะได้เวลาคลาด 7 ชม.
--   จึงลบทิ้ง ไม่แก้ชื่อคอลัมน์

DROP TRIGGER IF EXISTS trg_auto_sync_attendance_schedule ON hrms.attendance_daily;
DROP FUNCTION IF EXISTS hrms.fn_auto_sync_attendance_schedule();

-- trigger เก่าตัวที่ 2: trg_calculate_attendance_metrics (BEFORE INSERT) อ้าง NEW.work_schedule_id เช่นกัน
--   และคำนวณนาทีทำงาน/สาย/ออกก่อนทับค่าที่ C# คำนวณ (C# หักเวลาพัก แต่ trigger ไม่หัก) จึงลบทิ้งด้วย
DROP TRIGGER IF EXISTS trg_calculate_attendance_metrics ON hrms.attendance_daily;
DROP FUNCTION IF EXISTS hrms.fn_calculate_attendance_metrics();

-- ตรวจผล: ต้องไม่เหลือ trigger ใดบน attendance_daily
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'hrms' AND event_object_table = 'attendance_daily';
