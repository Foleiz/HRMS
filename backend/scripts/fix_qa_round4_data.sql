-- ซ่อมข้อมูลรอบ QA 4 — รันใน Supabase (Singapore) ทีละส่วน ส่วน 1 และ 3 อ่านอย่างเดียว

-- ===== ส่วน 1: ดูใบลาที่ "อนุมัติแล้ว" แต่ไม่มีรายการตัดยอด (USED) =====
-- สาเหตุ: ตอนอนุมัติขั้นสุดท้าย workflow บันทึกไปก่อน แล้ว trigger ใน DB เปลี่ยนใบลาเป็น APPROVED
--          แต่ขั้นตัดยอดวันลาใน C# ล้ม (trigger attendance_daily พัง) ยอดจึงไม่ถูกตัด
SELECT r.id, r.request_no, r.employee_id, r.leave_type_id, r.leave_days,
       EXTRACT(YEAR FROM (r.start_datetime AT TIME ZONE 'Asia/Bangkok'))::int AS leave_year,
       b.id AS balance_id, b.used_days
FROM hrms.leave_request r
LEFT JOIN hrms.leave_balance b
  ON b.employee_id = r.employee_id AND b.leave_type_id = r.leave_type_id
 AND b.year = EXTRACT(YEAR FROM (r.start_datetime AT TIME ZONE 'Asia/Bangkok'))::int
WHERE r.status = 'APPROVED'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.leave_balance_transaction t
    WHERE lower(t.reference_type) = 'leave_request' AND t.reference_id = r.id AND t.transaction_type = 'USED')
ORDER BY r.id;

-- ===== ส่วน 2: ตัดยอดย้อนหลังให้ใบในส่วน 1 =====
BEGIN;
WITH missing AS (
  SELECT r.id, r.request_no, r.leave_days, b.id AS balance_id
  FROM hrms.leave_request r
  JOIN hrms.leave_balance b
    ON b.employee_id = r.employee_id AND b.leave_type_id = r.leave_type_id
   AND b.year = EXTRACT(YEAR FROM (r.start_datetime AT TIME ZONE 'Asia/Bangkok'))::int
  WHERE r.status = 'APPROVED'
    AND NOT EXISTS (
      SELECT 1 FROM hrms.leave_balance_transaction t
      WHERE lower(t.reference_type) = 'leave_request' AND t.reference_id = r.id AND t.transaction_type = 'USED')
), ins AS (
  INSERT INTO hrms.leave_balance_transaction (leave_balance_id, transaction_type, amount, reference_type, reference_id, note, created_at)
  SELECT balance_id, 'USED', -leave_days, 'leave_request', id,
         'ซ่อมยอด: อนุมัติคำร้องขอลาเลขที่ ' || request_no || ' (ไม่ถูกตัดยอดตอนอนุมัติ)', now()
  FROM missing
  RETURNING leave_balance_id, amount
)
UPDATE hrms.leave_balance b
SET used_days = b.used_days + s.total,
    net_remaining_leave_days = b.brought_forward_days + b.annual_quota_days + b.active_carried_forward_days
                               - (b.used_days + s.total) + b.adjusted_days
FROM (SELECT leave_balance_id, -SUM(amount) AS total FROM ins GROUP BY leave_balance_id) s
WHERE b.id = s.leave_balance_id;
COMMIT;

-- ===== ส่วน 3: ดูยอดวันลาที่ถูกสร้างผิดเป็นปีพุทธศักราช (เช่น year = 2569 → "ปี 3112") =====
SELECT b.id, b.employee_id, b.leave_type_id, b.year, b.used_days,
       (SELECT count(*) FROM hrms.leave_balance_transaction t
         WHERE t.leave_balance_id = b.id AND t.transaction_type <> 'ENTITLEMENT') AS non_entitlement_tx
FROM hrms.leave_balance b
WHERE b.year >= 2400
ORDER BY b.employee_id, b.leave_type_id;

-- ===== ส่วน 4: ลบยอดปีผิด (เฉพาะแถวที่ไม่มีการใช้งานจริง) =====
BEGIN;
DELETE FROM hrms.leave_balance_transaction t
USING hrms.leave_balance b
WHERE t.leave_balance_id = b.id AND b.year >= 2400 AND b.used_days = 0
  AND NOT EXISTS (SELECT 1 FROM hrms.leave_balance_transaction x
                  WHERE x.leave_balance_id = b.id AND x.transaction_type <> 'ENTITLEMENT');
DELETE FROM hrms.leave_balance b
WHERE b.year >= 2400 AND b.used_days = 0
  AND NOT EXISTS (SELECT 1 FROM hrms.leave_balance_transaction x WHERE x.leave_balance_id = b.id);
COMMIT;

-- ===== ส่วน 5 (อ่านอย่างเดียว): เงินเดือนในรอบที่จ่าย/ปิดแล้ว แต่ยังไม่ถูกทำเครื่องหมายว่าโอน =====
-- ถ้าเป็นรอบที่โอนจริงครบแล้ว ค่อยเอา comment ออกจากคำสั่ง UPDATE ด้านล่างแล้วรัน
SELECT pp.id AS period_id, pp.year, pp.month, pp.status AS period_status,
       count(*) FILTER (WHERE p.payment_status <> 'TRANSFERRED') AS not_transferred,
       count(*) AS payable_total
FROM hrms.payroll p
JOIN hrms.payroll_period pp ON pp.id = p.period_id
WHERE pp.status IN ('PAID', 'CLOSED') AND p.status = 'CALCULATED' AND p.net_payable_salary > 0
GROUP BY pp.id, pp.year, pp.month, pp.status
ORDER BY pp.year, pp.month;

-- UPDATE hrms.payroll p SET payment_status = 'TRANSFERRED', transferred_at = COALESCE(p.transferred_at, now())
-- FROM hrms.payroll_period pp
-- WHERE pp.id = p.period_id AND pp.status IN ('PAID', 'CLOSED')
--   AND p.status = 'CALCULATED' AND p.net_payable_salary > 0 AND p.payment_status <> 'TRANSFERRED';
