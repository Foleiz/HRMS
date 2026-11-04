-- เหตุผล/ผู้แก้/เวลาที่แก้ สำหรับการแก้ไขบันทึกเวลาด้วยมือ (หน้าตรวจบันทึกเวลา) — รันแล้วบน Supabase 4 พ.ย. 2569
alter table hrms.attendance_daily
  add column if not exists edit_reason varchar(500),
  add column if not exists edited_by_user_id bigint,
  add column if not exists edited_at timestamptz;
