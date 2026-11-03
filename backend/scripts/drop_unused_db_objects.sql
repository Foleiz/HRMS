-- ลบตาราง/คอลัมน์ที่ไม่ได้ใช้ (ตรวจ 3 พ.ย. 2569 — ดู claude/db-unused-audit-2026-11-03.md)
-- ทุกรายการไม่มีข้อมูล (0 แถว / ว่างทุกแถว)

-- ===== ส่วนที่ 1: backend ไม่ได้ map อยู่แล้ว — รันได้ทันที (โค้ดเก่าไม่กระทบ) =====
drop table if exists hrms.payroll_payment_detail;
drop table if exists hrms.payroll_payment;
drop table if exists hrms.loan_installment;
drop table if exists hrms.employee_loan;
alter table hrms.employee      drop column if exists citizen_id_encrypted;
alter table hrms.family_member drop column if exists citizen_id_encrypted;
alter table hrms.payroll       drop column if exists slip_file_path;

-- ===== ส่วนที่ 2: รันหลังทุกเครื่อง pull + restart backend เวอร์ชันที่เอา mapping ออกแล้ว =====
-- (backend เก่ายัง SELECT คอลัมน์เหล่านี้อยู่ ถ้าลบก่อนจะ error)
alter table hrms.approval_action drop column if exists delegation_id;        -- ลบ FK + index ไปด้วย
alter table hrms.approval_action drop column if exists acted_for_employee_id;
drop table if exists hrms.approval_delegation;
alter table hrms.certificate_request drop column if exists issued_file_url;
alter table hrms.employee_level      drop column if exists default_flow_id;
-- trigger นี้อ่าน NEW.document_type ซึ่ง payroll_period ไม่มี (ใช้งานไม่ได้มาตลอด)
drop trigger if exists trg_capture_payroll_pre_approval_status on hrms.payroll_period;
drop function if exists hrms.capture_payroll_pre_approval_status();
alter table hrms.payroll_period drop column if exists pre_approval_status;
alter table hrms.leave_policy   drop column if exists max_backdate_days;
