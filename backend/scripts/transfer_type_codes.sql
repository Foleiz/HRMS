-- ประเภทโยกย้ายแบบใหม่: เก็บเป็นรหัสคั่นจุลภาค (DEPARTMENT_TRANSFER, PROMOTION, POSITION_CHANGE, DEMOTION)
-- แปลงเฉพาะค่าเดิมแบบรวม — รายการอื่นคงประเภทตามที่บันทึกไว้
update hrms.employee_transfer_request set transfer_type = 'DEPARTMENT_TRANSFER,PROMOTION' where transfer_type = 'TRANSFER_AND_PROMOTION';
update hrms.employee_transfer_request set transfer_type = 'PROMOTION' where transfer_type = 'PROMOTION_AND_SUPERVISOR';
