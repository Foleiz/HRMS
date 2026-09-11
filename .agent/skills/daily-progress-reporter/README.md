# 📋 Daily Progress Reporter Skill (Antigravity Custom Skill)

ทักษะอัจฉริยะสำหรับ Antigravity และ Google Gemini Assistant เพื่อช่วยสร้าง **"รายงานสรุปความคืบหน้าประจำวัน (Daily Progress Report)"** แบบมืออาชีพ ครอบคลุมทั้งไฟล์ **Markdown (.md)** และเอกสาร **Microsoft Word (.docx)** โดยอัตโนมัติ

---

## 🌟 จุดเด่นของ Skill นี้
1. **ภาษาไทยเข้าใจง่ายระดับผู้บริหาร:** เรียบเรียงเนื้อหาให้อ่านเข้าใจง่าย คนทั่วไปหรือหัวหน้างานเปิดอ่านแล้วเข้าใจคุณค่าของงานได้ทันที ไม่จมกับศัพท์เทคนิค
2. **สร้างพร้อมกัน 2 รูปแบบ (Dual Export):**
   - `.md` สำหรับโปรแกรมเมอร์และทีมพัฒนา
   - `.docx` สำหรับผู้บริหาร จัดหน้าสวยงาม ใช้ฟอนต์ TH Sarabun New พร้อมตารางสีสันสะอาดตา
3. **สแกนประวัติ Git อัตโนมัติ:** ตรวจจับ Commits ในแต่ละวัน, ไฟล์ที่แก้ไข, และโครงสร้างโปรเจกต์
4. **รันลำดับเลขอัตโนมัติ (`{N}.`):** ตรวจหาไฟล์ใน `daily_reports/` แล้วเพิ่มเลข `1.`, `2.`, `3.` ให้อัตโนมัติ

---

## 🚀 วิธีนำไปใช้ในโปรเจกต์อื่น (How to Deploy)

คัดลอกโฟลเดอร์ `daily-progress-reporter` ไปวางในโปรเจกต์เป้าหมาย:
```bash
# โครงสร้างที่แนะนำ
<your-project>/
├── .agent/
│   └── skills/
│       └── daily-progress-reporter/
│           ├── SKILL.md
│           ├── README.md
│           ├── scripts/
│           └── references/
```

### สั่งงานผ่านแชต Antigravity:
เมื่อเปิดโปรเจกต์นั้นใน Antigravity สามารถพิมพ์สั่งได้ทันที เช่น:
- *"สรุปงานประจำวันของโปรเจกต์นี้ให้หน่อย"*
- *"ช่วยทำ daily summary ออกมาเป็น Word"*
- หรือเมื่อถึงเวลา 17:30 น. AI จะตรวจจับและเสนอสรุปงานให้อัตโนมัติ

### หรือสั่งรันสคริปต์ด้วยตนเองผ่าน Terminal:
```bash
# สแกนกิจกรรมในโปรเจกต์
python .agent/skills/daily-progress-reporter/scripts/generate_daily_summary.py --scan

# สร้างไฟล์รายงาน (.md และ .docx) ลงในโฟลเดอร์ daily_reports/
python .agent/skills/daily-progress-reporter/scripts/generate_daily_summary.py
```