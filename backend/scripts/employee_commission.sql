-- =============================================================================
-- Migration: Employee Commission Table
-- Description: ตารางเก็บข้อมูลยอดขายและค่าคอมมิชชั่นของพนักงานรายงวด
-- =============================================================================

CREATE TABLE IF NOT EXISTS hrms.employee_commission (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES hrms.employee(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL,
    sales_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    commission_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    special_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_commission NUMERIC(14, 2) NOT NULL DEFAULT 0,
    calculation_mode VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, PAID
    note TEXT NULL,
    confirmed_at TIMESTAMPTZ NULL,
    confirmed_by_employee_id BIGINT NULL REFERENCES hrms.employee(id) ON DELETE SET NULL,
    paid_period_id BIGINT NULL REFERENCES hrms.payroll_period(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_commission_year_month ON hrms.employee_commission(year, month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_commission_emp_period ON hrms.employee_commission(employee_id, year, month);

COMMENT ON TABLE hrms.employee_commission IS 'ข้อมูลยอดขายและค่าคอมมิชชั่นพนักงานประจำรอบ/เดือน';
