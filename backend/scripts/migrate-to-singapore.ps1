<#
  ย้ายฐานข้อมูล HRMS (schema hrms) จาก Supabase โตเกียว -> สิงคโปร์
  วิธีใช้ (เปิด PowerShell):
    cd D:\Intership2569\Project_69\backend\scripts
    powershell -ExecutionPolicy Bypass -File .\migrate-to-singapore.ps1
  สคริปต์จะถามรหัสผ่านทีละโปรเจกต์ (พิมพ์แล้วไม่แสดงบนจอ และไม่บันทึกลงไฟล์)
#>
param(
    [string]$BackupDir = "D:\Intership2569\Backup_HRMS",
    [string]$PgBin = ""
)

# Continue: ให้ข้อความ stderr ของ pg_restore/psql ไม่หยุดสคริปต์ (ตรวจผลด้วย $LASTEXITCODE แทน)
$ErrorActionPreference = "Continue"

# ---- ค่าการเชื่อมต่อ (ไม่มีรหัสผ่าน) ----
$OldHost = "aws-0-ap-northeast-1.pooler.supabase.com"
$OldUser = "postgres.uimkymtryijnpyybhewj"
$NewHost = "aws-0-ap-southeast-1.pooler.supabase.com"
$NewUser = "postgres.kbjyqjjpqhpijqovcxoe"
$Port    = "5432"
$Db      = "postgres"

function Step($text) { Write-Host ""; Write-Host "==== $text ====" -ForegroundColor Cyan }
function ReadPassword($label) {
    $sec = Read-Host $label -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

# ---- 1) หาเครื่องมือ PostgreSQL ----
Step "1/6 ตรวจเครื่องมือ pg_dump / pg_restore / psql"
if ($PgBin -eq "") {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
             Sort-Object { [int]($_.Name -replace '\D','') } -Descending | Select-Object -First 1
    if ($found) { $PgBin = Join-Path $found.FullName "bin" }
}
if ($PgBin -ne "" -and (Test-Path (Join-Path $PgBin "pg_dump.exe"))) { $env:Path = "$PgBin;$env:Path" }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "ไม่พบ pg_dump — ติดตั้ง PostgreSQL (Command Line Tools) ก่อน: https://www.postgresql.org/download/windows/" -ForegroundColor Red
    exit 1
}
pg_dump --version

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$DumpFile = Join-Path $BackupDir "hrms.dump"
$LogFile  = Join-Path $BackupDir "restore-log.txt"

# ---- 2) export จากโปรเจกต์เดิม ----
Step "2/6 ส่งออก schema hrms จากโปรเจกต์เดิม (โตเกียว)"
$env:PGPASSWORD = ReadPassword "รหัสผ่านฐานข้อมูล โปรเจกต์เดิม (โตเกียว)"
pg_dump -h $OldHost -p $Port -U $OldUser -d $Db --schema=hrms --no-owner --no-privileges -Fc -f $DumpFile
if ($LASTEXITCODE -ne 0) { Write-Host "pg_dump ล้มเหลว — ตรวจรหัสผ่าน/การเชื่อมต่อ" -ForegroundColor Red; exit 1 }
$size = (Get-Item $DumpFile).Length
Write-Host ("ได้ไฟล์ {0} ขนาด {1:N0} bytes" -f $DumpFile, $size) -ForegroundColor Green
if ($size -le 0) { Write-Host "ไฟล์ว่าง หยุดทำงาน" -ForegroundColor Red; exit 1 }

$CountSql = @"
SELECT 'employee' t, count(*) FROM hrms.employee
UNION ALL SELECT 'user_account', count(*) FROM hrms.user_account
UNION ALL SELECT 'leave_request', count(*) FROM hrms.leave_request
UNION ALL SELECT 'leave_balance', count(*) FROM hrms.leave_balance
UNION ALL SELECT 'payroll', count(*) FROM hrms.payroll
UNION ALL SELECT 'role_permission', count(*) FROM hrms.role_permission
ORDER BY 1;
"@
$OldCounts = psql -h $OldHost -p $Port -U $OldUser -d $Db -At -F "=" -c $CountSql
$env:PGPASSWORD = $null

