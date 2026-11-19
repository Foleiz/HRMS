import os
import random
import urllib.request
import json
import datetime
import shutil
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Ensure directories exist
os.makedirs('C:/Project/HRMS/attendance_october_2026', exist_ok=True)
os.makedirs('C:/Project/HRMS/frontend/public/templates/attendance_october_2026', exist_ok=True)
os.makedirs('C:/Users/NASSARIN/Downloads/attendance_october_2026', exist_ok=True)

# 1. Fetch active employees
try:
    login_req = urllib.request.Request(
        'http://localhost:5229/api/auth/login',
        data=json.dumps({'username': 'admin', 'password': 'Admin#2026!Sec'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as res:
        token = json.loads(res.read().decode('utf-8'))['data']['token']

    emp_req = urllib.request.Request(
        'http://localhost:5229/api/employees',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(emp_req) as res:
        all_emps = json.loads(res.read().decode('utf-8'))['data']
        active_emps = [e for e in all_emps if e.get('employmentStatus') == 'ACTIVE']
except Exception as e:
    print(f'API fetch failed ({e}), using fallback list')
    active_emps = []

if not active_emps:
    active_emps = [
        {'id': 1, 'employeeCode': 'EMP0001', 'biometricId': None, 'fullName': 'นาย admin orange', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 2, 'employeeCode': 'EMP0002', 'biometricId': None, 'fullName': 'นางสาว HR Syaco', 'departmentName': 'แผนกสรรหาและพัฒนาบุคลากร'},
        {'id': 3, 'employeeCode': 'EMP0003', 'biometricId': '100001', 'fullName': 'นาย จ๊อบ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 4, 'employeeCode': 'EMP0004', 'biometricId': '100002', 'fullName': 'นาย เอฟ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 5, 'employeeCode': 'EMP0005', 'biometricId': '100003', 'fullName': 'นาย พี่เก่ง Syaco', 'departmentName': 'แผนกสรรหาและพัฒนาบุคลากร'},
        {'id': 6, 'employeeCode': 'EMP0006', 'biometricId': '100005', 'fullName': 'นาย kong Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 7, 'employeeCode': 'EMP0007', 'biometricId': '100008', 'fullName': 'นางสาว ปู Syaco', 'departmentName': 'แผนกสรรหาและพัฒนาบุคลากร'},
        {'id': 8, 'employeeCode': 'EMP0008', 'biometricId': '100009', 'fullName': 'นาย โกร Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 9, 'employeeCode': 'EMP0009', 'biometricId': '100010', 'fullName': 'นางสาว ปอ Syaco', 'departmentName': 'แผนกบัญชี'},
        {'id': 10, 'employeeCode': 'EMP0010', 'biometricId': '100011', 'fullName': 'นาย เคนนี่ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 11, 'employeeCode': 'EMP0011', 'biometricId': '100012', 'fullName': 'นาย แบงค์ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 12, 'employeeCode': 'EMP0012', 'biometricId': '100013', 'fullName': 'นางสาว มีน Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 13, 'employeeCode': 'EMP0013', 'biometricId': '100014', 'fullName': 'นางสาว มาย Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 14, 'employeeCode': 'EMP0014', 'biometricId': '100015', 'fullName': 'นางสาว ปุก Syaco', 'departmentName': 'แผนกโครงสร้างพื้นฐานไอที'},
        {'id': 15, 'employeeCode': 'EMP0015', 'biometricId': '100016', 'fullName': 'นาย ตาล Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 16, 'employeeCode': 'EMP0016', 'biometricId': '100017', 'fullName': 'นาย น้องก้อง Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 17, 'employeeCode': 'EMP0017', 'biometricId': '100018', 'fullName': 'นาย บอส Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 18, 'employeeCode': 'EMP0018', 'biometricId': '100019', 'fullName': 'นาย กบ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 19, 'employeeCode': 'EMP0019', 'biometricId': '100021', 'fullName': 'นางสาว ต่าย Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 20, 'employeeCode': 'EMP0020', 'biometricId': '100022', 'fullName': 'นางสาว เวเฟอร์ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 21, 'employeeCode': 'EMP0021', 'biometricId': '100023', 'fullName': 'นาย คุณเอิร์ท Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 22, 'employeeCode': 'EMP0022', 'biometricId': '100025', 'fullName': 'นาย นัท Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 23, 'employeeCode': 'EMP0023', 'biometricId': '100026', 'fullName': 'นาย อัฐ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 24, 'employeeCode': 'EMP0024', 'biometricId': '100027', 'fullName': 'นางสาว หมิง Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 25, 'employeeCode': 'EMP0025', 'biometricId': '100030', 'fullName': 'นาย คุณบู๊ Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 26, 'employeeCode': 'EMP0026', 'biometricId': None, 'fullName': 'นาย บอส (สอง) Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 27, 'employeeCode': 'EMP0027', 'biometricId': '100032', 'fullName': 'นางสาว นัสริน Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 28, 'employeeCode': 'EMP0028', 'biometricId': '100033', 'fullName': 'นาย ฟิล์ม Syaco', 'departmentName': 'แผนกพัฒนาซอฟต์แวร์'},
        {'id': 29, 'employeeCode': 'EMP0029', 'biometricId': None, 'fullName': 'นาย ประจำ วัน', 'departmentName': 'แผนกโครงสร้างพื้นฐานไอที'},
        {'id': 31, 'employeeCode': 'EMP0031', 'biometricId': '100031', 'fullName': 'นางสาว ชล นี่', 'departmentName': 'แผนกสรรหาและพัฒนาบุคลากร'},
        {'id': 32, 'employeeCode': 'EMP0032', 'biometricId': None, 'fullName': 'นางสาว กระปุก ทดสอบลาออก', 'departmentName': 'แผนกบัญชี'},
    ]

print(f'Prepared {len(active_emps)} active employees.')

# Known holidays in October 2026
HOLIDAYS_OCT_2026 = {
    '2026-10-13': 'วันนวมินทรมหาราช',
    '2026-10-23': 'วันปิยมหาราช',
    '2026-10-28': 'วันโน',
    '2026-10-31': 'อะ'
}

def clean_name(full_name: str) -> str:
    import re
    return re.sub(r'^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|คุณ)\s*', '', full_name).strip()

def generate_attendance_workbook(start_date_str: str, end_date_str: str) -> openpyxl.Workbook:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'deliy'

    # Styles
    font_title1 = Font(name='Segoe UI', size=11, bold=True)
    font_title2 = Font(name='Segoe UI', size=9, bold=True)
    font_header = Font(name='Segoe UI', size=10, bold=True)
    font_sub_header = Font(name='Segoe UI', size=9, bold=False)
    font_data = Font(name='Segoe UI', size=9, bold=False)

    fill_header = PatternFill(start_color='F3F4F6', end_color='F3F4F6', fill_type='solid')
    fill_weekend = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')
    fill_holiday = PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid')

    border_thin = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    align_center = Alignment(horizontal='center', vertical='center')
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    # Row 1: Sheet Title
    ws.cell(1, 1, 'deliy').font = font_title1

    # Row 2: Metadata (Syaco unit and date range)
    ws.cell(2, 1, f'unit: Syaco    date from: {start_date_str} to: {end_date_str} 23:59').font = font_title2

    # Row 3 & 4: Headers
    headers_r3 = [
        ('รหัส', 1, 2),
        ('ชื่อ-สกุล', 1, 2),
        ('แผนก', 1, 2),
        ('วันที่', 1, 2),
        ('สัปดาห์', 1, 2),
        ('เข้า-ออก', 1, 2),
        ('กะการทำงาน', 2, 1),
        (None, 0, 0),
        ('วันทำงาน', 2, 1),
        (None, 0, 0),
        ('ขาด', 1, 2),
        ('สาย', 2, 1),
        (None, 0, 0),
        ('ออกก่อน', 2, 1),
        (None, 0, 0),
        ('ไม่ลงเวลา', 2, 1),
        (None, 0, 0),
        ('วันหยุด', 2, 1),
        (None, 0, 0),
        ('การลา', 2, 1),
        (None, 0, 0),
        ('สัญลักษณ์', 2, 1),
        (None, 0, 0),
        ('Lock', 1, 2)
    ]

    for col_idx, (text, colspan, rowspan) in enumerate(headers_r3, start=1):
        c = ws.cell(3, col_idx)
        if text is not None:
            c.value = text
        c.font = font_header
        c.fill = fill_header
        c.alignment = align_center
        c.border = border_thin

    headers_r4 = [
        None, None, None, None, None, None,
        'วัน', 'ชั่วโมง',
        'วัน', 'ชั่วโมง',
        None,
        'ครั้ง', 'นาที.',
        'ครั้ง', 'นาที.',
        'เข้า', 'ออก',
        'สัปดาห์', 'ประจำปี',
        'ครั้ง', 'ชั่วโมง',
        'กะ', 'ลา',
        None
    ]

    for col_idx, text in enumerate(headers_r4, start=1):
        c = ws.cell(4, col_idx)
        if text is not None:
            c.value = text
        c.font = font_sub_header
        c.fill = fill_header
        c.alignment = align_center
        c.border = border_thin

    # Apply Merges
    merges = [
        'A3:A4', 'B3:B4', 'C3:C4', 'D3:D4', 'E3:E4', 'F3:F4',
        'G3:H3', 'I3:J3', 'K3:K4', 'L3:M3', 'N3:O3', 'P3:Q3',
        'R3:S3', 'T3:U3', 'V3:W3', 'X3:X4'
    ]
    for m in merges:
        ws.merge_cells(m)

    # Date generation
    start_d = datetime.date.fromisoformat(start_date_str)
    end_d = datetime.date.fromisoformat(end_date_str)

    delta = datetime.timedelta(days=1)
    dates = []
    curr = start_d
    while curr <= end_d:
        dates.append(curr)
        curr += delta

    current_row = 5

    # Deterministic seed based on date string so data is reproducible
    rng = random.Random(start_date_str + end_date_str + '_oct')

    for emp in active_emps:
        bio_id = emp.get('biometricId') or emp.get('employeeCode')
        raw_name = emp.get('fullName') or ''
        name = clean_name(raw_name)
        dept = emp.get('departmentName') or 'Syaco'

        for dt in dates:
            dt_str = dt.isoformat()
            weekday = dt.isoweekday() # 1=Mon .. 7=Sun
            weekday_str = str(weekday)
            is_weekend = (weekday in (6, 7))
            is_holiday = (dt_str in HOLIDAYS_OCT_2026)

            punch_time = None
            sched_day = '0'
            sched_hr = '0'
            work_day = '0'
            work_hr = '0'
            absent_day = '0'
            late_times = '0'
            late_mins = '0'
            early_times = '0'
            early_mins = '0'
            missed_in = '0'
            missed_out = '0'
            holiday_week = '0'
            holiday_pub = '0'
            leave_times = '0'
            leave_hr = '0'
            shift_symbol = 'DV'
            leave_symbol = None
            lock_val = '0'

            if is_weekend:
                holiday_week = '1'
                shift_symbol = 'W'
            elif is_holiday:
                holiday_pub = '1'
                shift_symbol = 'H'
            else:
                # Normal Workday (08:30 - 17:30 standard shift)
                sched_day = '1'
                sched_hr = '8'

                rand_prob = rng.random()
                if rand_prob < 0.86:
                    # Normal On-time
                    in_min = rng.randint(35, 58)
                    out_min = rng.randint(31, 56)
                    punch_time = f'08:{in_min:02d}-17:{out_min:02d}'
                    work_day = '1'
                    work_hr = '8'
                elif rand_prob < 0.93:
                    # Slightly Late
                    late_m = rng.randint(5, 25)
                    in_h = 9
                    in_min = late_m
                    out_min = rng.randint(32, 59)
                    punch_time = f'{in_h:02d}:{in_min:02d}L-17:{out_min:02d}'
                    work_day = '1'
                    work_hr = '8'
                    late_times = '1'
                    late_mins = str(late_m)
                elif rand_prob < 0.97:
                    # Early leave
                    in_min = rng.randint(40, 56)
                    early_m = rng.randint(10, 20)
                    out_min = 30 - early_m
                    punch_time = f'08:{in_min:02d}-17:{out_min:02d}E'
                    work_day = '1'
                    work_hr = '8'
                    early_times = '1'
                    early_mins = str(early_m)
                else:
                    # Leave
                    work_day = '0'
                    work_hr = '0'
                    leave_times = '1'
                    leave_hr = '8'
                    leave_symbol = 'V' if rng.random() < 0.5 else 'S'

            row_data = [
                bio_id,
                name,
                dept,
                dt_str,
                weekday_str,
                punch_time,
                sched_day,
                sched_hr,
                work_day,
                work_hr,
                absent_day,
                late_times,
                late_mins,
                early_times,
                early_mins,
                missed_in,
                missed_out,
                holiday_week,
                holiday_pub,
                leave_times,
                leave_hr,
                shift_symbol,
                leave_symbol,
                lock_val
            ]

            for c_idx, val in enumerate(row_data, start=1):
                cell = ws.cell(current_row, c_idx, val)
                cell.font = font_data
                cell.border = border_thin

                if is_weekend:
                    cell.fill = fill_weekend
                elif is_holiday:
                    cell.fill = fill_holiday

                # Alignment
                if c_idx in (1, 4, 5, 6, 22, 23, 24):
                    cell.alignment = align_center
                elif c_idx in (2, 3):
                    cell.alignment = align_left
                else:
                    cell.alignment = align_right

            current_row += 1

    # Adjust Column Widths
    col_widths = {
        1: 12, 2: 24, 3: 26, 4: 14, 5: 8, 6: 18,
        7: 8, 8: 8, 9: 8, 10: 8, 11: 8, 12: 8,
        13: 8, 14: 8, 15: 8, 16: 8, 17: 8, 18: 10,
        19: 10, 20: 8, 21: 8, 22: 8, 23: 8, 24: 8
    }

    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    return wb

# Generate October files:
# 1. 1-15 October
# 2. 10-31 October (as requested)
# 3. 16-31 October (optional non-overlapping)
# 4. 01-31 October (optional full month)
periods = [
    ('attendance_2026_10_part1_01-15.xlsx', '2026-10-01', '2026-10-15', 'วันที่ 1 - 15 ตุลาคม 2026 (ไฟล์ที่ 1 ตามคำขอ)'),
    ('attendance_2026_10_part2_10-31.xlsx', '2026-10-10', '2026-10-31', 'วันที่ 10 - 31 ตุลาคม 2026 (ไฟล์ที่ 2 ตามคำขอ)'),
    ('attendance_2026_10_part2_16-31.xlsx', '2026-10-16', '2026-10-31', 'วันที่ 16 - 31 ตุลาคม 2026 (แบบไม่ทับซ้อนกับไฟล์ที่ 1)'),
    ('attendance_2026_10_full_month.xlsx', '2026-10-01', '2026-10-31', 'ทั้งเดือน วันที่ 1 - 31 ตุลาคม 2026')
]

for filename, start_dt, end_dt, desc in periods:
    wb = generate_attendance_workbook(start_dt, end_dt)
    path_proj = os.path.join('C:/Project/HRMS/attendance_october_2026', filename)
    path_pub = os.path.join('C:/Project/HRMS/frontend/public/templates/attendance_october_2026', filename)
    path_dl = os.path.join('C:/Users/NASSARIN/Downloads/attendance_october_2026', filename)

    wb.save(path_proj)
    wb.save(path_pub)
    wb.save(path_dl)
    print(f'Generated: {filename} ({desc})')

print('All October attendance files generated successfully!')
