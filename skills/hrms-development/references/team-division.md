# HRMS Team Division & Development Guide (2 Developers)

## Core Philosophy
- **Model**: Vertical Slice Architecture (Full-Stack per feature).
- **Ownership**: Each developer owns the Frontend (Next.js) and Backend (.NET C#) for their assigned features.
- **Rule**: Avoid editing the other developer's feature folders to prevent Git conflicts.

---

## 👨‍💻 Developer 1: Workforce & Time Operations (Track A)
Focus: Time-series scheduling, Biometric/Excel batch importing, and Organization hierarchy.

### Assigned Modules:
1. **Module 1: Organization & Master Data**
   - Company profile & Logo
   - Divisions (`division`) & Departments (`department` 1:N hierarchy)
   - Positions (`position`) & Employee Levels (`employee_level`)
   - Work Week (`work_week`) & Company Holidays (`holiday`)
   - Commercial Banks Master (`bank`)

2. **Module 3: Time & Attendance Tracking**
   - Work shifts (`shift` - with cross-day & grace periods)
   - Work schedules (`work_schedule`) & Employee Shift assignments (`employee_shift`)
   - Daily Attendance (`attendance_daily` - auto sync with shifts, late/early calculation)
   - Biometric/Excel Import Batch (`attendance_import_batch`, `attendance_import_error` with SHA-256 hash)
   - Attendance Adjustment requests (`attendance_adjustment`)
   - Monthly Attendance Summary (`attendance_monthly_summary`)

3. **Module 6 (Part A): ESS Attendance Features**
   - Employee Daily Attendance clock-in/out overview
   - Attendance adjustment submission form
   - Late/Early leave statistics

4. **Module 8 (Part A): Operational Reports**
   - Daily Department Headcount snapshot (`report_department_headcount_daily`)
   - Attendance & Lateness monthly report

---

## 👩‍💻 Developer 2: Talent, Leave & Compensation (Track B)
Focus: PDPA Sensitive Data Security (AES-256), Balance Ledgers/Transactions, and Payroll Calculations.

### Assigned Modules:
1. **Module 2: Core Employee Management & PDPA**
   - Personal information, Address, Contacts, Emergency Contacts
   - Family members & dependents (for tax deductions)
   - Education history, Work experiences
   - Employee Bank accounts (`employee_bank_account`)
   - Social Security registration (`employee_social_security`)
   - Employee Documents (`employee_document`)
   - PDPA Sensitive data handling: Citizen ID & Social Security encryption (`bytea`) and masking

2. **Module 2 (Cont.): Employment Contracts & Lifecycle**
   - Contracts (`employment_contract` - Probation, Permanent, Fixed-Term)
   - Job Assignments & transfers (`employee_assignment`)
   - Status transitions (`employee_status_history`)

3. **Module 4: Leave Management**
   - Leave Types (`leave_type` - Paid/Unpaid, Day/Hour)
   - Leave Policies (`leave_policy` - probation restrictions, service days, carry forward limits)
   - Leave Balances & Ledger (`leave_balance`, `leave_balance_transaction`)
   - Leave Requests (`leave_request`) & Medical Certificate attachments
   - Year-end Leave Rollover logic

4. **Module 5: Payroll & Compensation Engine**
   - Salary Structures (`salary_structure`) & Employee Salary history (`employee_salary`)
   - Payroll Items (`payroll_item` - Earnings & Deductions, taxable/social security)
   - Tax Brackets (`tax_bracket` - progressive tax rates)
   - Social Security Rates (`social_security_rate`)
   - Employee Loans & Installments (`employee_loan`, `loan_installment`)
   - Payroll Period processing (`payroll_period`, `payroll`, `payroll_detail`)
   - Bank Transfer export file (`payroll_payment`, `payroll_payment_detail`)
   - Payslip generation with password protection (`payslip`)

5. **Module 6 (Part B): ESS Profile, Leave & Payslip**
   - My Profile & Family info view
   - Leave submission & real-time balance check
   - E-Payslip download (PDF)
   - Certificate requests (`certificate_request`)
   - Resignation requests (`resignation_request`)

6. **Module 8 (Part B): Financial & HR Analytics Reports**
   - Monthly Turnover rate (`report_turnover_monthly`)
   - Payroll summary & Tax withholding report

---

## 🤝 Shared Foundation (Provided by AI in Phase 0 & Phase 1)
- Solution Scaffolding (.NET Web API + Next.js App Router)
- PostgreSQL EF Core `HrmsDbContext` mapping to `hrms` schema
- Global Exception Handling Middleware
- Standard API Response wrapper: `{ success: bool, data: T, message: string, errors: string[] }`
- AES-256 Crypto & Masking Helper
- JWT Authentication & RBAC Data Scope Provider (`SELF`, `TEAM`, `DEPARTMENT`, `DIVISION`, `ORGANIZATION`)
- Generic Approval Engine (`approval_flow`, `approval_step`, `approval_instance`, `approval_action`, `approval_delegation`)
- Shared UI Shell (Sidebar, Header, Table, Modal, Button, Form components)
- Reference Feature Blueprint (Complete Master Data CRUD fullstack code to copy patterns from)
