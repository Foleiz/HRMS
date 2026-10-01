-- ==============================================================================
-- สคริปต์เพิ่มสิทธิ์และขอบเขตข้อมูลสำหรับ 3 โมดูลใหม่ (EMP_DOC, EMP_HISTORY, REPORT_LEAVE)
-- ให้กับ Role HR เดิม (เช่น ผู้จัดการฝ่ายบุคคล) และผู้บริหาร (CEO)
-- รันซ้ำได้ปลอดภัย (Idempotent)
-- ==============================================================================

BEGIN;

-- 1. เพิ่มสิทธิ์ใน hrms.permission (หากยังไม่มี)
INSERT INTO hrms.permission (id, permission_code, permission_name, description) VALUES
    (239, 'EMP_DOC_VIEW', 'แฟ้มเอกสารพนักงาน (ดูข้อมูล)', 'สิทธิ์ดูแฟ้มเอกสารและดาวน์โหลดเอกสารพนักงาน'),
    (240, 'EMP_DOC_CREATE', 'แฟ้มเอกสารพนักงาน (สร้าง/เพิ่ม)', 'สิทธิ์อัปโหลดเอกสารพนักงานเข้าแฟ้ม'),
    (241, 'EMP_DOC_EDIT', 'แฟ้มเอกสารพนักงาน (แก้ไข)', 'สิทธิ์แก้ไขข้อมูลและต่ออายุเอกสารพนักงาน'),
    (242, 'EMP_DOC_APPROVE', 'แฟ้มเอกสารพนักงาน (อนุมัติ)', 'สิทธิ์อนุมัติเอกสารและคำร้องขอเอกสาร'),
    (243, 'EMP_HISTORY_VIEW', 'ประวัติการเปลี่ยนแปลง (ดูข้อมูล)', 'สิทธิ์ดูประวัติการเปลี่ยนแปลงข้อมูลพนักงาน (Audit Log)'),
    (244, 'EMP_HISTORY_CREATE', 'ประวัติการเปลี่ยนแปลง (สร้าง/เพิ่ม)', 'สิทธิ์บันทึกประวัติการเปลี่ยนแปลง'),
    (245, 'EMP_HISTORY_EDIT', 'ประวัติการเปลี่ยนแปลง (แก้ไข)', 'สิทธิ์ปรับปรุงประวัติการเปลี่ยนแปลง'),
    (246, 'EMP_HISTORY_APPROVE', 'ประวัติการเปลี่ยนแปลง (อนุมัติ)', 'สิทธิ์รับรองประวัติการเปลี่ยนแปลง'),
    (247, 'REPORT_LEAVE_VIEW', 'รายงานสรุปการลา (ดูข้อมูล)', 'สิทธิ์ดูรายงานสรุปการลาประจำปีและดาวน์โหลด CSV'),
    (248, 'REPORT_LEAVE_CREATE', 'รายงานสรุปการลา (สร้าง/เพิ่ม)', 'สิทธิ์สร้างรายงานการลา'),
    (249, 'REPORT_LEAVE_EDIT', 'รายงานสรุปการลา (แก้ไข)', 'สิทธิ์ปรับปรุงรายงานการลา'),
    (250, 'REPORT_LEAVE_APPROVE', 'รายงานสรุปการลา (อนุมัติ)', 'สิทธิ์รับรองรายงานสรุปการลา')
ON CONFLICT (id) DO UPDATE SET
    permission_code = EXCLUDED.permission_code,
    permission_name = EXCLUDED.permission_name,
    description = EXCLUDED.description;

-- ปรับ sequence ของ hrms.permission_permission_id_seq ให้เกิน 250
SELECT setval('hrms.permission_permission_id_seq', GREATEST(250, (SELECT MAX(id) FROM hrms.permission)));

-- 2. ให้สิทธิ์ใน hrms.role_permission สำหรับบทบาท HR (role_id = 2)
INSERT INTO hrms.role_permission (role_id, permission_id)
SELECT 2, p.id
FROM hrms.permission p
WHERE p.permission_code IN (
    'EMP_DOC_VIEW', 'EMP_DOC_CREATE', 'EMP_DOC_EDIT', 'EMP_DOC_APPROVE',
    'EMP_HISTORY_VIEW', 'EMP_HISTORY_CREATE', 'EMP_HISTORY_EDIT', 'EMP_HISTORY_APPROVE',
    'REPORT_LEAVE_VIEW', 'REPORT_LEAVE_CREATE', 'REPORT_LEAVE_EDIT', 'REPORT_LEAVE_APPROVE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ให้สิทธิ์ใน hrms.role_permission สำหรับ CEO (role_id = 16)
INSERT INTO hrms.role_permission (role_id, permission_id)
SELECT 16, p.id
FROM hrms.permission p
WHERE p.permission_code IN (
    'EMP_DOC_VIEW',
    'EMP_HISTORY_VIEW',
    'REPORT_LEAVE_VIEW', 'REPORT_LEAVE_CREATE', 'REPORT_LEAVE_EDIT', 'REPORT_LEAVE_APPROVE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. ให้ขอบเขตข้อมูล (Data Scope) สำหรับ HR (role_id = 2) ในทุกระดับ (SELF, TEAM, DEPARTMENT, DIVISION, ORGANIZATION)
INSERT INTO hrms.role_data_scope (role_id, permission_id, data_visibility_scope)
SELECT 2, p.id, s.scope
FROM hrms.permission p
CROSS JOIN (
    SELECT 'SELF' AS scope UNION ALL
    SELECT 'TEAM' UNION ALL
    SELECT 'DEPARTMENT' UNION ALL
    SELECT 'DIVISION' UNION ALL
    SELECT 'ORGANIZATION'
) s
WHERE p.permission_code IN (
    'EMP_DOC_VIEW', 'EMP_DOC_CREATE', 'EMP_DOC_EDIT', 'EMP_DOC_APPROVE',
    'EMP_HISTORY_VIEW', 'EMP_HISTORY_CREATE', 'EMP_HISTORY_EDIT', 'EMP_HISTORY_APPROVE',
    'REPORT_LEAVE_VIEW', 'REPORT_LEAVE_CREATE', 'REPORT_LEAVE_EDIT', 'REPORT_LEAVE_APPROVE'
)
ON CONFLICT (role_id, permission_id, data_visibility_scope) DO NOTHING;

-- ให้ขอบเขตข้อมูล (Data Scope) สำหรับ CEO (role_id = 16) ระดับ ORGANIZATION
INSERT INTO hrms.role_data_scope (role_id, permission_id, data_visibility_scope)
SELECT 16, p.id, 'ORGANIZATION'
FROM hrms.permission p
WHERE p.permission_code IN (
    'EMP_DOC_VIEW',
    'EMP_HISTORY_VIEW',
    'REPORT_LEAVE_VIEW', 'REPORT_LEAVE_CREATE', 'REPORT_LEAVE_EDIT', 'REPORT_LEAVE_APPROVE'
)
ON CONFLICT (role_id, permission_id, data_visibility_scope) DO NOTHING;

COMMIT;
