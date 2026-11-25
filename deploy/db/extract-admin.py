#!/usr/bin/env python3
"""สร้าง SQL โหลดบัญชีผู้ดูแลเดิม (employee + user_account + user_role) จาก pg_dump -- ใช้กับ DB ที่โหลด hrms-prod-load.sql แล้ว
ใช้: extract-admin.py <dump.sql> <out.sql> <username> [<username> ...]
ไม่รวม employee_assignment (แผนก/ตำแหน่ง ต้องตั้งค่าใหม่ในระบบ)  ค่า password_hash เป็นของเดิมจาก dev -> ควรเปลี่ยนรหัสผ่านทันที"""
import re, sys
src, dst, users = sys.argv[1], sys.argv[2], set(sys.argv[3:])
s = open(src, encoding='utf-8').read().split('\n')
def block(t):
    for i, l in enumerate(s):
        m = re.match(r'^COPY hrms\.("?%s"?) \((.*)\) FROM stdin;' % t, l)
        if m:
            cols = [c.strip() for c in m.group(2).split(',')]; rows = []; j = i + 1
            while s[j] != '\\.': rows.append(s[j].split('\t')); j += 1
            return m.group(1), cols, rows
tn, uc, ur = block('user_account'); idx = {c.strip('"'): i for i, c in enumerate(uc)}
sel = [r for r in ur if r[idx['username']] in users]
missing = users - {r[idx['username']] for r in sel}
if missing: sys.exit(f"ไม่พบ username: {sorted(missing)}")
uids = {r[idx['id']] for r in sel}; eids = {r[idx['employee_id']] for r in sel}
en, ec, er = block('employee'); er = [r for r in er if r[0] in eids]
rn, rc, rr = block('user_role'); rr = [r for r in rr if r[0] in uids]
out = ['BEGIN;']
for n, c, rows in ((en, ec, er), (tn, uc, sel), (rn, rc, rr)):
    out.append(f"COPY hrms.{n} ({', '.join(c)}) FROM stdin;"); out += ['\t'.join(r) for r in rows]; out.append('\\.')
out.append("SELECT setval(pg_get_serial_sequence('hrms.employee','id'), (SELECT max(id) FROM hrms.employee));")
out.append("SELECT setval(pg_get_serial_sequence('hrms.user_account','id'), (SELECT max(id) FROM hrms.user_account));")
out.append('COMMIT;')
open(dst, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f"employee {len(er)} | user_account {len(sel)} | user_role {len(rr)} -> {dst}")
