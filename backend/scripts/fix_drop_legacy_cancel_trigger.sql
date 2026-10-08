-- แก้บั๊ก: ยกเลิกใบลาที่ "อนุมัติแล้ว" ได้ error 500
-- สาเหตุ: ใน DB มี trigger เก่า (trg_fn_reverse_leave_on_cancel -> reverse_leave_balance_usage)
--   ซึ่งอ้างคอลัมน์ balance_id ที่ไม่มีแล้ว (คอลัมน์จริงคือ leave_balance_id)
--   และโค้ด C# (LeaveRequestService.CancelAsync) คืนยอดวันลาเองอยู่แล้ว
--   ถ้าแก้แค่ชื่อคอลัมน์ จะกลายเป็นคืนยอดซ้ำ 2 รอบ จึงลบ trigger นี้ทิ้ง

-- ขั้นที่ 1: ดูก่อนว่ามี trigger อะไรบ้างบนตาราง leave_request
SELECT t.tgname AS trigger_name, p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'hrms.leave_request'::regclass AND NOT t.tgisinternal;

-- ขั้นที่ 2: ลบ trigger ที่เรียก trg_fn_reverse_leave_on_cancel และ function เก่า
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'hrms.leave_request'::regclass
      AND p.proname = 'trg_fn_reverse_leave_on_cancel'
  LOOP
    EXECUTE format('DROP TRIGGER %I ON hrms.leave_request', r.tgname);
    RAISE NOTICE 'dropped trigger %', r.tgname;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS hrms.trg_fn_reverse_leave_on_cancel();
DROP FUNCTION IF EXISTS hrms.reverse_leave_balance_usage(bigint);
