-- =============================================================================
-- Migration: Commission Entry (รายการค่าคอมมิชชั่นรายวัน/รายช่วง) + Import Batch
-- Description:
--   employee_commission (ยอดรวมรายเดือนต่อคน) ยังเป็นตารางที่ระบบเงินเดือนดึงไปใช้
--   แต่ยอดจะถูกคำนวณใหม่จาก employee_commission_entry ทุกครั้งที่นำเข้า/แก้/ยกเลิก
--   ไฟล์ใหม่จะ "แทนที่" รายการเดิมของพนักงานคนนั้นที่ช่วงวันที่ทับกัน (ไม่ต้องเลือกโหมด)
-- รันซ้ำได้ (idempotent)
-- =============================================================================

CREATE TABLE IF NOT EXISTS hrms.commission_import_batch (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    file_name VARCHAR(300) NULL,
    file_hash VARCHAR(100) NULL,
    detected_type VARCHAR(20) NOT NULL DEFAULT 'MONTH', -- MONTH, DAY, RANGE
    date_from DATE NULL,
    date_to DATE NULL,
    total_rows INT NOT NULL DEFAULT 0,
    success_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    employee_count INT NOT NULL DEFAULT 0,
    replaced_entries INT NOT NULL DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'IMPORTED', -- IMPORTED, PARTIAL, FAILED, REVERTED
    errors_json TEXT NULL,
    imported_by_user_id BIGINT NULL REFERENCES hrms.user_account(id) ON DELETE SET NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reverted_at TIMESTAMPTZ NULL,
    reverted_by_user_id BIGINT NULL REFERENCES hrms.user_account(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_commission_import_batch_hash ON hrms.commission_import_batch(file_hash);
CREATE INDEX IF NOT EXISTS idx_commission_import_batch_imported_at ON hrms.commission_import_batch(imported_at DESC);

CREATE TABLE IF NOT EXISTS hrms.employee_commission_entry (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES hrms.employee(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    sales_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    commission_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    special_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    note TEXT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'FILE', -- FILE, MANUAL, ADJUST, LEGACY
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUPERSEDED, REVERTED, REMOVED
    batch_id BIGINT NULL REFERENCES hrms.commission_import_batch(id) ON DELETE SET NULL,
    superseded_by_batch_id BIGINT NULL REFERENCES hrms.commission_import_batch(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_commission_entry_range_check CHECK (date_to >= date_from)
);

CREATE INDEX IF NOT EXISTS idx_commission_entry_emp_date ON hrms.employee_commission_entry(employee_id, date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_commission_entry_batch ON hrms.employee_commission_entry(batch_id);
CREATE INDEX IF NOT EXISTS idx_commission_entry_superseded ON hrms.employee_commission_entry(superseded_by_batch_id);

COMMENT ON TABLE hrms.employee_commission_entry IS 'รายการค่าคอมมิชชั่นรายวัน/รายช่วงของพนักงาน (แหล่งข้อมูลจริงของยอดรายเดือน)';
COMMENT ON TABLE hrms.commission_import_batch IS 'ประวัติการนำเข้าไฟล์ค่าคอมมิชชั่น';

-- Backfill: ยอดรายเดือนเดิมที่ยังไม่มีรายการ -> สร้างเป็นรายการ "ทั้งเดือน" (LEGACY)
INSERT INTO hrms.employee_commission_entry
    (employee_id, date_from, date_to, sales_amount, commission_rate, commission_amount,
     special_amount, total_amount, note, source, status)
SELECT c.employee_id,
       make_date(c.year, c.month, 1),
       (make_date(c.year, c.month, 1) + INTERVAL '1 month - 1 day')::date,
       c.sales_amount, c.commission_rate, c.commission_amount,
       c.special_amount, c.total_commission, c.note, 'LEGACY', 'ACTIVE'
FROM hrms.employee_commission c
WHERE c.year BETWEEN 2000 AND 2999 AND c.month BETWEEN 1 AND 12
  AND NOT EXISTS (
    SELECT 1 FROM hrms.employee_commission_entry e
    WHERE e.employee_id = c.employee_id
      AND e.date_from >= make_date(c.year, c.month, 1)
      AND e.date_from <= (make_date(c.year, c.month, 1) + INTERVAL '1 month - 1 day')::date
);
