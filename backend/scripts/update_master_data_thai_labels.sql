-- ==============================================================================
-- Update Master Data in Database to Thai Language Only
-- ==============================================================================
BEGIN;

-- 1. Nationality: Remove (English) suffix
UPDATE hrms.nationality
SET nationality_name = REGEXP_REPLACE(nationality_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE nationality_name ~ '\([A-Za-z]';

-- 2. Employee: Sync nationality with cleaned nationality_name
UPDATE hrms.employee
SET nationality = REGEXP_REPLACE(nationality, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE nationality ~ '\([A-Za-z]';

-- 3. Employee Type: Clean type_name
UPDATE hrms.employee_type
SET type_name = REGEXP_REPLACE(type_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE type_name ~ '\([A-Za-z]';

-- 4. Leave Type: Clean leave_name
UPDATE hrms.leave_type
SET leave_name = REGEXP_REPLACE(leave_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE leave_name ~ '\([A-Za-z]';

-- 5. Certificate Type: Clean certificate_name
UPDATE hrms.certificate_type
SET certificate_name = REGEXP_REPLACE(certificate_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE certificate_name ~ '\([A-Za-z]';

-- 6. Role: Clean role_name
UPDATE hrms.role
SET role_name = REGEXP_REPLACE(role_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE role_name ~ '\([A-Za-z]';

-- 7. Approval Flow: Clean flow_name
UPDATE hrms.approval_flow
SET flow_name = REGEXP_REPLACE(flow_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE flow_name ~ '\([A-Za-z]';

-- 8. Payroll Item: Clean item_name
UPDATE hrms.payroll_item
SET item_name = REGEXP_REPLACE(item_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE item_name ~ '\([A-Za-z]';

-- 9. Bank: Clean bank_name (remove English abbreviations in parentheses)
UPDATE hrms.bank
SET bank_name = REGEXP_REPLACE(bank_name, '\s*\([A-Za-z0-9\s/_\-%]+\)$', '')
WHERE bank_name ~ '\([A-Za-z]';

-- 10. Benefit Item: Clean description
UPDATE hrms.benefit_item
SET description = REGEXP_REPLACE(description, '\s*\(Provident Fund\)', '')
WHERE description LIKE '%(Provident Fund)%';

COMMIT;
