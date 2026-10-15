-- สีประจำประเภทการลา (ใช้กับการ์ดหน้า "ยอดวันลาคงเหลือ") — รันบน Supabase ก่อนใช้ backend เวอร์ชันนี้
ALTER TABLE hrms.leave_type ADD COLUMN IF NOT EXISTS color varchar(20);
