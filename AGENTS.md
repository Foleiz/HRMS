# HRMS Project - Developer & Agent Working Rules

## 🌿 Git Branching & Merge Protocol (ข้อกำหนดเคร่งครัด)
ทุกครั้งที่มีการเริ่มงานใหม่ ไม่ว่าจะเป็นการพัฒนาฟีเจอร์ ปรับปรุงโค้ด หรือแก้บัก:

1. **ห้ามแก้โค้ดหรือพัฒนาบน branch `master` โดยตรงเด็ดขาด**
2. **สร้าง Branch ใหม่เสมอตามประเภทงาน**:
   - ฟีเจอร์ใหม่: `git checkout -b feat/<feature-name>`
   - แก้ไขบัก: `git checkout -b fix/<bug-name>`
   - งานปรับปรุงระบบ/เอกสาร: `git checkout -b chore/<task-name>`
3. **พัฒนาและทดสอบจนผ่านสมบูรณ์บน Branch นั้น**:
   - Backend Build: `dotnet build backend/src/Hrms.Api/Hrms.Api.csproj` (0 Errors)
   - Frontend TypeScript: `npx tsc --noEmit` (0 Errors)
   - Production Build: `npm run build` ใน `frontend/`
   - Automated Integration Tests ตามฟีเจอร์นั้นๆ
4. **Merge กลับเข้าสู่ `master` เฉพาะเมื่อได้รับการอนุมัติหรือคำสั่งจากผู้ใช้ (USER) โดยตรงเท่านั้น**:
   - **ห้าม Merge หรือ Push ขึ้น branch `master` (และ `syaco/main`) โดยเด็ดขาด** จนกว่าผู้ใช้จะสั่งคำสั่งให้ Merge ชัดเจน
   - เมื่อได้รับการยืนยันจากผู้ใช้ ให้อัปขึ้น **ทั้ง 2 Remote พร้อมกันเสมอ**:
     - `git checkout master`
     - `git merge <branch-name>`
     - `git push origin master` (อัปขึ้น https://github.com/Foleiz/HRMS.git)
     - `git push syaco master:main` (อัปขึ้น https://github.com/SyaCo-Co-Ltd/Hrm-Project.git)
