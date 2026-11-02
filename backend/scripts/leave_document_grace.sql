-- แนบเอกสารภายหลังได้ (ใบรับรองแพทย์ ฯลฯ)
alter table hrms.leave_policy add column if not exists document_grace_days integer null;
comment on column hrms.leave_policy.document_grace_days is 'แนบเอกสารภายหลังได้ภายในกี่วัน (null = ต้องแนบตอนยื่น)';
alter table hrms.leave_request add column if not exists document_due_date date null;
comment on column hrms.leave_request.document_due_date is 'กำหนดแนบเอกสารภายหลัง (null = ไม่มีค้างแนบ)';
