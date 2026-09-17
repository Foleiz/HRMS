# Git Branching & Merge Protocol

## 🎯 กฎระเบียบการใช้งาน Git ในโปรเจกต์ HRMS
ทุกครั้งที่มีการพัฒนาฟีเจอร์ใหม่ ปรับปรุงโค้ด หรือแก้ไขบัก (Bug Fix):

1. **ห้ามทำงานบน branch `master` โดยตรงเด็ดขาด:**
   - ก่อนเริ่มลงมือแก้ไขโค้ด ให้ดึงการอัปเดตล่าสุด: `git checkout master && git pull origin master`
   - แตก Branch ใหม่เสมอตามประเภทของงาน เช่น:
     - ฟีเจอร์ใหม่: `git checkout -b feat/<feature-name>`
     - แก้ไขบัก: `git checkout -b fix/<bug-name>`
     - งานเอกสาร/ฐานข้อมูล: `git checkout -b chore/<task-name>`

2. **พัฒนาและทดสอบบน Feature Branch จนเสร็จสมบูรณ์:**
   - รันการตรวจสอบความสมบูรณ์ (`dotnet build`, `npx tsc --noEmit`, `npm run build`, Automated E2E tests) บน Feature Branch ให้ผ่าน 100%
   - ทำการ Commit บน Feature Branch ด้วยข้อความภาษาไทยที่มีความหมายชัดเจน

3. **การ Merge กลับเข้าสู่ `master`:**
   - สลับกลับมาที่ master: `git checkout master`
   - ตรวจสอบความพร้อมและรวมโค้ด: `git merge feat/<feature-name>`
   - รัน Verification ซ้ำบน master เพื่อความมั่นใจว่าไม่มี Regression
   - ดำเนินการ `git push origin master`
   - ลบ local branch ชั่วคราว (ถ้าไม่จำเป็นต้องเก็บไว้): `git branch -d feat/<feature-name>`
