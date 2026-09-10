# Enterprise HRMS (Human Resource Management System)

ระบบบริหารทรัพยากรบุคคลระดับองค์กร พัฒนาด้วยสถาปัตยกรรม **Full-Stack Vertical Slice** แบ่งงานสำหรับทีมพัฒนา 2 คน
- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS, Lucide Icons, Axios)
- **Backend**: ASP.NET Core (.NET 10) Web API (Clean Architecture: Domain, Application, Infrastructure, Api)
- **Database**: PostgreSQL บน Supabase (สคีมา `hrms` จำนวน 77+ ตาราง พร้อมระบบ Triggers & Stored Procedures)

---

## 🚀 วิธีการรันโปรเจกต์ในเครื่อง (Getting Started)

### 1. รันฝั่ง Backend (.NET 10 Web API)
```bash
cd backend
dotnet run --project src/Hrms.Api
```
* **API Base URL**: `http://localhost:5000`
* **Swagger API Documentation**: `http://localhost:5000/swagger`

### 2. รันฝั่ง Frontend (Next.js)
```bash
cd frontend
npm run dev
```
* **Web Portal URL**: `http://localhost:3000`
* **Reference Feature (ข้อมูลธนาคาร)**: `http://localhost:3000/master/banks`

---

## 👥 การแบ่งงานของทีม (2 Developers)

ระบบถูกออกแบบโครงสร้างโฟลเดอร์ให้แบ่งกันทำคนละสายงานแบบ Full-Stack เพื่อป้องกันปัญหา Git Merge Conflicts:

| Developer | สายงาน (Track) | ขอบเขตโมดูลหลัก |
| :--- | :--- | :--- |
| **👨‍💻 Dev 1** | **Track A: Workforce & Time Operations** | ผังองค์กร (ฝ่าย/แผนก/ตำแหน่ง), กะการทำงาน (Shift), ปฏิทินวันหยุด, นำเข้าเวลาสแกนนิ้วจาก Excel (Batch Import), คำขอแก้ไขเวลาเข้างาน (Attendance Adjustment), ESS บันทึกเวลา |
| **👩‍💻 Dev 2** | **Track B: Talent, Leave & Compensation** | ทะเบียนข้อมูลพนักงาน (PDPA AES-256 Encryption & Masking), สัญญาจ้างงาน, ระบบการลาและโควตา (Leave Ledger), เครื่องยนต์คำนวณเงินเดือน (Payroll & Tax Bracket), สลิปเงินเดือน (PDF Password) |

> 📖 อ่านรายละเอียดและขั้นตอนของแต่ละโมดูลได้ที่: [skills/hrms-development/references/team-division.md](skills/hrms-development/references/team-division.md)

---

## 📂 โครงสร้างโฟลเดอร์ (Directory Structure)

```text
Project_69/
├── .agent/skills/hrms-development/   <-- Custom Skill สำหรับ AI Assistant
│   ├── SKILL.md                      <-- กฎเหล็ก 10 ข้อ, สถาปัตยกรรมระบบ
│   └── references/
│       ├── schema.sql                <-- DDL สคีมา PostgreSQL ตัวเต็ม
│       └── team-division.md          <-- รายละเอียดการแบ่งงาน Dev 1 & Dev 2
├── backend/                          <-- .NET 10 Solution
│   ├── HrmsBackend.slnx
│   └── src/
│       ├── Hrms.Domain/              <-- Entity & Enums (Core Models)
│       ├── Hrms.Application/         <-- DTOs, Services, Business Logic (แยก Feature)
│       ├── Hrms.Infrastructure/      <-- EF Core HrmsDbContext, Dapper, Security
│       └── Hrms.Api/                 <-- Controllers, Middleware, Program.cs
└── frontend/                         <-- Next.js 16 App Router
    └── src/
        ├── app/
        │   ├── page.tsx              <-- หน้า Dashboard ภาพรวมระบบ
        │   └── (admin)/
        │       └── master/banks/     <-- Reference Feature ตัวอย่าง
        ├── components/layout/        <-- Sidebar & Navbar เมนูกลาง
        ├── lib/api-client.ts         <-- Axios Instance กลาง
        ├── services/                 <-- API Services แยกตามโมดูล
        └── types/                    <-- TypeScript Interfaces
```

---

## 📜 กติกาเหล็ก 10 ข้อในการพัฒนา (Strict Engineering Rules)
1. ห้ามเขียนโค้ดทันทีโดยไม่วางแผน
2. วิเคราะห์ Database Schema และขอบเขตก่อนเสมอ
3. วางแผนแยกเป็น Feature/Module ย่อย ไม่ทำทั้งระบบทีเดียว
4. ขออนุมัติแผนก่อนเริ่มเขียนโค้ด
5. แจ้งรายชื่อไฟล์ที่จะสร้าง/แก้ไขล่วงหน้า
6. สรุปสิ่งที่แก้เสมือน Commit Message ทุกรอบ
7. ห้ามแก้ไฟล์ที่ไม่เกี่ยวข้องโดยไม่จำเป็น
8. เขียนโค้ดให้อ่านง่าย มีคอมเมนต์อธิบาย
9. ยึดมั่น Security & PDPA (AES-256 Masking & Scoped Authorization)
10. อธิบาย Flow และจุดเฝ้าระวังความปลอดภัยหลังทำเสร็จแต่ละรอบ
