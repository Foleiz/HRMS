using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
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
        if (!_currentUserService.HasPermission("EMP_VIEW") && !_currentUserService.HasPermission("EMP_MANAGE"))
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
            .AsNoTracking();

        // 2. Data Scoping
        string dataScope = _currentUserService.GetDataScope("EMP_VIEW");
        if (dataScope == "SELF")
        {
            long? myEmpId = _currentUserService.EmployeeId;
            if (!myEmpId.HasValue)
            {
                return new List<EmployeeDto>();
            }
            query = query.Where(e => e.Id == myEmpId.Value);
        }

        // 3. กรองคำค้นหา
        if (!string.IsNullOrWhiteSpace(search))
        {
            string term = search.Trim().ToLower();
            query = query.Where(e =>
                e.EmployeeCode.ToLower().Contains(term) ||
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
        if (!_currentUserService.HasPermission("EMP_VIEW") && !_currentUserService.HasPermission("EMP_MANAGE"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์เข้าถึงข้อมูลพนักงาน");
        }

        // Data Scoping
        string dataScope = _currentUserService.GetDataScope("EMP_VIEW");
        if (dataScope == "SELF")
        {
            long? myEmpId = _currentUserService.EmployeeId;
            if (!myEmpId.HasValue || myEmpId.Value != id)
            {
                throw new ForbiddenException("คุณสามารถดูได้เฉพาะข้อมูลของตนเองเท่านั้น");
            }
        }

        var employee = await _dbContext.Employees
            .Include(e => e.Contact)
            .Include(e => e.SocialSecurity)
            .Include(e => e.Addresses)
            .Include(e => e.Educations)
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
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        return MapToDto(employee);
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        // 1. ตรวจสอบสิทธิ์สร้างพนักงาน
        if (!_currentUserService.HasPermission("EMP_MANAGE"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์สร้างข้อมูลพนักงาน");
        }

        // 2. ตรวจสอบความซ้ำซ้อนของรหัสพนักงาน
        bool codeExists = await _dbContext.Employees
            .AnyAsync(e => e.EmployeeCode == request.EmployeeCode.Trim(), cancellationToken);
        if (codeExists)
        {
            throw new ValidationException($"รหัสพนักงาน '{request.EmployeeCode}' มีอยู่ในระบบแล้ว");
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

        // 5. ประกันสังคม (PDPA Encrypted)
        if (!string.IsNullOrWhiteSpace(request.SocialSecurityNo))
        {
            employee.SocialSecurity = new EmployeeSocialSecurity
            {
                SocialSecurityNoEncrypted = _cryptoService.Encrypt(request.SocialSecurityNo.Trim()),
                SocialSecurityNoMasked = _cryptoService.MaskCitizenId(request.SocialSecurityNo.Trim()),
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

        // 8. ประวัติการศึกษา
        if (!string.IsNullOrWhiteSpace(request.EducationLevel) || !string.IsNullOrWhiteSpace(request.Institution))
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
                    PositionCode = "POS_" + Guid.NewGuid().ToString("N")[..6].ToUpper(),
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

            employee.Assignments.Add(new EmployeeAssignment
            {
                DivisionId = divId,
                DepartmentId = deptId,
                PositionId = pos.Id,
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
        // 1. ตรวจสอบสิทธิ์แก้ไข
        if (!_currentUserService.HasPermission("EMP_MANAGE"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์แก้ไขข้อมูลพนักงาน");
        }

        var employee = await _dbContext.Employees
            .Include(e => e.Contact)
            .Include(e => e.SocialSecurity)
            .Include(e => e.Addresses)
            .Include(e => e.BankAccounts)
            .Include(e => e.Educations)
            .Include(e => e.FamilyMembers)
            .Include(e => e.EmergencyContacts)
            .Include(e => e.Assignments)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        // 2. อัปเดตข้อมูลทั่วไป
        var (gender, genderId) = ResolveGenderAndId(request.Gender, request.GenderId, request.Prefix);
        employee.Prefix = request.Prefix?.Trim();
        employee.FirstName = request.FirstName.Trim();
        employee.LastName = request.LastName.Trim();
        employee.BirthDate = request.BirthDate;
        employee.Gender = gender;
        employee.GenderId = genderId;
        employee.Nationality = request.Nationality;
        employee.NationalityId = request.NationalityId;
        employee.Religion = request.Religion;
        employee.ReligionId = request.ReligionId;
        employee.MaritalStatus = request.MaritalStatus;
        employee.MaritalStatusId = request.MaritalStatusId;
        employee.MilitaryStatus = request.MilitaryStatus;
        employee.IsTopLevel = request.IsTopLevel;
        employee.SpouseHasIncome = request.SpouseHasIncome;
        employee.NumberOfChildren = request.NumberOfChildren;
        employee.ParentDeductionCount = request.ParentDeductionCount;
        employee.DisabilityDeductionCount = request.DisabilityDeductionCount;
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

        // 5. ประกันสังคม
        if (!string.IsNullOrWhiteSpace(request.SocialSecurityNo))
        {
            if (employee.SocialSecurity == null)
            {
                employee.SocialSecurity = new EmployeeSocialSecurity { EmployeeId = employee.Id };
            }
            employee.SocialSecurity.SocialSecurityNoEncrypted = _cryptoService.Encrypt(request.SocialSecurityNo.Trim());
            employee.SocialSecurity.SocialSecurityNoMasked = _cryptoService.MaskCitizenId(request.SocialSecurityNo.Trim());
            employee.SocialSecurity.HospitalName = request.HospitalName?.Trim();
            employee.SocialSecurity.HospitalCode = request.HospitalCode?.Trim();
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

        // 7. ประวัติการศึกษา (Educations)
        if (!string.IsNullOrWhiteSpace(request.EducationLevel) || !string.IsNullOrWhiteSpace(request.Institution))
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
        if (!string.IsNullOrWhiteSpace(request.PositionName))
        {
            var currentAssignment = employee.Assignments.FirstOrDefault(a => a.IsCurrent);
            var pos = await _dbContext.Positions
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.PositionName.Trim().ToLower() == request.PositionName.Trim().ToLower() || p.PositionName.Contains(request.PositionName.Trim()), cancellationToken);

            if (pos == null)
            {
                var defaultDept = await _dbContext.Departments.FirstOrDefaultAsync(cancellationToken);
                pos = new Position
                {
                    DepartmentId = defaultDept?.Id ?? 1,
                    PositionCode = "POS_" + Guid.NewGuid().ToString("N")[..6].ToUpper(),
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
                    currentAssignment.WageType = request.EmployeeType.Contains("รายวัน") ? "DAILY" : "MONTHLY";
                }
            }
            else
            {
                employee.Assignments.Add(new EmployeeAssignment
                {
                    DivisionId = divId,
                    DepartmentId = deptId,
                    PositionId = pos.Id,
                    EffectiveFrom = DateOnly.FromDateTime(DateTime.Today),
                    IsCurrent = true,
                    WageType = request.EmployeeType?.Contains("รายวัน") == true ? "DAILY" : "MONTHLY"
                });
            }
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

        var employee = await _dbContext.Employees.FindAsync(new object[] { id }, cancellationToken);
        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        _dbContext.Employees.Remove(employee);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private EmployeeDto MapToDto(Employee e)
    {
        var (gender, genderId) = ResolveGenderAndId(e.Gender, e.GenderId, e.Prefix);
        var currentAssignment = e.Assignments?.FirstOrDefault(a => a.IsCurrent) ?? e.Assignments?.FirstOrDefault();

        return new EmployeeDto
        {
            Id = e.Id,
            EmployeeCode = e.EmployeeCode,
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
            PositionName = currentAssignment?.Position?.PositionName?.Trim(),
            DepartmentName = currentAssignment?.Department?.DepartmentName?.Trim(),
            DivisionName = currentAssignment?.Division?.DivisionName?.Trim(),
            EmployeeType = currentAssignment != null ? (currentAssignment.WageType == "DAILY" ? "พนักงานรายวัน" : "พนักงานประจำ") : null,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
            Contact = e.Contact != null ? new EmployeeContactDto
            {
                PersonalPhone = FormatPhoneNumber(e.Contact.PersonalPhone),
                PersonalEmail = e.Contact.PersonalEmail,
                OrganizationEmail = e.Contact.OrganizationEmail
            } : null,
            SocialSecurity = e.SocialSecurity != null ? new EmployeeSocialSecurityDto
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
            Educations = e.Educations.Select(ed => new EmployeeEducationDto
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
            }).ToList()
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
}

