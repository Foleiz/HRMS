using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.Employees.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.Services;

/// <summary>
/// Service จัดการทะเบียนพนักงาน พร้อมระบบเข้ารหัสข้อมูลส่วนบุคคล (PDPA AES-256) และ Data Scope
/// </summary>
public class EmployeeService : IEmployeeService
{
    private readonly IHrmsDbContext _dbContext;
    private readonly IAesEncryptionService _cryptoService;
    private readonly ICurrentUserService _currentUserService;

    public EmployeeService(
        IHrmsDbContext dbContext,
        IAesEncryptionService cryptoService,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _cryptoService = cryptoService;
        _currentUserService = currentUserService;
    }

    public async Task<List<EmployeeDto>> GetAllAsync(string? search = null, CancellationToken cancellationToken = default)
    {
        // 1. ตรวจสอบสิทธิ์ (RBAC)
        if (!_currentUserService.HasPermission("EMP_VIEW") && 
            !_currentUserService.HasPermission("EMP_MANAGE") && 
            !_currentUserService.HasPermission("EMP_PROFILE_VIEW"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์เข้าถึงรายชื่อพนักงาน");
        }

        var query = _dbContext.Employees
            .Include(e => e.Contact)
            .Include(e => e.SocialSecurity)
            .Include(e => e.Addresses)
            .Include(e => e.BankAccounts)
                .ThenInclude(b => b.Bank)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Position)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Division)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.EmployeeType)
            .AsNoTracking();

        // 2. Data Scoping — กรองตามขอบเขตที่ role ของ user กำหนด
        string dataScope = _currentUserService.GetDataScope("EMP_VIEW");
        switch (dataScope)
        {
            case "SELF":
            {
                long? myEmpId = _currentUserService.EmployeeId;
                if (!myEmpId.HasValue)
                    return new List<EmployeeDto>();
                query = query.Where(e => e.Id == myEmpId.Value);
                break;
            }
            case "DEPARTMENT":
            {
                // เห็นเฉพาะพนักงานในแผนกเดียวกับตัวเอง
                long? myDeptId = _currentUserService.DepartmentId;
                if (!myDeptId.HasValue)
                {
                    // ถ้าไม่มี department ใน token ให้ fallback เป็นดูแค่ตัวเอง
                    long? myEmpId = _currentUserService.EmployeeId;
                    if (!myEmpId.HasValue) return new List<EmployeeDto>();
                    query = query.Where(e => e.Id == myEmpId.Value);
                }
                else
                {
                    query = query.Where(e => e.Assignments.Any(a => a.DepartmentId == myDeptId.Value && a.IsCurrent));
                }
                break;
            }
            case "DIVISION":
            {
                // เห็นเฉพาะพนักงานในฝ่ายเดียวกับตัวเอง
                long? myDivId = _currentUserService.DivisionId;
                if (!myDivId.HasValue)
                {
                    long? myEmpId = _currentUserService.EmployeeId;
                    if (!myEmpId.HasValue) return new List<EmployeeDto>();
                    query = query.Where(e => e.Id == myEmpId.Value);
                }
                else
                {
                    query = query.Where(e => e.Assignments.Any(a => a.DivisionId == myDivId.Value && a.IsCurrent));
                }
                break;
            }
            case "TEAM":
            {
                // เห็นเฉพาะพนักงานในแผนกเดียวกัน (ใช้ department เดียวกับ DEPARTMENT scope)
                long? myDeptId = _currentUserService.DepartmentId;
                if (!myDeptId.HasValue)
                {
                    long? myEmpId = _currentUserService.EmployeeId;
                    if (!myEmpId.HasValue) return new List<EmployeeDto>();
                    query = query.Where(e => e.Id == myEmpId.Value);
                }
                else
                {
                    query = query.Where(e => e.Assignments.Any(a => a.DepartmentId == myDeptId.Value && a.IsCurrent));
                }
                break;
            }
            // case "ORGANIZATION": ไม่กรอง — เห็นทุกคน (ADMIN, CEO, HR_MGR)
        }

        // 3. กรองคำค้นหา
        if (!string.IsNullOrWhiteSpace(search))
        {
            string term = search.Trim().ToLower();
            query = query.Where(e =>
                e.EmployeeCode.ToLower().Contains(term) ||
                (e.BiometricId != null && e.BiometricId.ToLower().Contains(term)) ||
                e.FirstName.ToLower().Contains(term) ||
                e.LastName.ToLower().Contains(term) ||
                (e.CitizenIdMasked != null && e.CitizenIdMasked.Contains(term)));
        }

        var employees = await query
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync(cancellationToken);

        return employees.Select(MapToDto).ToList();
    }

    public async Task<EmployeeDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.HasPermission("EMP_VIEW") && 
            !_currentUserService.HasPermission("EMP_MANAGE") && 
            !_currentUserService.HasPermission("EMP_PROFILE_VIEW"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์เข้าถึงข้อมูลพนักงาน");
        }

        // Data Scoping — ตรวจสอบ employee ที่ขอดูก่อนดึงข้อมูล
        string dataScope = _currentUserService.GetDataScope("EMP_VIEW");
        switch (dataScope)
        {
            case "SELF":
            {
                long? myEmpId = _currentUserService.EmployeeId;
                if (!myEmpId.HasValue || myEmpId.Value != id)
                    throw new ForbiddenException("คุณสามารถดูได้เฉพาะข้อมูลของตนเองเท่านั้น");
                break;
            }
            case "DEPARTMENT":
            {
                long? myDeptId = _currentUserService.DepartmentId;
                if (myDeptId.HasValue)
                {
                    bool inDept = await _dbContext.EmployeeAssignments
                        .AnyAsync(a => a.EmployeeId == id && a.DepartmentId == myDeptId.Value && a.IsCurrent, cancellationToken);
                    if (!inDept)
                        throw new ForbiddenException("คุณไม่มีสิทธิ์ดูข้อมูลพนักงานนอกแผนกของคุณ");
                }
                break;
            }
            case "DIVISION":
            {
                long? myDivId = _currentUserService.DivisionId;
                if (myDivId.HasValue)
                {
                    bool inDiv = await _dbContext.EmployeeAssignments
                        .AnyAsync(a => a.EmployeeId == id && a.DivisionId == myDivId.Value && a.IsCurrent, cancellationToken);
                    if (!inDiv)
                        throw new ForbiddenException("คุณไม่มีสิทธิ์ดูข้อมูลพนักงานนอกฝ่ายของคุณ");
                }
                break;
            }
            case "TEAM":
            {
                long? myDeptId = _currentUserService.DepartmentId;
                if (myDeptId.HasValue)
                {
                    bool inTeam = await _dbContext.EmployeeAssignments
                        .AnyAsync(a => a.EmployeeId == id && a.DepartmentId == myDeptId.Value && a.IsCurrent, cancellationToken);
                    if (!inTeam)
                        throw new ForbiddenException("คุณไม่มีสิทธิ์ดูข้อมูลพนักงานนอกทีมของคุณ");
                }
                break;
            }
            // case "ORGANIZATION": เห็นได้ทุกคน
        }

        string idStr = id.ToString();
        var employee = await _dbContext.Employees
            .Include(e => e.Contact)
            .Include(e => e.SocialSecurity)
            .Include(e => e.Addresses)
            .Include(e => e.Educations)
            .Include(e => e.WorkExperiences)
            .Include(e => e.FamilyMembers)
            .Include(e => e.EmergencyContacts)
            .Include(e => e.BankAccounts)
                .ThenInclude(b => b.Bank)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Position)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Division)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.EmployeeType)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.ManagerEmployee)
            .Include(e => e.Signatures)
            .Include(e => e.UserAccount)
                .ThenInclude(u => u!.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(e => e.Id == id || e.EmployeeCode == idStr, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        return MapToDto(employee);
    }

    /// <summary>
    /// คำนวณรหัสพนักงานลำดับถัดไปแบบอัตโนมัติ (เช่น EMP0001, EMP0011)
    /// </summary>
    public async Task<string> GetNextEmployeeCodeAsync(CancellationToken cancellationToken = default)
    {
        var codes = await _dbContext.Employees
            .AsNoTracking()
            .Select(e => e.EmployeeCode)
            .ToListAsync(cancellationToken);

        int maxCode = 0;
        foreach (var code in codes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;
            var match = System.Text.RegularExpressions.Regex.Match(code.Trim(), @"^EMP(\d+)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success && int.TryParse(match.Groups[1].Value, out int num))
            {
                if (num > maxCode) maxCode = num;
            }
        }

        int nextNum = maxCode + 1;
        return $"EMP{nextNum:D4}";
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        // 1. ตรวจสอบสิทธิ์สร้างพนักงาน
        if (!_currentUserService.HasPermission("EMP_MANAGE"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์สร้างข้อมูลพนักงาน");
        }

        // 2. หากไม่ได้ระบุรหัสพนักงาน ให้ระบบ Generate อัตโนมัติ
        if (string.IsNullOrWhiteSpace(request.EmployeeCode))
        {
            request.EmployeeCode = await GetNextEmployeeCodeAsync(cancellationToken);
        }

        // 3. ตรวจสอบความซ้ำซ้อนของรหัสพนักงาน
        bool codeExists = await _dbContext.Employees
            .AnyAsync(e => e.EmployeeCode == request.EmployeeCode.Trim(), cancellationToken);
        if (codeExists)
        {
            // Auto-resolve race condition by generating true next code
            string autoCode = await GetNextEmployeeCodeAsync(cancellationToken);
            if (autoCode != request.EmployeeCode.Trim())
            {
                request.EmployeeCode = autoCode;
            }
            else
            {
                throw new ValidationException($"รหัสพนักงาน '{request.EmployeeCode}' มีอยู่ในระบบแล้ว");
            }
        }

        string? cleanBiometricId = string.IsNullOrWhiteSpace(request.BiometricId) ? null : request.BiometricId.Trim();
        if (cleanBiometricId != null)
        {
            bool bioExists = await _dbContext.Employees
                .AnyAsync(e => e.BiometricId == cleanBiometricId, cancellationToken);
            if (bioExists)
            {
                throw new ValidationException($"รหัสเครื่องสแกน '{cleanBiometricId}' มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น");
            }
        }

        // 3. จัดการ PDPA สำหรับเลขบัตรประชาชน (Citizen ID)
        byte[]? encryptedCitizenId = null;
        string? maskedCitizenId = null;
        if (!string.IsNullOrWhiteSpace(request.CitizenId))
        {
            encryptedCitizenId = _cryptoService.Encrypt(request.CitizenId.Trim());
            maskedCitizenId = _cryptoService.MaskCitizenId(request.CitizenId.Trim());
        }

        var (gender, genderId) = ResolveGenderAndId(request.Gender, request.GenderId, request.Prefix);

        var employee = new Employee
        {
            EmployeeCode = request.EmployeeCode.Trim(),
            BiometricId = cleanBiometricId,
            Prefix = request.Prefix?.Trim(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            CitizenId = request.CitizenId?.Trim(),
            CitizenIdEncrypted = encryptedCitizenId,
            CitizenIdMasked = maskedCitizenId,
            BirthDate = request.BirthDate,
            Gender = gender,
            GenderId = genderId,
            Nationality = request.Nationality,
            NationalityId = request.NationalityId,
            Religion = request.Religion,
            ReligionId = request.ReligionId,
            MaritalStatus = request.MaritalStatus,
            MaritalStatusId = request.MaritalStatusId,
            MilitaryStatus = request.MilitaryStatus,
            IsTopLevel = request.IsTopLevel,
            SpouseHasIncome = request.SpouseHasIncome,
            NumberOfChildren = request.NumberOfChildren,
            ParentDeductionCount = request.ParentDeductionCount,
            DisabilityDeductionCount = request.DisabilityDeductionCount,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 4. ช่องทางการติดต่อ
        if (!string.IsNullOrWhiteSpace(request.PersonalPhone) ||
            !string.IsNullOrWhiteSpace(request.PersonalEmail) ||
            !string.IsNullOrWhiteSpace(request.OrganizationEmail))
        {
            employee.Contact = new EmployeeContact
            {
                PersonalPhone = FormatPhoneNumber(request.PersonalPhone),
                PersonalEmail = request.PersonalEmail?.Trim(),
                OrganizationEmail = request.OrganizationEmail?.Trim()
            };
        }

        // 5. ประกันสังคม (PDPA Encrypted - ใช้เลขเดียวกับเลขบัตรประชาชนอัตโนมัติ)
        var ssoNo = !string.IsNullOrWhiteSpace(request.SocialSecurityNo) ? request.SocialSecurityNo.Trim() : request.CitizenId?.Trim();
        if (!string.IsNullOrWhiteSpace(ssoNo) || !string.IsNullOrWhiteSpace(request.HospitalName))
        {
            employee.SocialSecurity = new EmployeeSocialSecurity
            {
                SocialSecurityNoEncrypted = !string.IsNullOrWhiteSpace(ssoNo) ? _cryptoService.Encrypt(ssoNo) : encryptedCitizenId,
                SocialSecurityNoMasked = !string.IsNullOrWhiteSpace(ssoNo) ? _cryptoService.MaskCitizenId(ssoNo) : maskedCitizenId,
                HospitalName = request.HospitalName?.Trim(),
                HospitalCode = request.HospitalCode?.Trim()
            };
        }

        // 6. ที่อยู่
        if (request.Addresses != null && request.Addresses.Any())
        {
            foreach (var addr in request.Addresses)
            {
                employee.Addresses.Add(new EmployeeAddress
                {
                    AddressType = NormalizeAddressType(addr.AddressType),
                    AddressLine = addr.AddressLine,
                    SubDistrict = addr.SubDistrict,
                    District = addr.District,
                    Province = addr.Province,
                    PostalCode = addr.PostalCode,
                    IsCurrent = addr.IsCurrent
                });
            }
        }

        // 7. บัญชีธนาคาร
        if (request.BankAccounts != null && request.BankAccounts.Any())
        {
            foreach (var acc in request.BankAccounts)
            {
                employee.BankAccounts.Add(new EmployeeBankAccount
                {
                    BankId = acc.BankId,
                    AccountNumber = acc.AccountNumber.Trim(),
                    AccountType = acc.AccountType ?? "SAVINGS",
                    AccountName = acc.AccountName ?? employee.FullName,
                    IsPrimary = acc.IsPrimary,
                    Status = acc.Status ?? "ACTIVE"
                });
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.AccountNumber))
        {
            var bank = await _dbContext.Banks
                .FirstOrDefaultAsync(b => b.BankName.Contains(request.BankName ?? "") || b.BankCode == (request.BankName ?? ""), cancellationToken);
            long bankId = bank?.Id ?? 1;

            employee.BankAccounts.Add(new EmployeeBankAccount
            {
                BankId = bankId,
                AccountNumber = request.AccountNumber.Trim(),
                AccountType = "SAVINGS",
                AccountName = employee.FullName,
                IsPrimary = true,
                Status = "ACTIVE"
            });
        }

        // 8. ประวัติการศึกษา / ประวัติการทำงาน
        if (request.WorkExperiences != null)
        {
            ReplaceWorkExperiences(employee, request.WorkExperiences);
        }
        if (request.Educations != null)
        {
            ReplaceEducations(employee, request.Educations);
        }
        else if (!string.IsNullOrWhiteSpace(request.EducationLevel) || !string.IsNullOrWhiteSpace(request.Institution))
        {
            employee.Educations.Add(new EmployeeEducation
            {
                EducationLevel = request.EducationLevel ?? "ปริญญาตรี",
                Institution = request.Institution ?? "-",
                Major = request.Major,
                GraduationYear = request.GraduationYear,
                Gpa = request.Gpa
            });
        }

        // 9. ข้อมูลครอบครัว (Family Members)
        if (request.FamilyMembers != null && request.FamilyMembers.Any())
        {
            foreach (var fm in request.FamilyMembers)
            {
                if (string.IsNullOrWhiteSpace(fm.FirstName)) continue;
                byte[]? fmEncrypted = !string.IsNullOrWhiteSpace(fm.CitizenId) ? _cryptoService.Encrypt(fm.CitizenId.Trim()) : null;
                string? fmMasked = !string.IsNullOrWhiteSpace(fm.CitizenId) ? _cryptoService.MaskCitizenId(fm.CitizenId.Trim()) : null;

                employee.FamilyMembers.Add(new FamilyMember
                {
                    RelationshipType = fm.RelationshipType ?? "บิดา",
                    Prefix = fm.Prefix,
                    FirstName = !string.IsNullOrWhiteSpace(fm.Prefix) ? $"{fm.Prefix.Trim()} {fm.FirstName.Trim()}" : fm.FirstName.Trim(),
                    LastName = fm.LastName?.Trim(),
                    CitizenId = fm.CitizenId?.Trim(),
                    CitizenIdEncrypted = fmEncrypted,
                    CitizenIdMasked = fmMasked,
                    BirthDate = fm.BirthDate
                });
            }
        }

        // 10. กรณีฉุกเฉินติดต่อใคร (Emergency Contact)
        if (request.EmergencyContact != null && !string.IsNullOrWhiteSpace(request.EmergencyContact.FirstName))
        {
            employee.EmergencyContacts.Add(new EmergencyContact
            {
                Prefix = request.EmergencyContact.Prefix,
                FirstName = !string.IsNullOrWhiteSpace(request.EmergencyContact.Prefix) ? $"{request.EmergencyContact.Prefix.Trim()} {request.EmergencyContact.FirstName.Trim()}" : request.EmergencyContact.FirstName.Trim(),
                LastName = request.EmergencyContact.LastName?.Trim() ?? "-",
                Relationship = request.EmergencyContact.Relationship ?? "บิดา",
                Address = request.EmergencyContact.Address,
                PrimaryPhone = request.EmergencyContact.PrimaryPhone?.Trim() ?? "-",
                IsPrimary = true
            });
        }

        // 11. ข้อมูลตำแหน่งงาน (Employee Assignment)
        if (!string.IsNullOrWhiteSpace(request.PositionName))
        {
            var pos = await _dbContext.Positions
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.PositionName.Trim().ToLower() == request.PositionName.Trim().ToLower() || p.PositionName.Contains(request.PositionName.Trim()), cancellationToken);

            if (pos == null)
            {
                var defaultDept = await _dbContext.Departments.FirstOrDefaultAsync(cancellationToken);
                pos = new Position
                {
                    DepartmentId = defaultDept?.Id ?? 1,
                    PositionCode = await CodeGenerator.NextAsync(_dbContext.Positions.Select(p => p.PositionCode), "POS", 3, cancellationToken),
                    PositionName = request.PositionName.Trim(),
                    Status = "ACTIVE"
                };
                _dbContext.Positions.Add(pos);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            var deptId = pos.DepartmentId;
            var divId = pos.Department?.DivisionId ?? (await _dbContext.Departments.Where(d => d.Id == deptId).Select(d => d.DivisionId).FirstOrDefaultAsync(cancellationToken));
            if (divId == 0)
            {
                divId = await _dbContext.Divisions.Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            }

            var empTypeId = await ResolveEmployeeTypeIdAsync(request.EmployeeType, cancellationToken);
            employee.Assignments.Add(new EmployeeAssignment
            {
                DivisionId = divId,
                DepartmentId = deptId,
                PositionId = pos.Id,
                EmployeeTypeId = empTypeId,
                ManagerEmployeeId = await ValidateManagerAsync(request.ManagerEmployeeId, null, cancellationToken),
                EffectiveFrom = DateOnly.FromDateTime(DateTime.Today),
                IsCurrent = true,
                WageType = request.EmployeeType?.Contains("รายวัน") == true ? "DAILY" : "MONTHLY"
            });
        }

        _dbContext.Employees.Add(employee);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(employee.Id, cancellationToken);
    }

    public async Task<EmployeeDto> UpdateAsync(long id, UpdateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        // 1. ตรวจสอบสิทธิ์แก้ไข (ADMIN, SYSTEM_SUPER, EMP_MANAGE, EMP_EDIT, EMP_PROFILE_EDIT หรือแก้ไขโปรไฟล์ตนเอง ESS)
        bool isSuper = _currentUserService.HasRole("ADMIN") || _currentUserService.HasRole("SYSTEM_SUPER");
        bool hasManagePermission = isSuper ||
                                   _currentUserService.HasPermission("EMP_MANAGE") ||
                                   _currentUserService.HasPermission("EMP_EDIT") ||
                                   _currentUserService.HasPermission("EMP_PROFILE_EDIT");

        long? currentEmpId = _currentUserService.EmployeeId;
        bool isSelfUpdate = currentEmpId.HasValue && currentEmpId.Value == id;

        if (!hasManagePermission && !isSelfUpdate)
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์แก้ไขข้อมูลพนักงาน");
        }

        if (!isSelfUpdate && !isSuper)
        {
            string permToUse = _currentUserService.HasPermission("EMP_MANAGE") ? "EMP_MANAGE" :
                               _currentUserService.HasPermission("EMP_EDIT") ? "EMP_EDIT" : "EMP_PROFILE_EDIT";
            string scope = _currentUserService.GetDataScope(permToUse);
            if (scope == "SELF")
            {
                throw new ForbiddenException("ขอบเขตสิทธิ์ของคุณแก้ไขได้เฉพาะข้อมูลตนเองเท่านั้น");
            }
        }


        string idStr = id.ToString();
        var employee = await _dbContext.Employees
            .Include(e => e.Contact)
            .Include(e => e.SocialSecurity)
            .Include(e => e.Addresses)
            .Include(e => e.BankAccounts)
            .Include(e => e.Educations)
            .Include(e => e.WorkExperiences)
            .Include(e => e.FamilyMembers)
            .Include(e => e.EmergencyContacts)
            .Include(e => e.Assignments)
            .Include(e => e.Signatures)
            .FirstOrDefaultAsync(e => e.Id == id || e.EmployeeCode == idStr, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        // 2. อัปเดตข้อมูลทั่วไป
        var (gender, genderId) = ResolveGenderAndId(request.Gender, request.GenderId, request.Prefix);

        // ตรวจสอบและอัปเดตรหัสพนักงาน (หากมีการแก้ไขและไม่ซ้ำกับพนักงานคนอื่น)
        if (!string.IsNullOrWhiteSpace(request.EmployeeCode))
        {
            var newCode = request.EmployeeCode.Trim();
            if (!string.Equals(employee.EmployeeCode, newCode, StringComparison.OrdinalIgnoreCase))
            {
                if (hasManagePermission)
                {
                    bool codeExists = await _dbContext.Employees
                        .AnyAsync(e => e.EmployeeCode == newCode && e.Id != employee.Id, cancellationToken);
                    if (codeExists)
                    {
                        throw new ValidationException($"รหัสพนักงาน '{newCode}' มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น");
                    }
                    employee.EmployeeCode = newCode;
                }
            }
        }

        // ตรวจสอบและอัปเดตรหัสเครื่องสแกน (Biometric ID)
        if (request.BiometricId != null)
        {
            var cleanBio = string.IsNullOrWhiteSpace(request.BiometricId) ? null : request.BiometricId.Trim();
            if (cleanBio != null && !string.Equals(employee.BiometricId, cleanBio, StringComparison.OrdinalIgnoreCase))
            {
                bool bioExists = await _dbContext.Employees
                    .AnyAsync(e => e.BiometricId == cleanBio && e.Id != employee.Id, cancellationToken);
                if (bioExists)
                {
                    throw new ValidationException($"รหัสเครื่องสแกน '{cleanBio}' ถูกใช้งานโดยพนักงานคนอื่นแล้ว กรุณาตรวจสอบ");
                }
            }
            employee.BiometricId = cleanBio;
        }

        // อัปเดตสถานะการจ้างงาน (ACTIVE, INACTIVE)
        if (!string.IsNullOrWhiteSpace(request.EmploymentStatus))
        {
            var allowedStatuses = new[] { "ACTIVE", "INACTIVE" };
            var status = request.EmploymentStatus.ToUpper().Trim();
            if (!allowedStatuses.Contains(status))
                throw new ValidationException($"สถานะการจ้างงาน '{request.EmploymentStatus}' ไม่ถูกต้อง กรุณาใช้: ACTIVE, INACTIVE");
            employee.EmploymentStatus = status;
        }

        employee.Prefix = request.Prefix?.Trim();
        employee.FirstName = request.FirstName.Trim();
        employee.LastName = request.LastName.Trim();
        employee.BirthDate = request.BirthDate;
        employee.Gender = gender;
        employee.GenderId = genderId;
        // หน้าแก้ไขส่งมาเป็นข้อความ (ไม่ส่งรหัส) → ไม่ล้างรหัสอ้างอิงเดิมทิ้ง: ใช้รหัสที่ส่งมา / คงรหัสเดิมถ้าข้อความไม่เปลี่ยน / หาจากชื่อใน Master
        var nationalityId = request.NationalityId
            ?? (SameText(request.Nationality, employee.Nationality) && employee.NationalityId != null ? employee.NationalityId
                : string.IsNullOrWhiteSpace(request.Nationality) ? null
                : await _dbContext.Nationalities.AsNoTracking().Where(x => x.NationalityName == request.Nationality.Trim()).Select(x => (long?)x.Id).FirstOrDefaultAsync(cancellationToken));
        var religionId = request.ReligionId
            ?? (SameText(request.Religion, employee.Religion) && employee.ReligionId != null ? employee.ReligionId
                : string.IsNullOrWhiteSpace(request.Religion) ? null
                : await _dbContext.Religions.AsNoTracking().Where(x => x.ReligionName == request.Religion.Trim()).Select(x => (long?)x.Id).FirstOrDefaultAsync(cancellationToken));
        var maritalStatusId = request.MaritalStatusId
            ?? (SameText(request.MaritalStatus, employee.MaritalStatus) && employee.MaritalStatusId != null ? employee.MaritalStatusId
                : string.IsNullOrWhiteSpace(request.MaritalStatus) ? null
                : await _dbContext.MaritalStatusTypes.AsNoTracking().Where(x => x.MaritalStatusName == request.MaritalStatus.Trim()).Select(x => (long?)x.Id).FirstOrDefaultAsync(cancellationToken));
        employee.Nationality = request.Nationality;
        employee.NationalityId = nationalityId;
        employee.Religion = request.Religion;
        employee.ReligionId = religionId;
        employee.MaritalStatus = request.MaritalStatus;
        employee.MaritalStatusId = maritalStatusId;
        employee.MilitaryStatus = request.MilitaryStatus;
        // ไม่ส่งมา = คงค่าเดิม (หน้าที่ไม่มีช่องเหล่านี้จะไม่ล้างข้อมูลลดหย่อนเป็น 0)
        if (request.IsTopLevel.HasValue) employee.IsTopLevel = request.IsTopLevel.Value;
        if (request.SpouseHasIncome.HasValue) employee.SpouseHasIncome = request.SpouseHasIncome.Value;
        if (request.NumberOfChildren.HasValue) employee.NumberOfChildren = ValidateCount(request.NumberOfChildren.Value, "จำนวนบุตร", 20);
        if (request.ParentDeductionCount.HasValue) employee.ParentDeductionCount = ValidateCount(request.ParentDeductionCount.Value, "จำนวนบิดามารดาที่ลดหย่อน", 4);
        if (request.DisabilityDeductionCount.HasValue) employee.DisabilityDeductionCount = ValidateCount(request.DisabilityDeductionCount.Value, "จำนวนผู้พิการที่ลดหย่อน", 20);
        employee.UpdatedAt = DateTime.UtcNow;

        // 3. เข้ารหัส Citizen ID ใหม่ถ้ามีการระบุเป็นเลข 13 หลักที่ถูกต้อง (ป้องกันค่า Masked ทับ)
        if (!string.IsNullOrWhiteSpace(request.CitizenId))
        {
            var rawDigits = System.Text.RegularExpressions.Regex.Replace(request.CitizenId, @"\D", "");
            if (rawDigits.Length == 13 && !request.CitizenId.Contains('*') && !request.CitizenId.Contains('x') && !request.CitizenId.Contains('X'))
            {
                employee.CitizenId = rawDigits;
                employee.CitizenIdEncrypted = _cryptoService.Encrypt(rawDigits);
                employee.CitizenIdMasked = _cryptoService.MaskCitizenId(rawDigits);

                // ซิงค์เลขประกันสังคมให้ตรงกับ Citizen ID เสมอ (เลขประกันสังคมใช้เลขเดียวกับบัตรประชาชน)
                if (employee.SocialSecurity != null && string.IsNullOrWhiteSpace(request.SocialSecurityNo))
                {
                    employee.SocialSecurity.SocialSecurityNoEncrypted = employee.CitizenIdEncrypted;
                    employee.SocialSecurity.SocialSecurityNoMasked = employee.CitizenIdMasked;
                }
            }
        }

        // 4. ข้อมูลติดต่อ
        if (employee.Contact == null)
        {
            employee.Contact = new EmployeeContact { EmployeeId = employee.Id };
        }
        if (request.PersonalPhone != null)
        {
            employee.Contact.PersonalPhone = FormatPhoneNumber(request.PersonalPhone);
        }
        if (request.PersonalEmail != null)
        {
            employee.Contact.PersonalEmail = request.PersonalEmail?.Trim();
        }
        if (request.OrganizationEmail != null)
        {
            employee.Contact.OrganizationEmail = request.OrganizationEmail?.Trim();
        }

        // 5. ประกันสังคม (PDPA Encrypted - ใช้เลขเดียวกับเลขบัตรประชาชนอัตโนมัติ)
        if (!string.IsNullOrWhiteSpace(request.SocialSecurityNo) || request.HospitalName != null || request.HospitalCode != null)
        {
            if (employee.SocialSecurity == null)
            {
                employee.SocialSecurity = new EmployeeSocialSecurity { EmployeeId = employee.Id };
            }
            if (!string.IsNullOrWhiteSpace(request.SocialSecurityNo))
            {
                employee.SocialSecurity.SocialSecurityNoEncrypted = _cryptoService.Encrypt(request.SocialSecurityNo.Trim());
                employee.SocialSecurity.SocialSecurityNoMasked = _cryptoService.MaskCitizenId(request.SocialSecurityNo.Trim());
            }
            else if (employee.SocialSecurity.SocialSecurityNoEncrypted == null || employee.SocialSecurity.SocialSecurityNoEncrypted.Length == 0)
            {
                // ถ้ายังไม่มีเลขประกันสังคม ให้ใช้เลขเดียวกับ Citizen ID
                employee.SocialSecurity.SocialSecurityNoEncrypted = employee.CitizenIdEncrypted;
                employee.SocialSecurity.SocialSecurityNoMasked = employee.CitizenIdMasked;
            }
            if (request.HospitalName != null)
            {
                employee.SocialSecurity.HospitalName = request.HospitalName.Trim();
            }
            if (request.HospitalCode != null)
            {
                employee.SocialSecurity.HospitalCode = request.HospitalCode.Trim();
            }
        }

        // 6. ที่อยู่ (Address)
        if (request.Addresses != null && request.Addresses.Any())
        {
            employee.Addresses.Clear();
            foreach (var addr in request.Addresses)
            {
                employee.Addresses.Add(new EmployeeAddress
                {
                    AddressType = NormalizeAddressType(addr.AddressType),
                    AddressLine = addr.AddressLine,
                    SubDistrict = addr.SubDistrict,
                    District = addr.District,
                    Province = addr.Province,
                    PostalCode = addr.PostalCode,
                    IsCurrent = addr.IsCurrent
                });
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.AddressLine) || !string.IsNullOrWhiteSpace(request.Province))
        {
            var primaryAddr = employee.Addresses.FirstOrDefault(a => a.IsCurrent) ?? employee.Addresses.FirstOrDefault();
            if (primaryAddr != null)
            {
                primaryAddr.AddressType = NormalizeAddressType(request.AddressType ?? primaryAddr.AddressType);
                primaryAddr.AddressLine = request.AddressLine;
                primaryAddr.SubDistrict = request.SubDistrict;
                primaryAddr.District = request.District;
                primaryAddr.Province = request.Province;
                primaryAddr.PostalCode = request.PostalCode;
            }
            else
            {
                employee.Addresses.Add(new EmployeeAddress
                {
                    AddressType = NormalizeAddressType(request.AddressType),
                    AddressLine = request.AddressLine,
                    SubDistrict = request.SubDistrict,
                    District = request.District,
                    Province = request.Province,
                    PostalCode = request.PostalCode,
                    IsCurrent = true
                });
            }
        }

        // 6.1 บัญชีธนาคาร (Bank Accounts)
        if (request.BankAccounts != null && request.BankAccounts.Any())
        {
            foreach (var acc in request.BankAccounts)
            {
                var existing = employee.BankAccounts.FirstOrDefault(b => b.AccountNumber == acc.AccountNumber.Trim())
                               ?? employee.BankAccounts.FirstOrDefault(b => b.IsPrimary);
                if (existing != null)
                {
                    if (acc.BankId > 0) existing.BankId = acc.BankId;
                    existing.AccountNumber = acc.AccountNumber.Trim();
                    existing.AccountType = acc.AccountType ?? existing.AccountType;
                    existing.AccountName = acc.AccountName ?? employee.FullName;
                    existing.IsPrimary = acc.IsPrimary;
                    existing.Status = acc.Status ?? existing.Status;
                }
                else
                {
                    employee.BankAccounts.Add(new EmployeeBankAccount
                    {
                        BankId = acc.BankId > 0 ? acc.BankId : 1,
                        AccountNumber = acc.AccountNumber.Trim(),
                        AccountType = acc.AccountType ?? "SAVINGS",
                        AccountName = acc.AccountName ?? employee.FullName,
                        IsPrimary = acc.IsPrimary,
                        Status = acc.Status ?? "ACTIVE"
                    });
                }
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.AccountNumber) || !string.IsNullOrWhiteSpace(request.BankName))
        {
            var bank = await _dbContext.Banks
                .FirstOrDefaultAsync(b => b.BankName == (request.BankName ?? "") 
                                       || b.BankName.Contains(request.BankName ?? "") 
                                       || b.BankCode == (request.BankName ?? "")
                                       || (request.BankName != null && request.BankName.Contains(b.BankName)), cancellationToken);

            var primaryBank = employee.BankAccounts.FirstOrDefault(b => b.IsPrimary) ?? employee.BankAccounts.FirstOrDefault();
            if (primaryBank != null)
            {
                if (bank != null) primaryBank.BankId = bank.Id;
                if (!string.IsNullOrWhiteSpace(request.AccountNumber)) primaryBank.AccountNumber = request.AccountNumber.Trim();
                primaryBank.AccountName = employee.FullName;
            }
            else
            {
                employee.BankAccounts.Add(new EmployeeBankAccount
                {
                    BankId = bank?.Id ?? 1,
                    AccountNumber = request.AccountNumber?.Trim() ?? string.Empty,
                    AccountType = "SAVINGS",
                    AccountName = employee.FullName,
                    IsPrimary = true,
                    Status = "ACTIVE"
                });
            }
        }

        // 7. ประวัติการศึกษา (Educations) — ส่งมาทั้งชุด = แทนที่ทั้งหมด
        if (request.Educations != null)
        {
            ReplaceEducations(employee, request.Educations);
        }
        else if (!string.IsNullOrWhiteSpace(request.EducationLevel) || !string.IsNullOrWhiteSpace(request.Institution))
        {
            var primaryEdu = employee.Educations.FirstOrDefault();
            if (primaryEdu != null)
            {
                primaryEdu.EducationLevel = request.EducationLevel ?? primaryEdu.EducationLevel;
                primaryEdu.Institution = request.Institution ?? primaryEdu.Institution;
                primaryEdu.Major = request.Major ?? primaryEdu.Major;
                primaryEdu.GraduationYear = request.GraduationYear ?? primaryEdu.GraduationYear;
                primaryEdu.Gpa = request.Gpa ?? primaryEdu.Gpa;
            }
            else
            {
                employee.Educations.Add(new EmployeeEducation
                {
                    EducationLevel = request.EducationLevel ?? "ปริญญาตรี",
                    Institution = request.Institution ?? "-",
                    Major = request.Major,
                    GraduationYear = request.GraduationYear,
                    Gpa = request.Gpa
                });
            }
        }

        // 7.1 ประวัติการทำงาน — ส่งมาทั้งชุด = แทนที่ทั้งหมด
        if (request.WorkExperiences != null)
        {
            ReplaceWorkExperiences(employee, request.WorkExperiences);
        }

        // 8. ข้อมูลครอบครัว (Family Members)
        if (request.FamilyMembers != null)
        {
            employee.FamilyMembers.Clear();
            foreach (var fm in request.FamilyMembers)
            {
                if (string.IsNullOrWhiteSpace(fm.FirstName)) continue;
                byte[]? fmEncrypted = !string.IsNullOrWhiteSpace(fm.CitizenId) ? _cryptoService.Encrypt(fm.CitizenId.Trim()) : null;
                string? fmMasked = !string.IsNullOrWhiteSpace(fm.CitizenId) ? _cryptoService.MaskCitizenId(fm.CitizenId.Trim()) : null;

                employee.FamilyMembers.Add(new FamilyMember
                {
                    RelationshipType = fm.RelationshipType ?? "บิดา",
                    Prefix = fm.Prefix,
                    FirstName = !string.IsNullOrWhiteSpace(fm.Prefix) ? $"{fm.Prefix.Trim()} {fm.FirstName.Trim()}" : fm.FirstName.Trim(),
                    LastName = fm.LastName?.Trim(),
                    CitizenId = fm.CitizenId?.Trim(),
                    CitizenIdEncrypted = fmEncrypted,
                    CitizenIdMasked = fmMasked,
                    BirthDate = fm.BirthDate
                });
            }
        }

        // 9. กรณีฉุกเฉินติดต่อใคร (Emergency Contact)
        if (request.EmergencyContact != null && !string.IsNullOrWhiteSpace(request.EmergencyContact.FirstName))
        {
            var primaryEc = employee.EmergencyContacts.FirstOrDefault(c => c.IsPrimary) ?? employee.EmergencyContacts.FirstOrDefault();
            if (primaryEc != null)
            {
                primaryEc.Prefix = request.EmergencyContact.Prefix;
                primaryEc.FirstName = !string.IsNullOrWhiteSpace(request.EmergencyContact.Prefix) ? $"{request.EmergencyContact.Prefix.Trim()} {request.EmergencyContact.FirstName.Trim()}" : request.EmergencyContact.FirstName.Trim();
                primaryEc.LastName = request.EmergencyContact.LastName?.Trim() ?? primaryEc.LastName;
                primaryEc.Relationship = request.EmergencyContact.Relationship ?? primaryEc.Relationship;
                primaryEc.Address = request.EmergencyContact.Address ?? primaryEc.Address;
                primaryEc.PrimaryPhone = request.EmergencyContact.PrimaryPhone?.Trim() ?? primaryEc.PrimaryPhone;
            }
            else
            {
                employee.EmergencyContacts.Add(new EmergencyContact
                {
                    Prefix = request.EmergencyContact.Prefix,
                    FirstName = !string.IsNullOrWhiteSpace(request.EmergencyContact.Prefix) ? $"{request.EmergencyContact.Prefix.Trim()} {request.EmergencyContact.FirstName.Trim()}" : request.EmergencyContact.FirstName.Trim(),
                    LastName = request.EmergencyContact.LastName?.Trim() ?? "-",
                    Relationship = request.EmergencyContact.Relationship ?? "บิดา",
                    Address = request.EmergencyContact.Address,
                    PrimaryPhone = request.EmergencyContact.PrimaryPhone?.Trim() ?? "-",
                    IsPrimary = true
                });
            }
        }

        // 11. ข้อมูลตำแหน่งงาน (Employee Assignment)
        var currentAssignment = employee.Assignments.FirstOrDefault(a => a.IsCurrent);

        // ประเภทพนักงาน: เปลี่ยนได้เฉพาะผู้มีสิทธิ์แก้ไขข้อมูลพนักงาน (ไม่ใช่การแก้โปรไฟล์ตนเองแบบ ESS)
        bool canChangeEmployeeType = hasManagePermission;

        if (!string.IsNullOrWhiteSpace(request.EmployeeType) && currentAssignment != null)
        {
            await ApplyEmployeeTypeAsync(currentAssignment, request.EmployeeType, canChangeEmployeeType, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(request.PositionName))
        {
            var pos = await _dbContext.Positions
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.PositionName.Trim().ToLower() == request.PositionName.Trim().ToLower() || p.PositionName.Contains(request.PositionName.Trim()), cancellationToken);

            if (pos == null)
            {
                var defaultDept = await _dbContext.Departments.FirstOrDefaultAsync(cancellationToken);
                pos = new Position
                {
                    DepartmentId = defaultDept?.Id ?? 1,
                    PositionCode = await CodeGenerator.NextAsync(_dbContext.Positions.Select(p => p.PositionCode), "POS", 3, cancellationToken),
                    PositionName = request.PositionName.Trim(),
                    Status = "ACTIVE"
                };
                _dbContext.Positions.Add(pos);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            var deptId = pos.DepartmentId;
            var divId = pos.Department?.DivisionId ?? (await _dbContext.Departments.Where(d => d.Id == deptId).Select(d => d.DivisionId).FirstOrDefaultAsync(cancellationToken));
            if (divId == 0)
            {
                divId = await _dbContext.Divisions.Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            }

            if (currentAssignment != null)
            {
                currentAssignment.PositionId = pos.Id;
                currentAssignment.DepartmentId = deptId;
                currentAssignment.DivisionId = divId;
                if (!string.IsNullOrWhiteSpace(request.EmployeeType))
                {
                    await ApplyEmployeeTypeAsync(currentAssignment, request.EmployeeType, canChangeEmployeeType, cancellationToken);
                }
            }
            else
            {
                var empTypeId = await ResolveEmployeeTypeIdAsync(request.EmployeeType, cancellationToken);
                employee.Assignments.Add(new EmployeeAssignment
                {
                    DivisionId = divId,
                    DepartmentId = deptId,
                    PositionId = pos.Id,
                    EmployeeTypeId = empTypeId,
                    EffectiveFrom = DateOnly.FromDateTime(DateTime.Today),
                    IsCurrent = true,
                    WageType = request.EmployeeType?.Contains("รายวัน") == true ? "DAILY" : "MONTHLY"
                });
            }

            // ตรวจสอบและปรับฐานเงินเดือนขั้นต่ำตามโครงสร้างเงินเดือนของตำแหน่งใหม่ (Auto-Adjust to Structure Minimum)
            var toStructure = await _dbContext.SalaryStructures
                .Where(s => s.Status == "ACTIVE" && s.PositionId == pos.Id)
                .OrderByDescending(s => s.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);

            if (toStructure != null && toStructure.MinSalary > 0)
            {
                var activeSalary = await _dbContext.EmployeeSalaries
                    .Where(s => s.EmployeeId == employee.Id && s.EffectiveTo == null)
                    .OrderByDescending(s => s.EffectiveFrom)
                    .FirstOrDefaultAsync(cancellationToken);

                if (activeSalary != null && activeSalary.BaseSalary < toStructure.MinSalary)
                {
                    activeSalary.BaseSalary = toStructure.MinSalary;
                    activeSalary.Reason = string.IsNullOrWhiteSpace(activeSalary.Reason)
                        ? $"ปรับฐานเงินเดือนตามโครงสร้างขั้นต่ำ ({toStructure.MinSalary:N0} บาท)"
                        : $"{activeSalary.Reason} (ปรับขั้นต่ำตามตำแหน่ง {toStructure.MinSalary:N0} บาท)";
                }
            }
        }

        // 11.1 หัวหน้างานโดยตรง (เฉพาะผู้มีสิทธิ์จัดการพนักงาน — พนักงานแก้โปรไฟล์ตัวเองเปลี่ยนไม่ได้)
        if (request.SetManager && hasManagePermission)
        {
            var assignment = employee.Assignments.Where(a => a.IsCurrent).OrderByDescending(a => a.EffectiveFrom).FirstOrDefault();
            if (assignment == null)
                throw new ValidationException("กรุณาระบุตำแหน่งงานก่อนกำหนดหัวหน้างาน");
            assignment.ManagerEmployeeId = await ValidateManagerAsync(request.ManagerEmployeeId, employee.Id, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(employee.Id, cancellationToken);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.HasPermission("EMP_MANAGE"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์ลบข้อมูลพนักงาน");
        }

        string idStr = id.ToString();
        var employee = await _dbContext.Employees
            .FirstOrDefaultAsync(e => e.Id == id || e.EmployeeCode == idStr, cancellationToken);
        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        _dbContext.Employees.Remove(employee);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>เปลี่ยนสถานะการจ้างงาน — ACTIVE, INACTIVE</summary>
    public async Task<EmployeeDto> UpdateStatusAsync(long id, string status, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.HasPermission("EMP_MANAGE"))
            throw new ForbiddenException("คุณไม่มีสิทธิ์เปลี่ยนสถานะพนักงาน");

        var allowedStatuses = new[] { "ACTIVE", "INACTIVE" };
        var normalized = status?.ToUpper().Trim() ?? string.Empty;
        if (!allowedStatuses.Contains(normalized))
            throw new ValidationException($"สถานะ '{status}' ไม่ถูกต้อง กรุณาใช้: ACTIVE, INACTIVE");

        var employee = await _dbContext.Employees
            .Include(e => e.Avatar)
            .Include(e => e.Contact)
            .Include(e => e.Signatures)
            .Include(e => e.Assignments).ThenInclude(a => a.Position)
            .Include(e => e.Assignments).ThenInclude(a => a.Department)
            .Include(e => e.Assignments).ThenInclude(a => a.Division)
            .Include(e => e.Assignments).ThenInclude(a => a.EmployeeType)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (employee == null)
            throw new NotFoundException("Employee", id);

        employee.EmploymentStatus = normalized;
        employee.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(employee);
    }

    public async Task<string> UploadAvatarAsync(
        long id,
        Stream stream,
        string contentType,
        long length,
        CancellationToken cancellationToken = default)
    {
        // 1. ตรวจสอบสิทธิ์ (ADMIN, EMP_MANAGE, EMP_PROFILE_EDIT หรือพนักงานตัวเอง)
        bool canManageAvatar = _currentUserService.HasRole("ADMIN") ||
                               _currentUserService.HasPermission("EMP_MANAGE") ||
                               _currentUserService.HasPermission("EMP_PROFILE_EDIT");

        if (!canManageAvatar)
        {
            long? myEmpId = _currentUserService.EmployeeId;
            if (!myEmpId.HasValue || myEmpId.Value != id)
            {
                throw new ForbiddenException("คุณไม่มีสิทธิ์เปลี่ยนรูปโปรไฟล์ของพนักงานท่านอื่น");
            }
        }

        // 2. Validate content type
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        var normalizedType = contentType.ToLower().Split(';')[0].Trim();
        if (!allowedTypes.Contains(normalizedType))
        {
            throw new ValidationException("รองรับเฉพาะไฟล์รูปภาพประเภท JPG, PNG, WebP หรือ GIF เท่านั้น");
        }

        // 3. Validate size (Max 5MB)
        if (length > 5 * 1024 * 1024)
        {
            throw new ValidationException("ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB");
        }

        var employee = await _dbContext.Employees.FindAsync(new object[] { id }, cancellationToken);
        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();

        var avatar = await _dbContext.EmployeeAvatars.FindAsync(new object[] { id }, cancellationToken);
        var now = DateTime.UtcNow;

        if (avatar != null)
        {
            avatar.ImageData = bytes;
            avatar.MimeType = normalizedType;
            avatar.FileSize = (int)bytes.Length;
            avatar.UpdatedAt = now;
        }
        else
        {
            avatar = new EmployeeAvatar
            {
                EmployeeId = id,
                ImageData = bytes,
                MimeType = normalizedType,
                FileSize = (int)bytes.Length,
                UpdatedAt = now
            };
            _dbContext.EmployeeAvatars.Add(avatar);
        }

        employee.AvatarUpdatedAt = now;
        employee.UpdatedAt = now;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return $"/api/employees/{id}/avatar?v={now.Ticks}";
    }

    public async Task<(byte[] ImageData, string MimeType)?> GetAvatarAsync(
        long id,
        CancellationToken cancellationToken = default)
    {
        var avatar = await _dbContext.EmployeeAvatars
            .Where(a => a.EmployeeId == id)
            .Select(a => new { a.ImageData, a.MimeType })
            .FirstOrDefaultAsync(cancellationToken);

        if (avatar == null || avatar.ImageData == null || avatar.ImageData.Length == 0)
        {
            return null;
        }

        return (avatar.ImageData, avatar.MimeType);
    }

    public async Task<bool> DeleteAvatarAsync(
        long id,
        CancellationToken cancellationToken = default)
    {
        bool canManageAvatar = _currentUserService.HasRole("ADMIN") ||
                               _currentUserService.HasPermission("EMP_MANAGE") ||
                               _currentUserService.HasPermission("EMP_PROFILE_EDIT");

        if (!canManageAvatar)
        {
            long? myEmpId = _currentUserService.EmployeeId;
            if (!myEmpId.HasValue || myEmpId.Value != id)
            {
                throw new ForbiddenException("คุณไม่มีสิทธิ์ลบรูปโปรไฟล์ของพนักงานท่านอื่น");
            }
        }

        var avatar = await _dbContext.EmployeeAvatars.FindAsync(new object[] { id }, cancellationToken);
        var employee = await _dbContext.Employees.FindAsync(new object[] { id }, cancellationToken);

        if (avatar != null)
        {
            _dbContext.EmployeeAvatars.Remove(avatar);
        }

        if (employee != null)
        {
            employee.AvatarUpdatedAt = null;
            employee.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<string> UploadSignatureAsync(
        long id,
        Stream stream,
        string fileName,
        string contentType,
        long length,
        CancellationToken cancellationToken = default)
    {
        // 1. ตรวจสอบสิทธิ์ (ADMIN, EMP_MANAGE, EMP_PROFILE_EDIT หรือพนักงานตัวเอง)
        bool canManageSig = _currentUserService.HasRole("ADMIN") ||
                            _currentUserService.HasPermission("EMP_MANAGE") ||
                            _currentUserService.HasPermission("EMP_PROFILE_EDIT");

        if (!canManageSig)
        {
            long? myEmpId = _currentUserService.EmployeeId;
            if (!myEmpId.HasValue || myEmpId.Value != id)
            {
                throw new ForbiddenException("คุณไม่มีสิทธิ์เปลี่ยนลายเซ็นของพนักงานท่านอื่น");
            }
        }

        var employee = await _dbContext.Employees.FindAsync(new object[] { id }, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        var allowedTypes = new[] { "image/png", "image/jpeg", "image/jpg" };
        if (!allowedTypes.Contains(contentType.ToLowerInvariant()))
        {
            throw new ValidationException("รองรับเฉพาะไฟล์ภาพนามสกุล PNG หรือ JPG เท่านั้น");
        }

        if (length > 2 * 1024 * 1024)
        {
            throw new ValidationException("ขนาดไฟล์ต้องไม่เกิน 2MB");
        }

        byte[] signatureBytes;
        using (var memoryStream = new MemoryStream())
        {
            await stream.CopyToAsync(memoryStream, cancellationToken);
            signatureBytes = memoryStream.ToArray();
        }

        var existingSignature = await _dbContext.EmployeeSignatures
            .FirstOrDefaultAsync(s => s.EmployeeId == id && s.IsActive, cancellationToken);

        var now = DateTime.UtcNow;
        if (existingSignature != null)
        {
            existingSignature.SignatureData = signatureBytes;
            existingSignature.FileName = fileName;
            existingSignature.FileSize = (int)length;
            existingSignature.MimeType = contentType;
            existingSignature.UpdatedAt = now;
        }
        else
        {
            var newSignature = new EmployeeSignature
            {
                EmployeeId = id,
                SignatureData = signatureBytes,
                FileName = fileName,
                FileSize = (int)length,
                MimeType = contentType,
                IsActive = true,
                UploadedAt = now,
                UpdatedAt = now
            };
            _dbContext.EmployeeSignatures.Add(newSignature);
        }

        employee.UpdatedAt = now;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return $"/api/employees/{id}/signature?v={now.Ticks}";
    }

    public async Task<(byte[] SignatureData, string MimeType)?> GetSignatureAsync(long id, CancellationToken cancellationToken = default)
    {
        var signature = await _dbContext.EmployeeSignatures
            .Where(s => s.EmployeeId == id && s.IsActive)
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (signature == null || signature.SignatureData == null || signature.SignatureData.Length == 0)
        {
            return null;
        }

        return (signature.SignatureData, signature.MimeType);
    }

    public async Task<bool> DeleteSignatureAsync(long id, CancellationToken cancellationToken = default)
    {
        bool canManageSig = _currentUserService.HasRole("ADMIN") ||
                            _currentUserService.HasPermission("EMP_MANAGE") ||
                            _currentUserService.HasPermission("EMP_PROFILE_EDIT");

        if (!canManageSig)
        {
            long? myEmpId = _currentUserService.EmployeeId;
            if (!myEmpId.HasValue || myEmpId.Value != id)
            {
                throw new ForbiddenException("คุณไม่มีสิทธิ์ลบลายเซ็นของพนักงานท่านอื่น");
            }
        }

        var signature = await _dbContext.EmployeeSignatures
            .FirstOrDefaultAsync(s => s.EmployeeId == id && s.IsActive, cancellationToken);

        if (signature == null)
        {
            return false;
        }

        _dbContext.EmployeeSignatures.Remove(signature);
        var employee = await _dbContext.Employees.FindAsync(new object[] { id }, cancellationToken);
        if (employee != null)
        {
            employee.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static int ValidateCount(int value, string label, int max)
    {
        if (value < 0 || value > max) throw new ValidationException($"{label}ต้องอยู่ระหว่าง 0 - {max}");
        return value;
    }

    private static void ReplaceEducations(Employee employee, List<EmployeeEducationInput> items)
    {
        var cleaned = items
            .Where(i => !string.IsNullOrWhiteSpace(i.EducationLevel) || !string.IsNullOrWhiteSpace(i.Institution))
            .ToList();
        foreach (var i in cleaned)
        {
            if (string.IsNullOrWhiteSpace(i.EducationLevel) || string.IsNullOrWhiteSpace(i.Institution))
                throw new ValidationException("ประวัติการศึกษาแต่ละรายการต้องระบุระดับการศึกษาและสถาบัน");
            if (i.Gpa is < 0m or > 4m)
                throw new ValidationException("เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 - 4.00");
        }

        employee.Educations.Clear();
        foreach (var i in cleaned)
        {
            employee.Educations.Add(new EmployeeEducation
            {
                EducationLevel = i.EducationLevel.Trim(),
                Institution = i.Institution.Trim(),
                Major = string.IsNullOrWhiteSpace(i.Major) ? null : i.Major.Trim(),
                GraduationYear = i.GraduationYear,
                Gpa = i.Gpa
            });
        }
    }

    private static void ReplaceWorkExperiences(Employee employee, List<EmployeeWorkExperienceInput> items)
    {
        var cleaned = items.Where(i => !string.IsNullOrWhiteSpace(i.CompanyName)).ToList();
        var parsed = new List<EmployeeWorkExperience>();
        foreach (var i in cleaned)
        {
            var start = ParseDateOnly(i.StartDate);
            var end = ParseDateOnly(i.EndDate);
            if (start.HasValue && end.HasValue && end < start)
                throw new ValidationException($"ประวัติการทำงานที่ \"{i.CompanyName.Trim()}\": วันที่ออกต้องไม่ก่อนวันที่เริ่มงาน");
            if (i.LastSalary is < 0m)
                throw new ValidationException("เงินเดือนล่าสุดต้องไม่ติดลบ");
            parsed.Add(new EmployeeWorkExperience
            {
                CompanyName = i.CompanyName.Trim(),
                PositionName = string.IsNullOrWhiteSpace(i.PositionName) ? null : i.PositionName.Trim(),
                StartDate = start,
                EndDate = end,
                LastSalary = i.LastSalary,
                LeavingReason = string.IsNullOrWhiteSpace(i.LeavingReason) ? null : i.LeavingReason.Trim(),
                JobDescription = string.IsNullOrWhiteSpace(i.JobDescription) ? null : i.JobDescription.Trim()
            });
        }

        employee.WorkExperiences.Clear();
        foreach (var w in parsed) employee.WorkExperiences.Add(w);
    }

    private static DateOnly? ParseDateOnly(string? value) =>
        DateOnly.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d) ? d : null;

    /// <summary>ตรวจหัวหน้างาน: ต้องมีอยู่จริง ไม่ใช่ตัวเอง และไม่ทำให้เกิดวงวน (A เป็นหัวหน้า B และ B เป็นหัวหน้า A)</summary>
    private async Task<long?> ValidateManagerAsync(long? managerId, long? employeeId, CancellationToken cancellationToken)
    {
        if (!managerId.HasValue || managerId.Value <= 0) return null;
        if (employeeId.HasValue && managerId.Value == employeeId.Value)
            throw new ValidationException("ไม่สามารถกำหนดพนักงานเป็นหัวหน้าของตัวเองได้");

        var exists = await _dbContext.Employees.AnyAsync(e => e.Id == managerId.Value, cancellationToken);
        if (!exists) throw new ValidationException("ไม่พบพนักงานที่เลือกเป็นหัวหน้างาน");

        if (employeeId.HasValue)
        {
            // เดินขึ้นสายบังคับบัญชาของหัวหน้าที่เลือก ถ้าเจอพนักงานคนนี้ = วงวน
            var visited = new HashSet<long>();
            long? cursor = managerId.Value;
            while (cursor.HasValue && visited.Add(cursor.Value))
            {
                var current = cursor.Value;
                cursor = await _dbContext.EmployeeAssignments.AsNoTracking()
                    .Where(a => a.EmployeeId == current && a.IsCurrent)
                    .OrderByDescending(a => a.EffectiveFrom)
                    .Select(a => a.ManagerEmployeeId)
                    .FirstOrDefaultAsync(cancellationToken);
                if (cursor == employeeId.Value)
                    throw new ValidationException("ไม่สามารถกำหนดหัวหน้าคนนี้ได้ เพราะพนักงานคนนี้เป็นหัวหน้า (ทางตรงหรือทางอ้อม) ของหัวหน้าที่เลือก");
            }
        }

        return managerId.Value;
    }

    private EmployeeDto MapToDto(Employee e)
    {
        var (gender, genderId) = ResolveGenderAndId(e.Gender, e.GenderId, e.Prefix);
        var currentAssignment = e.Assignments?.FirstOrDefault(a => a.IsCurrent) ?? e.Assignments?.FirstOrDefault();

        var activeSig = e.Signatures?.FirstOrDefault(s => s.IsActive);

        return new EmployeeDto
        {
            Id = e.Id,
            EmployeeCode = e.EmployeeCode,
            BiometricId = e.BiometricId,
            EmploymentStatus = e.EmploymentStatus,
            Prefix = e.Prefix,
            FirstName = e.FirstName,
            LastName = e.LastName,
            FullName = e.FullName,
            CitizenIdMasked = !string.IsNullOrWhiteSpace(e.CitizenId)
                ? _cryptoService.MaskCitizenId(e.CitizenId)
                : (!string.IsNullOrWhiteSpace(e.CitizenIdMasked) ? e.CitizenIdMasked : null),
            BirthDate = e.BirthDate,
            Gender = gender,
            GenderId = genderId,
            Nationality = e.Nationality,
            NationalityId = e.NationalityId,
            Religion = e.Religion,
            ReligionId = e.ReligionId,
            MaritalStatus = e.MaritalStatus,
            MaritalStatusId = e.MaritalStatusId,
            MilitaryStatus = e.MilitaryStatus,
            IsTopLevel = e.IsTopLevel,
            SpouseHasIncome = e.SpouseHasIncome,
            NumberOfChildren = e.NumberOfChildren,
            ParentDeductionCount = e.ParentDeductionCount,
            DisabilityDeductionCount = e.DisabilityDeductionCount,
            PositionId = currentAssignment?.PositionId,
            PositionCode = currentAssignment?.Position?.PositionCode?.Trim(),
            PositionName = currentAssignment?.Position?.PositionName?.Trim(),
            DepartmentId = currentAssignment?.DepartmentId,
            DepartmentCode = currentAssignment?.Department?.DepartmentCode?.Trim(),
            DepartmentName = currentAssignment?.Department?.DepartmentName?.Trim(),
            DivisionId = currentAssignment?.DivisionId,
            DivisionCode = currentAssignment?.Division?.DivisionCode?.Trim(),
            DivisionName = currentAssignment?.Division?.DivisionName?.Trim(),
            EmployeeTypeId = currentAssignment?.EmployeeTypeId ?? (currentAssignment != null ? (currentAssignment.WageType == "DAILY" ? 4L : 1L) : null),
            EmployeeType = currentAssignment?.EmployeeType?.TypeName ?? (currentAssignment != null ? (currentAssignment.WageType == "DAILY" ? "พนักงานรายวัน" : "พนักงานประจำ") : null),
            ManagerEmployeeId = currentAssignment?.ManagerEmployeeId,
            ManagerName = currentAssignment?.ManagerEmployee?.FullName,
            ManagerEmployeeCode = currentAssignment?.ManagerEmployee?.EmployeeCode,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
            AvatarUpdatedAt = e.AvatarUpdatedAt,
            AvatarUrl = e.AvatarUpdatedAt.HasValue
                ? $"/api/employees/{e.Id}/avatar?v={e.AvatarUpdatedAt.Value.Ticks}"
                : null,
            HasSignature = activeSig != null,
            SignatureUrl = activeSig != null
                ? $"/api/employees/{e.Id}/signature?v={activeSig.UpdatedAt.Ticks}"
                : null,
            Contact = e.Contact != null ? new EmployeeContactDto
            {
                PersonalPhone = FormatPhoneNumber(e.Contact.PersonalPhone),
                PersonalEmail = e.Contact.PersonalEmail,
                OrganizationEmail = e.Contact.OrganizationEmail
            } : null,
            SocialSecurity = ((_currentUserService.HasRole("ADMIN") || _currentUserService.HasRole("SYSTEM_SUPER")
                || (_currentUserService.EmployeeId.HasValue && _currentUserService.EmployeeId.Value == e.Id)
                || _currentUserService.HasPermission("EMP_MANAGE") || _currentUserService.HasPermission("EMP_EDIT"))
                && e.SocialSecurity != null) ? new EmployeeSocialSecurityDto
            {
                SocialSecurityNoMasked = e.SocialSecurity.SocialSecurityNoMasked,
                HospitalName = e.SocialSecurity.HospitalName,
                HospitalCode = e.SocialSecurity.HospitalCode
            } : null,
            Addresses = e.Addresses.Select(a => new EmployeeAddressDto
            {
                Id = a.Id,
                AddressType = a.AddressType,
                AddressLine = a.AddressLine,
                SubDistrict = a.SubDistrict,
                District = a.District,
                Province = a.Province,
                PostalCode = a.PostalCode,
                IsCurrent = a.IsCurrent
            }).ToList(),
            BankAccounts = e.BankAccounts.Select(b => new EmployeeBankAccountDto
            {
                Id = b.Id,
                BankId = b.BankId,
                BankCode = b.Bank?.BankCode,
                BankName = b.Bank?.BankName,
                AccountNumber = b.AccountNumber,
                AccountType = b.AccountType,
                AccountName = b.AccountName,
                IsPrimary = b.IsPrimary,
                Status = b.Status
            }).ToList(),
            WorkExperiences = (e.WorkExperiences ?? new List<EmployeeWorkExperience>())
                .OrderByDescending(w => w.StartDate)
                .Select(w => new EmployeeWorkExperienceDto
                {
                    Id = w.Id,
                    CompanyName = w.CompanyName,
                    PositionName = w.PositionName,
                    StartDate = w.StartDate?.ToString("yyyy-MM-dd"),
                    EndDate = w.EndDate?.ToString("yyyy-MM-dd"),
                    LastSalary = w.LastSalary,
                    LeavingReason = w.LeavingReason,
                    JobDescription = w.JobDescription
                }).ToList(),
            Educations = e.Educations.OrderBy(ed => ed.GraduationYear ?? int.MaxValue).Select(ed => new EmployeeEducationDto
            {
                Id = ed.Id,
                EducationLevel = ed.EducationLevel,
                Institution = ed.Institution,
                Major = ed.Major,
                GraduationYear = ed.GraduationYear,
                Gpa = ed.Gpa
            }).ToList(),
            FamilyMembers = e.FamilyMembers.Select(fm => new FamilyMemberDto
            {
                Id = fm.Id,
                RelationshipType = fm.RelationshipType,
                Prefix = fm.Prefix,
                FirstName = fm.FirstName,
                LastName = fm.LastName,
                CitizenIdMasked = fm.CitizenIdMasked,
                BirthDate = fm.BirthDate
            }).ToList(),
            EmergencyContacts = e.EmergencyContacts.Select(ec => new EmergencyContactDto
            {
                Id = ec.Id,
                Relationship = ec.Relationship,
                Prefix = ec.Prefix,
                FirstName = ec.FirstName,
                LastName = ec.LastName,
                Address = ec.Address,
                PrimaryPhone = FormatPhoneNumber(ec.PrimaryPhone) ?? string.Empty,
                IsPrimary = ec.IsPrimary
            }).ToList(),
            UserAccount = e.UserAccount != null ? new EmployeeUserAccountDto
            {
                Id = e.UserAccount.Id,
                Username = e.UserAccount.Username,
                Status = e.UserAccount.Status,
                LastLoginAt = e.UserAccount.LastLoginAt,
                Roles = e.UserAccount.UserRoles.Select(ur => ur.Role.RoleCode).ToList(),
                RoleNames = e.UserAccount.UserRoles.Select(ur => ur.Role.RoleName).ToList(),
                AccessScope = e.UserAccount.UserRoles.Any(ur => ur.Role.RoleCode == "ADMIN" || ur.Role.RoleCode == "CEO")
                    ? "ALL (เข้าถึงข้อมูลทั้งองค์กร)"
                    : (e.UserAccount.UserRoles.Any(ur => ur.Role.RoleCode == "HR" || ur.Role.RoleCode == "MANAGER")
                        ? "DEPARTMENT (เข้าถึงข้อมูลระดับแผนก)"
                        : "SELF (ดูข้อมูลตนเอง)")
            } : null
        };
    }

    private static string? FormatPhoneNumber(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = System.Text.RegularExpressions.Regex.Replace(phone, @"\D", "");
        if (digits.Length == 10)
        {
            return $"{digits.Substring(0, 3)}-{digits.Substring(3, 3)}-{digits.Substring(6)}";
        }
        if (digits.Length == 9)
        {
            if (digits.StartsWith("02"))
            {
                return $"{digits.Substring(0, 2)}-{digits.Substring(2, 3)}-{digits.Substring(5)}";
            }
            return $"{digits.Substring(0, 3)}-{digits.Substring(3, 3)}-{digits.Substring(6)}";
        }
        return phone.Trim();
    }

    private static (string? gender, long? genderId) ResolveGenderAndId(string? gender, long? genderId, string? prefix)
    {
        // 1. If gender is specified
        if (!string.IsNullOrWhiteSpace(gender))
        {
            var trimmedGender = gender.Trim();
            if (genderId.HasValue && genderId.Value > 0) return (trimmedGender, genderId);

            if (trimmedGender.Equals("ชาย", StringComparison.OrdinalIgnoreCase) ||
                trimmedGender.Equals("Male", StringComparison.OrdinalIgnoreCase) ||
                trimmedGender.Equals("M", StringComparison.OrdinalIgnoreCase))
            {
                return ("ชาย", 1);
            }
            if (trimmedGender.Equals("หญิง", StringComparison.OrdinalIgnoreCase) ||
                trimmedGender.Equals("Female", StringComparison.OrdinalIgnoreCase) ||
                trimmedGender.Equals("F", StringComparison.OrdinalIgnoreCase))
            {
                return ("หญิง", 2);
            }
            if (trimmedGender.Equals("ไม่ระบุ", StringComparison.OrdinalIgnoreCase) ||
                trimmedGender.Equals("Other", StringComparison.OrdinalIgnoreCase) ||
                trimmedGender.Equals("O", StringComparison.OrdinalIgnoreCase))
            {
                return ("ไม่ระบุ", 3);
            }
            return (trimmedGender, genderId);
        }

        // 2. If genderId is specified but gender is empty
        if (genderId.HasValue)
        {
            return genderId.Value switch
            {
                1 => ("ชาย", 1),
                2 => ("หญิง", 2),
                3 => ("ไม่ระบุ", 3),
                _ => (null, genderId)
            };
        }

        // 3. Fallback from prefix
        if (!string.IsNullOrWhiteSpace(prefix))
        {
            var trimmedPrefix = prefix.Trim();
            if (trimmedPrefix.Equals("นาย", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("เด็กชาย", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("ด.ช.", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("Mr.", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("Mr", StringComparison.OrdinalIgnoreCase))
            {
                return ("ชาย", 1);
            }

            if (trimmedPrefix.Equals("นาง", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("นางสาว", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("น.ส.", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("เด็กหญิง", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("ด.ญ.", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("Mrs.", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("Ms.", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrefix.Equals("Miss", StringComparison.OrdinalIgnoreCase))
            {
                return ("หญิง", 2);
            }
        }

        return (null, null);
    }

    /// <summary>
    /// ตั้งประเภทพนักงานให้ตำแหน่งปัจจุบัน — ถ้าค่าเปลี่ยนจริงแต่ไม่มีสิทธิ์ จะไม่ยอมให้เปลี่ยน
    /// รายวัน/รายเดือนอิงจากข้อมูลหลักประเภทพนักงาน
    /// </summary>
    private async Task ApplyEmployeeTypeAsync(EmployeeAssignment assignment, string employeeType, bool canChange, CancellationToken cancellationToken)
    {
        var newTypeId = await ResolveEmployeeTypeIdAsync(employeeType, cancellationToken);
        if (assignment.EmployeeTypeId == newTypeId) return;

        if (assignment.EmployeeTypeId.HasValue && !canChange)
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์เปลี่ยนประเภทพนักงาน (ต้องมีสิทธิ์แก้ไขข้อมูลพนักงาน)");
        }

        var typeWage = await _dbContext.EmployeeTypes.AsNoTracking()
            .Where(t => t.Id == newTypeId).Select(t => t.WageType).FirstOrDefaultAsync(cancellationToken);
        assignment.EmployeeTypeId = newTypeId;
        assignment.WageType = typeWage?.ToUpperInvariant() switch
        {
            "DAILY" => "DAILY",
            "MONTHLY" => "MONTHLY",
            _ => employeeType.Contains("รายวัน") ? "DAILY" : "MONTHLY"
        };
    }

    private async Task<long> ResolveEmployeeTypeIdAsync(string? employeeType, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(employeeType))
            return 1L; // default PERM (พนักงานประจำ)

        var trimmed = employeeType.Trim();
        var match = await _dbContext.EmployeeTypes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TypeName == trimmed || t.TypeCode == trimmed, cancellationToken);
        if (match != null)
            return match.Id;

        if (trimmed.Contains("ทดลอง") || trimmed.Contains("PROB", StringComparison.OrdinalIgnoreCase)) return 2L;
        if (trimmed.Contains("สัญญา") || trimmed.Contains("CONT", StringComparison.OrdinalIgnoreCase)) return 3L;
        if (trimmed.Contains("รายวัน") || trimmed.Contains("DAILY", StringComparison.OrdinalIgnoreCase)) return 4L;
        if (trimmed.Contains("พาร์ท") || trimmed.Contains("PART", StringComparison.OrdinalIgnoreCase)) return 5L;
        if (trimmed.Contains("ฝึกงาน") || trimmed.Contains("INTERN", StringComparison.OrdinalIgnoreCase)) return 6L;

        return 1L; // default PERM
    }

    private static string NormalizeAddressType(string? addressType)
    {
        if (string.IsNullOrWhiteSpace(addressType)) return "CURRENT";
        var upper = addressType.Trim().ToUpperInvariant();
        return upper switch
        {
            "REGISTERED" => "REGISTERED",
            "CURRENT" => "CURRENT",
            "OTHER" => "OTHER",
            "ทะเบียนบ้าน" or "ที่อยู่ตามทะเบียนบ้าน" => "REGISTERED",
            _ => "CURRENT"
        };
    }

    private static bool SameText(string? a, string? b) =>
        string.Equals((a ?? string.Empty).Trim(), (b ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase);
}
