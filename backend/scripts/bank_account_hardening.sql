-- ============================================================================
-- ปรับปรุงข้อมูลธนาคาร/บัญชีรับเงินเดือน (branch feat/bank-account-hardening)
-- 1) ข้อมูลหลักธนาคาร: ชื่อย่อ + จำนวนหลักเลขบัญชี + รหัสธนาคารมาตรฐาน 3 หลัก
-- 4) เข้ารหัสเลขบัญชี: เพิ่ม account_hash (เลขบัญชีจะถูกเข้ารหัสโดย backend ตอนเปิดระบบครั้งแรก)
-- 5) เปลี่ยนบัญชีต้องยืนยัน: สถานะ PENDING_VERIFY / REJECTED + ผู้ขอ/ผู้ยืนยัน
-- รันซ้ำได้ (idempotent) · รันก่อนเปิด backend เวอร์ชันนี้
-- ============================================================================
BEGIN;

-- ---------- 1) bank ----------
ALTER TABLE hrms.bank ADD COLUMN IF NOT EXISTS short_name varchar(20) NULL;
ALTER TABLE hrms.bank ADD COLUMN IF NOT EXISTS account_digits int NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_account_digits_chk') THEN
        ALTER TABLE hrms.bank ADD CONSTRAINT bank_account_digits_chk
            CHECK (account_digits IS NULL OR account_digits BETWEEN 6 AND 20);
    END IF;
END $$;

-- รหัสธนาคารมาตรฐาน (ธนาคารแห่งประเทศไทย) — จำนวนหลักใส่เฉพาะที่ระบบใช้ตรวจอยู่เดิม
CREATE TEMP TABLE tmp_std_bank (code text, name text, short text, digits int, name_like text) ON COMMIT DROP;
INSERT INTO tmp_std_bank VALUES
    ('002', 'ธนาคารกรุงเทพ',                         'BBL',   10, '%กรุงเทพ%'),
    ('004', 'ธนาคารกสิกรไทย',                        'KBANK', 10, '%กสิกร%'),
    ('006', 'ธนาคารกรุงไทย',                         'KTB',   10, '%กรุงไทย%'),
    ('011', 'ธนาคารทหารไทยธนชาต',                    'TTB',   10, '%ทหารไทย%'),
    ('014', 'ธนาคารไทยพาณิชย์',                      'SCB',   10, '%ไทยพาณิชย์%'),
    ('025', 'ธนาคารกรุงศรีอยุธยา',                   'BAY',   10, '%กรุงศรี%'),
    ('030', 'ธนาคารออมสิน',                          'GSB',   12, '%ออมสิน%'),
    ('034', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', 'BAAC',  15, '%เกษตร%'),
    ('033', 'ธนาคารอาคารสงเคราะห์',                  'GHB',   NULL, '%อาคารสงเคราะห์%'),
    ('022', 'ธนาคารซีไอเอ็มบี ไทย',                  'CIMBT', NULL, '%ซีไอเอ็มบี%'),
    ('024', 'ธนาคารยูโอบี',                          'UOB',   NULL, '%ยูโอบี%'),
    ('069', 'ธนาคารเกียรตินาคินภัทร',                'KKP',   NULL, '%เกียรตินาคิน%'),
    ('073', 'ธนาคารแลนด์ แอนด์ เฮ้าส์',              'LHB',   NULL, '%แลนด์%'),
    ('067', 'ธนาคารทิสโก้',                          'TISCO', NULL, '%ทิสโก้%');

-- (ก) แถวที่มีรหัสมาตรฐานอยู่แล้ว → เติมชื่อย่อ/จำนวนหลัก (ไม่ทับค่าที่ HR ตั้งเอง)
UPDATE hrms.bank b
SET short_name = COALESCE(b.short_name, s.short),
    account_digits = COALESCE(b.account_digits, s.digits)
FROM tmp_std_bank s
WHERE b.bank_code = s.code;

-- (ข) แถวเดิมที่ใช้รหัสอื่น (เช่น KBANK) แต่ชื่อตรง → เปลี่ยนเป็นรหัสมาตรฐาน (ถ้ารหัสนั้นยังว่าง)
UPDATE hrms.bank b
SET bank_code = s.code,
    short_name = COALESCE(b.short_name, s.short),
    account_digits = COALESCE(b.account_digits, s.digits)
FROM tmp_std_bank s
WHERE b.bank_code <> s.code
  AND (b.bank_name ILIKE s.name_like OR upper(b.bank_code) = s.short)
  AND NOT EXISTS (SELECT 1 FROM hrms.bank x WHERE x.bank_code = s.code)
  AND b.id = (SELECT min(y.id) FROM hrms.bank y WHERE (y.bank_name ILIKE s.name_like OR upper(y.bank_code) = s.short) AND y.bank_code <> s.code);

-- (ค) ธนาคารที่ยังไม่มี → เพิ่ม
INSERT INTO hrms.bank (bank_code, bank_name, short_name, account_digits, status)
SELECT s.code, s.name, s.short, s.digits, 'ACTIVE'
FROM tmp_std_bank s
WHERE NOT EXISTS (SELECT 1 FROM hrms.bank b WHERE b.bank_code = s.code);

-- ---------- 4) + 5) employee_bank_account ----------
ALTER TABLE hrms.employee_bank_account ADD COLUMN IF NOT EXISTS account_hash varchar(64) NULL;
ALTER TABLE hrms.employee_bank_account ADD COLUMN IF NOT EXISTS requested_at timestamptz NULL;
ALTER TABLE hrms.employee_bank_account ADD COLUMN IF NOT EXISTS requested_by_user_id int8 NULL;
ALTER TABLE hrms.employee_bank_account ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL;
ALTER TABLE hrms.employee_bank_account ADD COLUMN IF NOT EXISTS verified_by_user_id int8 NULL;
ALTER TABLE hrms.employee_bank_account ADD COLUMN IF NOT EXISTS reject_reason varchar(500) NULL;
ALTER TABLE hrms.employee_bank_account ALTER COLUMN account_number TYPE varchar(255);
ALTER TABLE hrms.company_bank_account ALTER COLUMN account_number TYPE varchar(255);

