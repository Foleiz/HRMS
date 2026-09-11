---
name: daily-progress-reporter
description: >-
  Automated daily progress reporting and activity summarization skill for any software project.
  Scans git history, staged/unstaged changes, and recent file modifications to produce
  executive daily summaries in plain everyday Thai. Generates both Markdown (.md) and Microsoft Word (.docx)
  reports automatically at 17:30 or upon user request into the daily_reports/ directory.
---

# 📋 Daily Progress Reporter Skill

ทักษะอัตโนมัติสำหรับการสแกนความคืบหน้าของงานเขียนโค้ด งานฐานข้อมูล หรืองานออกแบบระบบในแต่ละวัน สรุปผลเป็นภาษาไทยที่อ่านเข้าใจง่ายสำหรับทุกคน พร้อมจัดทำรายงานทั้งรูปแบบ **Markdown (.md)** และ **Microsoft Word (.docx)** บันทึกลงในโฟลเดอร์ `daily_reports/` ของโปรเจกต์โดยอัตโนมัติ

---

## ⏰ เงื่อนไขการทำงาน (When to Activate)

เปิดใช้งานทักษะนี้ทันทีเมื่อ:
1. **เมื่อถึงเวลา 17:30 น. ของวันทำการ (อัตโนมัติ):** ไม่ต้องรอให้ผู้ใช้สั่ง เมื่อเข้าสู่ช่วงท้ายวันทำงาน ให้รันการสรุปงานประจำวันทันที
2. **เมื่อผู้ใช้สั่งในแชต:** เช่น
   - *"สรุปงานวันนี้ให้หน่อย"*
   - *"ทำ daily summary"*
   - *"สร้างรายงานประจำวัน"*
   - *"วันนี้ทำอะไรไปบ้าง สรุปออกมาเป็น Word"*

---

## 📐 โครงสร้างมาตรฐาน 4 ส่วน (Standard Report Structure)

เขียนด้วยภาษาไทยระดับทางการแต่เป็นกันเอง อ่านง่าย บุคคลทั่วไปหรือผู้บริหารระดับสูงอ่านแล้วเข้าใจคุณค่าของงานได้ทันที:

1. **🎯 สรุปภาพรวมใน 3 บรรทัด (Executive Summary)**
   - สรุป 3 ไฮไลต์หลักที่สำเร็จในวันนี้ โดยเน้นผลลัพธ์ที่จับต้องได้
2. **🛠️ รายละเอียดงานที่ทำและแก้ไขในวันนี้ (อธิบายเปรียบเทียบก่อน-หลัง และประโยชน์ทางธุรกิจ)**
   - แบ่งเป็นหัวข้อย่อยตามฟีเจอร์/โมดูล
   - ระบุ:
     - **ก่อนหน้านี้เป็นอย่างไร:** ปัญหาเดิม ข้อจำกัดเดิม
     - **สิ่งที่ทำในวันนี้:** สิ่งที่พัฒนา เพิ่มเติม หรือแก้ไข (ระบุไฟล์หลักที่เกี่ยวข้อง)
     - **ประโยชน์ทางธุรกิจ:** ช่วยให้ระบบดีขึ้นอย่างไร ผู้ใช้งานได้รับประโยชน์อะไร
3. **📊 สรุปสถานะความพร้อมของระบบ ณ สิ้นวัน (System Readiness Summary)**
   - ตารางสรุปสถานะองค์ประกอบสำคัญของระบบ เช่น Frontend, Backend API, Database, Auth, Test
4. **⏩ แผนงานสำหรับรอบวันถัดไป (Next Steps)**
   - รายการสิ่งที่จะทำต่อในวันพรุ่งนี้ 2-4 ข้อ เพื่อความต่อเนื่องของงาน

---

## 📁 มาตรฐานการตั้งชื่อและจัดเก็บไฟล์ (Naming & Storage)

* **โฟลเดอร์จัดเก็บ:** `<project_root>/daily_reports/`
* **รูปแบบชื่อไฟล์:** `{N}.daily_summary_{YYYY-MM-DD}.md` และ `{N}.daily_summary_{YYYY-MM-DD}.docx`
  * `{N}`: ตัวเลขลำดับรายงาน รันต่อเนื่องโดยอัตโนมัติ (เช่น `1.`, `2.`, `3.`) โดยตรวจหาค่าสูงสุดจากไฟล์เดิมในโฟลเดอร์ `daily_reports/` แล้ว `+ 1`
  * `{YYYY-MM-DD}`: วันที่ตามปี ค.ศ. เช่น `2026-09-10`

---

## 🛠️ ขั้นตอนการทำงานของ Agent (Step-by-Step Execution)

### ขั้นตอนที่ 1: ตรวจสอบความเปลี่ยนแปลงในโปรเจกต์
รันคำสั่งตรวจสอบการเปลี่ยนแปลงของโค้ด:
```bash
# ตรวจสอบประวัติ Commit ในวันนี้
git log --since="today 00:00:00" --stat --oneline

# ตรวจสอบไฟล์ที่มีการแก้ไขหรือยังไม่ได้ Commit
git status --short

# หรือใช้สคริปต์สแกนอัตโนมัติ
python .agent/skills/daily-progress-reporter/scripts/generate_daily_summary.py --scan
```

### ขั้นตอนที่ 2: วิเคราะห์เนื้อหาและสังเคราะห์ข้อความสรุป
- จัดกลุ่มการเปลี่ยนแปลงตามโมดูลงาน (Frontend, Backend, Database, Auth, DevOps)
- เรียบเรียงเป็นภาษาไทยที่อ่านง่าย ชัดเจน ตรงประเด็น
- กำหนดตัวเลขลำดับ `{N}` ถัดไป

### ขั้นตอนที่ 3: สร้างไฟล์รายงานทั้ง .md และ .docx
รันสคริปต์ตัวช่วยเพื่อสร้างไฟล์ทั้งสองรูปแบบพร้อมกัน:
```bash
python .agent/skills/daily-progress-reporter/scripts/generate_daily_summary.py --input-json "<path_to_summary_payload.json>"
```
หรือให้สคริปต์สร้างจากเทมเพลตมาตรฐานโดยอัตโนมัติ

---

## 📦 การพกพาไปใช้ในโปรเจกต์อื่น (Portability)

หากต้องการนำ Skill นี้ไปใช้ในโปรเจกต์อื่น:
1. คัดลอกทั้งโฟลเดอร์ `daily-progress-reporter` ไปวางไว้ที่:
   - `<โฟลเดอร์โปรเจกต์>/.agent/skills/daily-progress-reporter` หรือ
   - `<โฟลเดอร์โปรเจกต์>/.agents/skills/daily-progress-reporter`
2. ระบบ Antigravity ของโปรเจกต์นั้นจะค้นพบและโหลดทักษะนี้ให้ทันที
3. เรียกใช้งานได้ทันทีด้วยการบอกว่า *"สรุปงานประจำวัน"*