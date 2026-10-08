-- แก้บั๊ก: อนุมัติใบลาขั้นสุดท้ายไม่ผ่าน (error 42703: column "work_schedule_id" does not exist)
-- สาเหตุ: trigger เก่า trg_auto_sync_attendance_schedule (BEFORE INSERT บน attendance_daily)
--   อ่าน employee_assignment.work_schedule_id และเขียน attendance_daily.work_schedule_id ซึ่งไม่มีแล้วทั้งคู่
--   ทุกครั้งที่ระบบสร้างแถว attendance_daily ใหม่ (อนุมัติลา, นำเข้าเวลา) จึงล้ม
-- โค้ด C# (AttendanceDailyService / CompanyWorkSchedule) กำหนด shift และเวลาเข้า-ออกตามตารางเองอยู่แล้ว
--   และ trigger นี้แปลงเวลาเป็น timestamptz ตาม timezone ของ session (UTC) ซึ่งจะได้เวลาคลาด 7 ชม.
--   จึงลบทิ้ง ไม่แก้ชื่อคอลัมน์

DROP TRIGGER IF EXISTS trg_auto_sync_attendance_schedule ON hrms.attendance_daily;
DROP FUNCTION IF EXISTS hrms.fn_auto_sync_attendance_schedule();

-- ตรวจผล: ต้องไม่เหลือแถวของ trg_auto_sync_attendance_schedule
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'hrms' AND event_object_table = 'attendance_daily';
