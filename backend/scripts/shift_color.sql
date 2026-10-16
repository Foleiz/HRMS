-- สีของกะการทำงาน (ใช้แสดงในปฏิทินจัดกะ) — รันบน Supabase ก่อนใช้ backend เวอร์ชันใหม่
ALTER TABLE hrms.shift ADD COLUMN IF NOT EXISTS color varchar(20);
