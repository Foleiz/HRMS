-- คำนวณประเภทคำสั่งโยกย้ายใหม่ตามกฎเดียวกับ TransferTypes.Classify (QA 4 พ.ย. 2569)
--   แผนกต่าง → DEPARTMENT_TRANSFER
--   ตำแหน่งต่าง → เทียบ level_rank: สูงขึ้น PROMOTION / ต่ำลง DEMOTION / เท่าเดิมหรือไม่ทราบ POSITION_CHANGE
--   ไม่เปลี่ยนทั้งแผนกและตำแหน่ง → คงค่าเดิมไว้
-- รันครั้งเดียว (รันซ้ำได้ ผลเหมือนเดิม)

with c as (
  select t.id,
    concat_ws(',',
      case when t.from_department_id is distinct from t.to_department_id then 'DEPARTMENT_TRANSFER' end,
      case when t.from_position_id is distinct from t.to_position_id then
        case when fl.level_rank is not null and tl.level_rank is not null and tl.level_rank > fl.level_rank then 'PROMOTION'
             when fl.level_rank is not null and tl.level_rank is not null and tl.level_rank < fl.level_rank then 'DEMOTION'
             else 'POSITION_CHANGE' end
      end) as new_type
  from hrms.employee_transfer_request t
  left join hrms.position fp on fp.id = t.from_position_id
  left join hrms.employee_level fl on fl.id = fp.employee_level_id
  left join hrms.position tp on tp.id = t.to_position_id
  left join hrms.employee_level tl on tl.id = tp.employee_level_id
)
update hrms.employee_transfer_request t
set transfer_type = c.new_type
from c
where c.id = t.id and c.new_type <> '' and c.new_type is distinct from t.transfer_type;

-- ค่าเดิมก่อนรัน (ไว้ย้อนกลับ):
-- 13 DEPARTMENT_TRANSFER | 16 PROMOTION | 17 PROMOTION | 19 DEPARTMENT_TRANSFER | 20 DEPARTMENT_TRANSFER
-- 21 DEPARTMENT_TRANSFER | 22 DEPARTMENT_TRANSFER | 23 DEPARTMENT_TRANSFER | 24 DEPARTMENT_TRANSFER
-- 25 PROMOTION | 26 DEPARTMENT_TRANSFER,PROMOTION | 27 PROMOTION | 28 DEPARTMENT_TRANSFER
-- 29 DEPARTMENT_TRANSFER | 30 DEPARTMENT_TRANSFER | 31 DEPARTMENT_TRANSFER | 32 PROMOTION | 35 DEPARTMENT_TRANSFER
