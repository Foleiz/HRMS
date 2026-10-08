-- อ่านอย่างเดียว (ไม่แก้ข้อมูล): ดูโค้ดของ trigger function เก่าที่อาจทำงานซ้ำซ้อน/พังกับโค้ด C#
SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'hrms'
  AND p.proname IN (
    'fn_auto_sync_attendance_schedule',
    'fn_calculate_attendance_metrics',
    'sync_document_status_from_approval',
    'fn_advance_approval_instance',
    'fn_init_approval_instance_step'
  )
ORDER BY p.proname;
