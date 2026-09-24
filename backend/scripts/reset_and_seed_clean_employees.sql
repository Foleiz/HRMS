-- ==============================================================================
-- Reset & Seed Clean Employees Script
-- ==============================================================================
BEGIN;

-- 1. Unlink references in head/foreign key nullable columns
UPDATE hrms.department SET head_employee_id = NULL;
UPDATE hrms.division SET head_employee_id = NULL;
UPDATE hrms.company SET ceo_employee_id = NULL;
UPDATE hrms.announcement SET created_by_employee_id = NULL;
UPDATE hrms.payroll_period SET closed_by_employee_id = NULL;
UPDATE hrms.attendance_import_batch SET imported_by_user_id = NULL;
UPDATE hrms.audit_log SET user_id = NULL;

-- 2. Clear transactional and dependent tables
DELETE FROM hrms.attendance_adjustment;
DELETE FROM hrms.attendance_daily;
DELETE FROM hrms.attendance_monthly_summary;
DELETE FROM hrms.leave_request_document;
DELETE FROM hrms.leave_request;
DELETE FROM hrms.leave_balance_transaction;
DELETE FROM hrms.leave_balance;
DELETE FROM hrms.certificate_request;
DELETE FROM hrms.resignation_request;
DELETE FROM hrms.approval_action;
DELETE FROM hrms.approval_step;
DELETE FROM hrms.approval_instance;
DELETE FROM hrms.approval_delegation;
DELETE FROM hrms.payslip;
DELETE FROM hrms.payroll_payment_detail;
DELETE FROM hrms.payroll_payment;
DELETE FROM hrms.payroll_detail;
DELETE FROM hrms.payroll_item;
DELETE FROM hrms.payroll;
DELETE FROM hrms.loan_installment;
DELETE FROM hrms.employee_loan;
DELETE FROM hrms.employee_salary;
DELETE FROM hrms.employee_transfer_request;
DELETE FROM hrms.employee_shift;
DELETE FROM hrms.employee_signature;
DELETE FROM hrms.employee_avatar;
DELETE FROM hrms.employee_social_security;
DELETE FROM hrms.employee_status_history;
DELETE FROM hrms.employment_contract;
DELETE FROM hrms.employee_work_experience;
DELETE FROM hrms.employee_education;
DELETE FROM hrms.family_member;
DELETE FROM hrms.emergency_contact;
DELETE FROM hrms.employee_address;
DELETE FROM hrms.employee_bank_account;
DELETE FROM hrms.employee_contact;
DELETE FROM hrms.employee_document;
DELETE FROM hrms.employee_assignment;
DELETE FROM hrms.notification;
DELETE FROM hrms.announcement_read;

-- 3. Clear User Accounts & Roles
DELETE FROM hrms.user_role;
DELETE FROM hrms.user_account;

-- 4. Clear Employees
DELETE FROM hrms.employee;