# ---- 3) เตรียมโปรเจกต์ใหม่ ----
Step "3/6 เตรียม schema hrms ในโปรเจกต์ใหม่ (สิงคโปร์)"
$env:PGPASSWORD = ReadPassword "รหัสผ่านฐานข้อมูล โปรเจกต์ใหม่ (สิงคโปร์)"
$existing = psql -h $NewHost -p $Port -U $NewUser -d $Db -At -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='hrms';"
if ($LASTEXITCODE -ne 0) { Write-Host "เชื่อมต่อโปรเจกต์ใหม่ไม่ได้ — ตรวจรหัสผ่าน" -ForegroundColor Red; exit 1 }
if ([int]$existing -gt 0) {
    Write-Host "โปรเจกต์ใหม่มีตารางใน schema hrms อยู่แล้ว $existing ตาราง" -ForegroundColor Yellow
    $ans = Read-Host "พิมพ์ YES เพื่อลบ schema hrms ในโปรเจกต์ใหม่แล้วนำเข้าใหม่ทั้งหมด (โปรเจกต์เดิมไม่ถูกแตะ)"
    if ($ans -ne "YES") { Write-Host "ยกเลิก"; exit 1 }
    psql -h $NewHost -p $Port -U $NewUser -d $Db -c "DROP SCHEMA hrms CASCADE;"
}
psql -h $NewHost -p $Port -U $NewUser -d $Db -c "CREATE SCHEMA IF NOT EXISTS hrms;"

# ---- 4) import ----
Step "4/6 นำเข้าข้อมูล (อาจใช้เวลาหลายนาที)"
pg_restore -h $NewHost -p $Port -U $NewUser -d $Db --no-owner --no-privileges --verbose $DumpFile 2> $LogFile
$errs = Select-String -Path $LogFile -Pattern "error" | Where-Object { $_.Line -notmatch 'schema "hrms" already exists' }
if ($errs) {
    Write-Host "พบ error ระหว่างนำเข้า (20 บรรทัดแรก) — ดูทั้งหมดที่ $LogFile" -ForegroundColor Yellow
    $errs | Select-Object -First 20 | ForEach-Object { Write-Host $_.Line }
} else {
    Write-Host "นำเข้าสำเร็จ ไม่มี error" -ForegroundColor Green
}

# ---- 5) เทียบจำนวนข้อมูล ----
Step "5/6 เทียบจำนวนข้อมูล เดิม vs ใหม่"
$NewCounts = psql -h $NewHost -p $Port -U $NewUser -d $Db -At -F "=" -c $CountSql
$allOk = $true
for ($i = 0; $i -lt $OldCounts.Count; $i++) {
    $o = $OldCounts[$i]; $n = $NewCounts[$i]
    $ok = ($o -eq $n)
    if (-not $ok) { $allOk = $false }
    $mark = if ($ok) { "OK " } else { "XX " }
    Write-Host ("{0} เดิม {1,-28} ใหม่ {2}" -f $mark, $o, $n) -ForegroundColor ($(if ($ok) { "Green" } else { "Red" }))
}

# ---- 6) ตั้งค่า backend ให้ชี้ฐานใหม่ (User Secrets ไม่อยู่ใน git) ----
Step "6/6 ตั้งค่า backend"
if (-not $allOk) {
    Write-Host "จำนวนข้อมูลไม่ตรงกัน — ยังไม่เปลี่ยนการตั้งค่า backend ส่ง $LogFile ให้ Claude ตรวจ" -ForegroundColor Red
    $env:PGPASSWORD = $null
    exit 1
}
$ans = Read-Host "ข้อมูลครบ ต้องการให้ backend ใช้ฐานใหม่ทันทีไหม (พิมพ์ Y)"
if ($ans -eq "Y" -or $ans -eq "y") {
    $apiDir = Join-Path $PSScriptRoot "..\src\Hrms.Api"
    $conn = "Host=$NewHost;Port=$Port;Database=$Db;Username=$NewUser;Password=$($env:PGPASSWORD);SearchPath=hrms;SslMode=Require;Maximum Pool Size=20;Minimum Pool Size=2;Connection Idle Lifetime=300;Keepalive=30;Timeout=15;Command Timeout=30;"
    Push-Location $apiDir
    dotnet user-secrets init | Out-Null
    dotnet user-secrets set "ConnectionStrings:DefaultConnection" $conn | Out-Null
    Pop-Location
    Write-Host "ตั้งค่าแล้ว (User Secrets) — รีสตาร์ต backend ด้วย local server.bat [4] แล้ว [1]" -ForegroundColor Green
    Write-Host "ย้อนกลับไปใช้ฐานเดิม: cd backend\src\Hrms.Api ; dotnet user-secrets clear"
}
$env:PGPASSWORD = $null
Write-Host ""
Write-Host "เสร็จสิ้น" -ForegroundColor Green
