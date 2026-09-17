# Reference: HRMS Approval Flow Engine & Triggers

คู่มือเชิงลึกสำหรับระบบสายการอนุมัติ (Approval Flow Engine) และการเชื่อมต่อกับฐานข้อมูล PostgreSQL ในโครงการ HRMS

---

## 1. โครงสร้างตารางฐานข้อมูล (Database Schema)

### `hrms.approval_flow`
ตารางนิยามสายการอนุมัติหลัก:
- `id` (SERIAL PRIMARY KEY)
- `flow_code` (VARCHAR(50) UNIQUE) เช่น `FLOW_LEAVE_DEFAULT`, `FLOW_TIME_ADJ_DEFAULT`
- `flow_name` (VARCHAR(150)) เช่น "สายการอนุมัติการลาทั่วไป", "สายการอนุมัติขอปรับปรุงเวลาเข้า-ออกงาน"
- `document_type` (VARCHAR(50)) เช่น `LEAVE`, `TIME_ADJUSTMENT`, `TRANSFER`, `RESIGNATION`
- `department_id` (INTEGER, NULLABLE) - หากระบุ แปลว่าเป็นสายเฉพาะของแผนกนั้น หากเป็น NULL คือสายตั้งต้นของทั้งบริษัท
- `is_active` (BOOLEAN DEFAULT TRUE)

### `hrms.approval_flow_step`
ตารางขั้นตอนในแต่ละสายการอนุมัติ:
- `id` (SERIAL PRIMARY KEY)
- `approval_flow_id` (INTEGER REFERENCES `hrms.approval_flow(id)`)
- `step_order` (INTEGER) - ลำดับขั้นตอน (1, 2, 3...)
- `step_name` (VARCHAR(100)) เช่น "หัวหน้างานโดยตรง (Manager)", "ฝ่ายบุคคล (HR Admin)"
- `approver_type` (VARCHAR(30)) - `MANAGER`, `SPECIFIC_EMPLOYEE`, `ROLE`
- `specific_approver_id` (INTEGER REFERENCES `hrms.employee(id)`, NULLABLE)
- `approver_role` (VARCHAR(50), NULLABLE) เช่น `HR_ADMIN`, `CEO`

### `hrms.approval_request`
ตารางบันทึกการส่งคำขออนุมัติ:
- `id` (SERIAL PRIMARY KEY)
- `approval_flow_id` (INTEGER REFERENCES `hrms.approval_flow(id)`)
- `document_type` (VARCHAR(50))
- `document_id` (INTEGER) - ID ของแถวในตารางเอกสารต้นทาง เช่น `leave_request.id` หรือ `attendance_adjustment.id`
- `requester_id` (INTEGER REFERENCES `hrms.employee(id)`)
- `current_step` (INTEGER DEFAULT 1)
- `status` (VARCHAR(30)) - `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`

### `hrms.approval_action`
ประวัติการดำเนินการของผู้อนุมัติ:
- `id` (SERIAL PRIMARY KEY)
- `approval_request_id` (INTEGER REFERENCES `hrms.approval_request(id)`)
- `step_number` (INTEGER)
- `approver_id` (INTEGER REFERENCES `hrms.employee(id)`)
- `action` (VARCHAR(30)) - `APPROVED`, `REJECTED`
- `comment` (TEXT)
- `action_date` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

---

## 2. PostgreSQL Triggers & Stored Procedures

### การทำงานร่วมกับ Trigger เมื่อคำขอได้รับการอนุมัติขั้นสุดท้าย (Final Step Approved):
1. **การปรับปรุงเวลา (Attendance Adjustment):**
   - เมื่อ `approval_request.status` กลายเป็น `APPROVED`
   - Stored Procedure `hrms.apply_attendance_adjustment(document_id)` จะทำงาน:
     - ดึงข้อมูลเวลาที่ปรับปรุงใหม่ (`adjusted_clock_in`, `adjusted_clock_out`)
     - เขียนทับลงใน `hrms.attendance_daily`
     - คำนวณนาทีที่มาสาย (`late_minutes`) และออกก่อน (`early_departure_minutes`) ใหม่โดยอัตโนมัติตามกะการทำงาน (Work Shift)
2. **การลา (Leave Request):**
   - เมื่อได้รับอนุมัติ `hrms.sync_document_status_from_approval` จะปรับสถานะ `hrms.leave_request.status` เป็น `APPROVED`
   - Trigger `hrms.apply_leave_balance_usage` จะตัดลดยอดวันลาใน `hrms.leave_balance` ทันที

---

## 3. กฎเกณฑ์ที่ควรทราบ (Business Rules)
1. **การตัด Delegation:** ระบบไม่มีการอนุมัติแทน เพื่อความง่ายในการคำนวณและไม่มีช่องโหว่ด้านสิทธิ์
2. **Fallback เมื่อหา Manager ไม่พบ:** หากพนักงานไม่มีหัวหน้างานในสายบังคับบัญชา ระบบจะส่งต่อไปยังผู้มีบทบาท `HR_ADMIN` หรือ `ADMIN` โดยอัตโนมัติ เพื่อป้องกันคำขอค้างในระบบ (Deadlock)
