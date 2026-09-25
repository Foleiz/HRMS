import sys
import psycopg2

sys.stdout.reconfigure(encoding='utf-8')

# Names extracted from Excel 2026914172026.xls
excel_employees = [
    {"name": "job", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 4, "dept_id": 1, "div_id": 1},
    {"name": "เอฟ", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "เก่ง", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "kong", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "ปู", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 2, "dept_id": 3, "div_id": 2},
    {"name": "พี่โก", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 3, "dept_id": 1, "div_id": 1},
    {"name": "ปอ", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "เคนนี่", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "แบงค์", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "มีน", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "มาย", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "ปุก", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 2, "dept_id": 3, "div_id": 2},
    {"name": "ตาล", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "น้องก้อง", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "บอส", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "กบ", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "ต่าย", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "เวเฟอร์", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "คุณเอิร์ท", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 3, "dept_id": 1, "div_id": 1},
    {"name": "นัท", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "อัฐ", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "หมิง", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "คุณบู๊", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 4, "dept_id": 1, "div_id": 1},
    {"name": "บอส (สอง)", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "นัสริน", "prefix": "นางสาว", "gender": "หญิง", "gender_id": 2, "pos_id": 5, "dept_id": 1, "div_id": 1},
    {"name": "ฟิมล์", "prefix": "นาย", "gender": "ชาย", "gender_id": 1, "pos_id": 4, "dept_id": 1, "div_id": 1},
]

conn = psycopg2.connect('postgresql://postgres.uimkymtryijnpyybhewj:0953879143film@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require')
cur = conn.cursor()

try:
    # 1. Check current max ID
    cur.execute("SELECT COALESCE(MAX(id), 0) FROM hrms.employee")
    current_max_id = cur.fetchone()[0]
    print(f"Current Max ID in employee table: {current_max_id}")

    # Remove any existing employees from id 3 onwards if re-running
    cur.execute("""
        DELETE FROM hrms.employee_assignment WHERE employee_id > 2;
        DELETE FROM hrms.employee_contact WHERE employee_id > 2;
        DELETE FROM hrms.employee_address WHERE employee_id > 2;
        DELETE FROM hrms.user_role WHERE user_id IN (SELECT id FROM hrms.user_account WHERE employee_id > 2);
        DELETE FROM hrms.user_account WHERE employee_id > 2;
        DELETE FROM hrms.employee WHERE id > 2;
    """)

    # 2. Insert each employee
    inserted_count = 0
    for idx, emp in enumerate(excel_employees, start=3):
        emp_code = f"EMP{idx:04d}"
        citizen_id = f"1100200000{idx:03d}"
        citizen_masked = f"1-1002-xxxxx-{idx:02d}-{idx % 10}"
        birth_year = 1990 + (idx % 10)
        birth_date = f"{birth_year}-{(idx % 12) + 1:02d}-{(idx % 28) + 1:02d}"
        mil_status = "ผ่านการเกณฑ์ทหารแล้ว" if emp["gender"] == "ชาย" else "ได้รับการยกเว้น"

        # Insert Employee (biometric_id is explicitly NULL as requested)
        cur.execute("""
            INSERT INTO hrms.employee (
                id, employee_code, biometric_id, prefix, first_name, last_name,
                citizen_id, citizen_id_masked, birth_date, gender, gender_id,
                nationality, nationality_id, religion, religion_id,
                marital_status, marital_status_id, military_status,
                is_top_level, spouse_has_income, number_of_children,
                parent_deduction_count, disability_deduction_count,
                employment_status, created_at, updated_at
            ) VALUES (
                %s, %s, NULL, %s, %s, 'Syaco',
                %s, %s, %s, %s, %s,
                'ไทย', 1, 'พุทธ', 1,
                'โสด', 1, %s,
                false, false, 0,
                0, 0,
                'ACTIVE', NOW(), NOW()
            )
        """, (
            idx, emp_code, emp["prefix"], emp["name"],
            citizen_id, citizen_masked, birth_date, emp["gender"], emp["gender_id"],
            mil_status
        ))

        # Insert Contact
        cur.execute("""
            INSERT INTO hrms.employee_contact (
                employee_id, personal_phone, personal_email, organization_email
            ) VALUES (%s, %s, %s, %s)
        """, (
            idx,
            f"081-000-{idx:04d}",
            f"emp{idx:04d}@gmail.com",
            f"emp{idx:04d}@syaco.co.th"
        ))

        # Insert Assignment
        cur.execute("""
            INSERT INTO hrms.employee_assignment (
                employee_id, department_id, division_id, position_id, is_current, effective_from
            ) VALUES (%s, %s, %s, %s, true, '2024-01-01')
        """, (
            idx, emp["dept_id"], emp["div_id"], emp["pos_id"]
        ))

        # Insert Address
        cur.execute("""
            INSERT INTO hrms.employee_address (
                employee_id, address_line, sub_district, district, province, postal_code, is_current, address_type
            ) VALUES (%s, %s, 'บางจาก', 'พระโขนง', 'กรุงเทพมหานคร', '10260', true, 'CURRENT')
        """, (
            idx, f"99/{idx} อาคารไซยาโค่ ถ.สุขุมวิท 101"
        ))

        inserted_count += 1

    # Update sequence
    cur.execute(f"SELECT setval(pg_get_serial_sequence('hrms.employee', 'id'), {2 + inserted_count})")

    conn.commit()
    print(f"Successfully simulated and inserted {inserted_count} employees (EMP0003 to EMP{2 + inserted_count:04d}) from Excel!")

    # Verify count
    cur.execute("SELECT COUNT(*) FROM hrms.employee")
    total = cur.fetchone()[0]
    print(f"Total employees now in database: {total}")

except Exception as e:
    conn.rollback()
    print("Error during insertion:", e)
finally:
    cur.close()
    conn.close()