-- สถานะใหม่: PENDING_VERIFY (รอยืนยัน), REJECTED (ไม่อนุมัติ)
DO $$
DECLARE c record;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'hrms.employee_bank_account'::regclass AND contype = 'c'
               AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE hrms.employee_bank_account DROP CONSTRAINT %I', c.conname);
    END LOOP;
    ALTER TABLE hrms.employee_bank_account ADD CONSTRAINT employee_bank_account_status_chk
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_VERIFY', 'REJECTED'));
END $$;

-- เลขบัญชีถูกเข้ารหัสแบบสุ่ม IV → unique (bank_id, account_number) ใช้ไม่ได้แล้ว ย้ายไปใช้ account_hash
DO $$
DECLARE c record;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'hrms.employee_bank_account'::regclass AND contype = 'u'
               AND pg_get_constraintdef(oid) ILIKE '%account_number%'
    LOOP
        EXECUTE format('ALTER TABLE hrms.employee_bank_account DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;
DROP INDEX IF EXISTS hrms.ux_employee_bank_account_hash;
CREATE UNIQUE INDEX ux_employee_bank_account_hash
    ON hrms.employee_bank_account (bank_id, account_hash)
    WHERE account_hash IS NOT NULL AND status IN ('ACTIVE', 'PENDING_VERIFY');

-- บัญชีเดิมทั้งหมดถือว่ายืนยันแล้ว
UPDATE hrms.employee_bank_account SET verified_at = COALESCE(verified_at, now()) WHERE status = 'ACTIVE';

COMMIT;

-- ตรวจผล: ธนาคารที่ยังไม่มีจำนวนหลัก (ไม่ตรวจความยาวเลขบัญชี) — ตั้งเพิ่มได้ที่ ข้อมูลหลัก → ธนาคาร
SELECT bank_code, bank_name, short_name, account_digits FROM hrms.bank ORDER BY bank_code;