-- 5. Reset Sequences
SELECT setval(pg_get_serial_sequence('hrms.employee', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('hrms.user_account', 'id'), 1, false);

-- 6. Insert 10 Clean Employees (biometric_id is intentionally NULL)
INSERT INTO hrms.employee (
    id, employee_code, biometric_id, prefix, first_name, last_name, 
    citizen_id, citizen_id_masked, birth_date, gender, gender_id, 
    nationality, nationality_id, religion, religion_id, marital_status, marital_status_id, 
    military_status, is_top_level, spouse_has_income, number_of_children, parent_deduction_count, disability_deduction_count, 
    created_at, updated_at
) VALUES
(1, 'EMP0001', NULL, 'นาย', 'ธนพล', 'สิริโภคินทร์', '1100201234567', '1-1002-xxxxx-xx-7', '1988-05-15', 'ชาย', 1, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ผ่านการเกณฑ์ทหารแล้ว', true, false, 0, 0, 0, NOW(), NOW()),
(2, 'EMP0002', NULL, 'นางสาว', 'สายธาร', 'ทรัพยากรบุคคล', '1100202345678', '1-1002-xxxxx-xx-8', '1992-08-20', 'หญิง', 2, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ได้รับการยกเว้น', false, false, 0, 0, 0, NOW(), NOW()),
(3, 'EMP0003', NULL, 'นาย', 'สมชาย', 'วงศ์สุวรรณ', '1100203456789', '1-1002-xxxxx-xx-9', '1985-11-10', 'ชาย', 1, 'ไทย', 1, 'พุทธ', 1, 'สมรส', 2, 'ผ่านการเกณฑ์ทหารแล้ว', false, true, 1, 1, 0, NOW(), NOW()),
(4, 'EMP0004', NULL, 'นางสาว', 'กัญญา', 'จงสวัสดิ์', '1100204567890', '1-1002-xxxxx-xx-0', '1994-03-25', 'หญิง', 2, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ได้รับการยกเว้น', false, false, 0, 0, 0, NOW(), NOW()),
(5, 'EMP0005', NULL, 'นาย', 'วรเมธ', 'รัตนเสถียร', '1100205678901', '1-1002-xxxxx-xx-1', '1996-07-12', 'ชาย', 1, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ผ่านการเกณฑ์ทหารแล้ว', false, false, 0, 0, 0, NOW(), NOW()),
(6, 'EMP0006', NULL, 'นาง', 'สมหญิง', 'กิ้งก้อง', '1100206789012', '1-1002-xxxxx-xx-2', '1980-01-30', 'หญิง', 2, 'ไทย', 1, 'พุทธ', 1, 'สมรส', 2, 'ได้รับการยกเว้น', true, true, 2, 0, 0, NOW(), NOW()),
(7, 'EMP0007', NULL, 'นางสาว', 'สมการ', 'การเงินดี', '1100207890123', '1-1002-xxxxx-xx-3', '1991-09-18', 'หญิง', 2, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ได้รับการยกเว้น', false, false, 0, 0, 0, NOW(), NOW()),
(8, 'EMP0008', NULL, 'นาย', 'ประเสริฐ', 'ตั้งใจ', '1100208901234', '1-1002-xxxxx-xx-4', '1993-12-05', 'ชาย', 1, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ผ่านการเกณฑ์ทหารแล้ว', false, false, 0, 0, 0, NOW(), NOW()),
(9, 'EMP0009', NULL, 'นางสาว', 'วรรณา', 'ศรีสุข', '1100209012345', '1-1002-xxxxx-xx-5', '1995-04-14', 'หญิง', 2, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ได้รับการยกเว้น', false, false, 0, 0, 0, NOW(), NOW()),
(10, 'EMP0010', NULL, 'นาย', 'ธีรพงษ์', 'วงศ์ไทย', '1100210123456', '1-1002-xxxxx-xx-6', '1990-06-22', 'ชาย', 1, 'ไทย', 1, 'พุทธ', 1, 'โสด', 1, 'ผ่านการเกณฑ์ทหารแล้ว', false, false, 0, 0, 0, NOW(), NOW());

-- Advance sequence after manual ID inserts
SELECT setval(pg_get_serial_sequence('hrms.employee', 'id'), 10);

-- 7. Insert Contacts
INSERT INTO hrms.employee_contact (employee_id, personal_phone, personal_email, organization_email) VALUES
(1, '0812345671', 'thanapol.work@gmail.com', 'admin@hrms.internal'),
(2, '0812345672', 'saitharn.hr@gmail.com', 'hr@hrms.internal'),
(3, '0812345673', 'somchai.w@gmail.com', 'somchai.w@hrms.internal'),
(4, '0812345674', 'kanya.j@gmail.com', 'kanya.j@hrms.internal'),
(5, '0812345675', 'worameth.r@gmail.com', 'worameth.r@hrms.internal'),
(6, '0812345676', 'somying.ceo@gmail.com', 'ceo@hrms.internal'),
(7, '0812345677', 'somkarn.fin@gmail.com', 'finance@hrms.internal'),
(8, '0812345678', 'prasert.t@gmail.com', 'prasert.t@hrms.internal'),
(9, '0812345679', 'wanna.s@gmail.com', 'wanna.s@hrms.internal'),
(10, '0812345680', 'theerapong.w@gmail.com', 'theerapong.w@hrms.internal');

-- 8. Insert Addresses
INSERT INTO hrms.employee_address (employee_id, address_type, address_line, sub_district, district, province, postal_code, is_current) VALUES
(1, 'CURRENT', '123/45 ถนนพหลโยธิน', 'จตุจักร', 'จตุจักร', 'กรุงเทพมหานคร', '10900', true),
(2, 'CURRENT', '88/12 ถนนสุขุมวิท', 'คลองเตย', 'คลองเตย', 'กรุงเทพมหานคร', '10110', true),
(3, 'CURRENT', '54/9 ถนนวิภาวดีรังสิต', 'ลาดยาว', 'จตุจักร', 'กรุงเทพมหานคร', '10900', true),
(4, 'CURRENT', '12/3 ถนนรัชดาภิเษก', 'ห้วยขวาง', 'ห้วยขวาง', 'กรุงเทพมหานคร', '10310', true),
(5, 'CURRENT', '99/5 ถนนลาดพร้าว', 'จอมพล', 'จตุจักร', 'กรุงเทพมหานคร', '10900', true),
(6, 'CURRENT', '1/1 ซอยอารีย์สัมพันธ์', 'สามเสนใน', 'พญาไท', 'กรุงเทพมหานคร', '10400', true),
(7, 'CURRENT', '77/8 ถนนสีลม', 'สีลม', 'บางรัก', 'กรุงเทพมหานคร', '10500', true),
(8, 'CURRENT', '45/6 ถนนพระราม 3', 'บางโพงพาง', 'ยานนาวา', 'กรุงเทพมหานคร', '10120', true),
(9, 'CURRENT', '33/2 ถนนเจริญนคร', 'คลองสาน', 'คลองสาน', 'กรุงเทพมหานคร', '10600', true),
(10, 'CURRENT', '67/1 ถนนสาทรใต้', 'ทุ่งมหาเมฆ', 'สาทร', 'กรุงเทพมหานคร', '10120', true);

-- 9. Insert Bank Accounts
INSERT INTO hrms.employee_bank_account (employee_id, bank_id, account_number, account_type, account_name, is_primary, status) VALUES
(1, 1, '1234567890', 'SAVINGS', 'นาย ธนพล สิริโภคินทร์', true, 'ACTIVE'),
(2, 1, '2345678901', 'SAVINGS', 'นางสาว สายธาร ทรัพยากรบุคคล', true, 'ACTIVE'),
(3, 1, '3456789012', 'SAVINGS', 'นาย สมชาย วงศ์สุวรรณ', true, 'ACTIVE'),
(4, 1, '4567890123', 'SAVINGS', 'นางสาว กัญญา จงสวัสดิ์', true, 'ACTIVE'),
(5, 1, '5678901234', 'SAVINGS', 'นาย วรเมธ รัตนเสถียร', true, 'ACTIVE'),
(6, 1, '6789012345', 'SAVINGS', 'นาง สมหญิง กิ้งก้อง', true, 'ACTIVE'),
(7, 1, '7890123456', 'SAVINGS', 'นางสาว สมการ การเงินดี', true, 'ACTIVE'),
(8, 1, '8901234567', 'SAVINGS', 'นาย ประเสริฐ ตั้งใจ', true, 'ACTIVE'),
(9, 1, '9012345678', 'SAVINGS', 'นางสาว วรรณา ศรีสุข', true, 'ACTIVE'),
(10, 1, '0123456789', 'SAVINGS', 'นาย ธีรพงษ์ วงศ์ไทย', true, 'ACTIVE');

-- 10. Insert Social Security
INSERT INTO hrms.employee_social_security (employee_id, social_security_no_masked, hospital_name, hospital_code) VALUES
(1, '1-1002-xxxxx-xx-7', 'โรงพยาบาลเปาโล เกษตร', 'H001'),
(2, '1-1002-xxxxx-xx-8', 'โรงพยาบาลจุฬาลงกรณ์', 'H002'),
(3, '1-1002-xxxxx-xx-9', 'โรงพยาบาลศิริราช', 'H003'),
(4, '1-1002-xxxxx-xx-0', 'โรงพยาบาลรามาธิบดี', 'H004'),
(5, '1-1002-xxxxx-xx-1', 'โรงพยาบาลราชวิถี', 'H005'),
(6, '1-1002-xxxxx-xx-2', 'โรงพยาบาลบำรุงราษฎร์', 'H006'),
(7, '1-1002-xxxxx-xx-3', 'โรงพยาบาลกรุงเทพ', 'H007'),
(8, '1-1002-xxxxx-xx-4', 'โรงพยาบาลเจริญกรุงประชารักษ์', 'H008'),
(9, '1-1002-xxxxx-xx-5', 'โรงพยาบาลตากสิน', 'H009'),
(10, '1-1002-xxxxx-xx-6', 'โรงพยาบาลเลิดสิน', 'H010');

-- 11. Insert Employee Assignments
-- Position 1: CEO, 2: HRM, 3: TechLead, 4: SrDev, 5: JrDev, 6: Warehouse
-- Dept 1: Software, 2: IT Infra, 3: HR, 4: Comp&Benefits, 5: Warehouse (BBB)
INSERT INTO hrms.employee_assignment (
    employee_id, division_id, department_id, position_id, effective_from, is_current, wage_type
) VALUES
(1, 1, 1, 3, '2023-01-01', true, 'MONTHLY'),
(2, 2, 3, 2, '2023-03-01', true, 'MONTHLY'),
(3, 1, 1, 3, '2022-06-01', true, 'MONTHLY'),
(4, 1, 1, 4, '2024-01-15', true, 'MONTHLY'),
(5, 1, 1, 5, '2024-06-01', true, 'MONTHLY'),
(6, 3, 1, 1, '2021-01-01', true, 'MONTHLY'),
(7, 2, 4, 6, '2023-05-01', true, 'MONTHLY'),
(8, 4, 5, 6, '2024-02-01', true, 'MONTHLY'),
(9, 2, 3, 2, '2024-04-01', true, 'MONTHLY'),
(10, 1, 1, 4, '2023-08-01', true, 'MONTHLY');

-- 12. Link Heads
UPDATE hrms.department SET head_employee_id = 3 WHERE id = 1;
UPDATE hrms.department SET head_employee_id = 2 WHERE id = 3;
UPDATE hrms.department SET head_employee_id = 7 WHERE id = 4;
UPDATE hrms.department SET head_employee_id = 8 WHERE id = 5;
UPDATE hrms.company SET ceo_employee_id = 6;

-- 13. Insert User Accounts (Preserving original usernames and bcrypt hashes)
INSERT INTO hrms.user_account (id, employee_id, username, password_hash, status, created_at, updated_at) VALUES
(1, 1, 'admin', '$2a$11$XUeC7xpDkYmC7L2rJ.4YJ.wQkCFEWoO7jClbmfpI2NNNfIPxz/lsi', 'ACTIVE', NOW(), NOW()),
(2, 2, 'hr', '$2a$11$XLbw9dY241UcHWrWfPffKewkrBcqzYR0PvvdZDyIVV5Rih6wdP.tm', 'ACTIVE', NOW(), NOW()),
(3, 3, 'somchai.w', '$2a$11$KOHkgGY2PV2ytoEUi5KAX.23/MFTFtJK6NRx1PESUjxK5YP5gqs2y', 'ACTIVE', NOW(), NOW()),
(4, 4, 'kanya.j', '$2a$11$JAAz3OHK97toIO098SaxyOj2532dFrs39FDHbWl8RYEX3jYFwvl0C', 'ACTIVE', NOW(), NOW()),
(5, 5, 'worameth.r', '$2a$11$ODVh4qjhOygaLWFTfns/ceQGlUWdyrdRxLBmYoV2LxyEXtGQzcA9y', 'ACTIVE', NOW(), NOW()),
(6, 6, 'ceo', '$2a$11$c7WHC3w0JjsNAJm1xeIDMOwpcBDdMsn0ZBvcNGzYSNvEj8Zq2ZF.K', 'ACTIVE', NOW(), NOW()),
(7, 7, 'finance', '$2a$11$DUkuisGMO.ctmUtnu/sq3.nxBZ3bKAFVWsigVp0.P16UuAd1b8TvW', 'ACTIVE', NOW(), NOW()),
(8, 8, 'accounting', '$2a$11$4vCxCPNqfe065N66lGtSBOtcBy1FIh7tca7EEse9wFN582RKxhgWa', 'ACTIVE', NOW(), NOW()),
(9, 9, 'approver', '$2a$11$9I/bAhkqSPNDZph7QygUVOm.7pqxhCxEqmK.N6Cvgtw8WsZ.KbIzO', 'ACTIVE', NOW(), NOW()),
(10, 10, 'pimjai.k', '$2a$11$WnwxSB5khqEaLCnVUoPcy.N8B.o3NMEBVf902bDVo5Tt/aBtpRYTu', 'ACTIVE', NOW(), NOW());

SELECT setval(pg_get_serial_sequence('hrms.user_account', 'id'), 10);

-- 14. Assign User Roles
-- Roles: 1=ADMIN, 2=HR_MGR, 3=DEPT_MGR, 4=STAFF, 9=PAYROLL_ADMIN, 16=CEO
INSERT INTO hrms.user_role (user_id, role_id) VALUES
(1, 1),  -- admin -> ADMIN
(1, 16), -- admin -> CEO
(2, 2),  -- hr -> HR_MGR
(3, 3),  -- somchai.w -> DEPT_MGR
(4, 4),  -- kanya.j -> STAFF
(5, 4),  -- worameth.r -> STAFF
(6, 16), -- ceo -> CEO
(7, 9),  -- finance -> PAYROLL_ADMIN
(8, 9),  -- accounting -> PAYROLL_ADMIN
(9, 16), -- approver -> CEO
(10, 2); -- pimjai.k -> HR_MGR

-- 15. Seed Leave Balances for all 10 employees for year 2026
-- Leave Types: 1=ANNUAL (quota 6), 2=SICK (quota 30), 3=PERSONAL (quota 3)
INSERT INTO hrms.leave_balance (employee_id, leave_type_id, year, brought_forward_days, annual_quota_days, active_carried_forward_days, used_days, adjusted_days, net_remaining_leave_days)
SELECT e.id, 1, 2026, 0, 6, 0, 0, 0, 6 FROM hrms.employee e;

INSERT INTO hrms.leave_balance (employee_id, leave_type_id, year, brought_forward_days, annual_quota_days, active_carried_forward_days, used_days, adjusted_days, net_remaining_leave_days)
SELECT e.id, 2, 2026, 0, 30, 0, 0, 0, 30 FROM hrms.employee e;

INSERT INTO hrms.leave_balance (employee_id, leave_type_id, year, brought_forward_days, annual_quota_days, active_carried_forward_days, used_days, adjusted_days, net_remaining_leave_days)
SELECT e.id, 3, 2026, 0, 3, 0, 0, 0, 3 FROM hrms.employee e;

COMMIT;
