#!/usr/bin/env python3
"""ตัดข้อมูล (COPY) ของตารางที่ไม่อยู่ใน KEEP ออกจาก pg_dump แบบ plain เหลือ schema/function/trigger ครบ + ข้อมูลตั้งต้นเฉพาะที่เลือก
ใช้: filter-dump.py <dump.sql> <out.sql> [--keep t1,t2,...] [--keep-file keep.txt] [--null-col table.col]
- แก้ CREATE SCHEMA ให้ IF NOT EXISTS, ตัด \\restrict/\\unrestrict (ไม่ผูกกับเวอร์ชัน psql)
- --null-col table.col ตั้งค่าคอลัมน์นั้นเป็น NULL ในตารางที่เก็บข้อมูล
- ตัด setval ของ sequence ที่เป็นของตารางที่ตัดข้อมูล (ให้ id เริ่มที่ 1)
"""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
keep = set(); nullcols = {}
a = sys.argv[3:]
while a:
    k = a.pop(0)
    if k == '--keep': keep |= {t.strip() for t in a.pop(0).split(',') if t.strip()}
    elif k == '--null-col':
        t, c = a.pop(0).split('.'); nullcols.setdefault(t, set()).add(c)
    elif k == '--keep-file': keep |= {l.split('#')[0].strip() for l in open(a.pop(0)) if l.split('#')[0].strip()}
lines = open(src, encoding='utf-8').read().split('\n')
tables = set(re.findall(r'^CREATE TABLE hrms\.("?[A-Za-z0-9_]+"?) ', '\n'.join(lines), re.M))
tables = {t.strip('"') for t in tables}
unknown = keep - tables
if unknown: sys.exit(f"ไม่พบตารางใน dump: {sorted(unknown)}")
drop = tables - keep
def owner(seq):  # longest table name that prefixes the sequence name
    c = [t for t in tables if seq.startswith(t + '_')]
    return max(c, key=len) if c else None
out, i, kept_rows, dropped_rows, dropped_seq = [], 0, {}, {}, 0
while i < len(lines):
    l = lines[i]
    if re.match(r'^\\(un)?restrict ', l): i += 1; continue
    if re.match(r'^ALTER TABLE hrms\.\w+ ENABLE ROW LEVEL SECURITY;$', l): i += 1; continue  # RLS ที่ไม่มี policy (ร่องรอยจาก Supabase) ทำให้ pg_dump ของ backup_mgr ล้ม
    if l == 'CREATE SCHEMA hrms;': out.append('CREATE SCHEMA IF NOT EXISTS hrms;'); i += 1; continue
    m = re.match(r'^COPY hrms\.("?[A-Za-z0-9_]+"?) ', l)
    if m:
        t = m.group(1).strip('"'); j = i + 1
        while lines[j] != '\\.': j += 1
        n = j - i - 1
        if t in keep:
            if t in nullcols:  # ตั้งค่าคอลัมน์ที่อ้างตารางซึ่งไม่ได้โหลดเป็น NULL (กัน FK ล้ม)
                cols = [c.strip().strip('"') for c in re.search(r'\((.*)\)', l).group(1).split(',')]
                idx = [cols.index(c) for c in nullcols[t]]
                out.append(l)
                for r in lines[i + 1:j]:
                    f = r.split('\t')
                    for ix in idx: f[ix] = '\\N'
                    out.append('\t'.join(f))
                out.append('\\.')
            else: out.extend(lines[i:j + 1])
            kept_rows[t] = n
        else: dropped_rows[t] = n
        i = j + 1; continue
    m = re.match(r"^SELECT pg_catalog\.setval\('hrms\.([A-Za-z0-9_]+)'", l)
    if m and owner(m.group(1)) in drop: dropped_seq += 1; i += 1; continue
    out.append(l); i += 1
open(dst, 'w', encoding='utf-8').write('\n'.join(out))
print(f"tables {len(tables)} | keep data {len(kept_rows)} ตาราง ({sum(kept_rows.values())} แถว) | ตัดข้อมูล {len(dropped_rows)} ตาราง ({sum(dropped_rows.values())} แถว) | ตัด setval {dropped_seq}")
for t in sorted(kept_rows): print(f"  keep {t}: {kept_rows[t]}")
