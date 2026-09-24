import sys
import psycopg2

sys.stdout.reconfigure(encoding='utf-8')
conn = psycopg2.connect('postgresql://postgres.uimkymtryijnpyybhewj:0953879143film@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require')
cur = conn.cursor()

# 1. Add employment_status column if not exists
cur.execute("""
    ALTER TABLE hrms.employee
    ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';
""")

# 2. Seed initial statuses for existing 10 employees
cur.execute("""
    UPDATE hrms.employee SET employment_status = 'ACTIVE'
    WHERE employment_status IS NULL OR employment_status = '';
""")

conn.commit()

# 3. Verify
cur.execute("SELECT id, employee_code, employment_status FROM hrms.employee ORDER BY id")
for row in cur.fetchall():
    print(f"ID: {row[0]}, Code: {row[1]}, Status: {row[2]}")

conn.close()
print("Done!")
