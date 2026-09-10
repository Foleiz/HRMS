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
            .Include(e => e.BankAccounts)
                .ThenInclude(b => b.Bank)
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
            throw new ForbiddenException("คุณไม่มีสิทธิ์เพิ่มข้อมูลพนักงาน");
        }

        // 2. ตรวจสอบรหัสพนักงานซ้ำ
        bool codeExists = await _dbContext.Employees
            .AnyAsync(e => e.EmployeeCode.ToLower() == request.EmployeeCode.Trim().ToLower(), cancellationToken);
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

        var employee = new Employee
        {
            EmployeeCode = request.EmployeeCode.Trim(),
            Prefix = request.Prefix?.Trim(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            CitizenIdEncrypted = encryptedCitizenId,
            CitizenIdMasked = maskedCitizenId,
            BirthDate = request.BirthDate,
            Gender = request.Gender,
            GenderId = request.GenderId,
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
                PersonalPhone = request.PersonalPhone?.Trim(),
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
                    AddressType = addr.AddressType,
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
                    AccountType = acc.AccountType,
                    AccountName = acc.AccountName,
                    IsPrimary = acc.IsPrimary,
                    Status = acc.Status
                });
            }
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
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", id);
        }

        // 2. อัปเดตข้อมูลทั่วไป
        employee.Prefix = request.Prefix?.Trim();
        employee.FirstName = request.FirstName.Trim();
        employee.LastName = request.LastName.Trim();
        employee.BirthDate = request.BirthDate;
        employee.Gender = request.Gender;
        employee.GenderId = request.GenderId;
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

        // 3. เข้ารหัส Citizen ID ใหม่ถ้ามีการระบุ
        if (!string.IsNullOrWhiteSpace(request.CitizenId))
        {
            employee.CitizenIdEncrypted = _cryptoService.Encrypt(request.CitizenId.Trim());
            employee.CitizenIdMasked = _cryptoService.MaskCitizenId(request.CitizenId.Trim());
        }

        // 4. ข้อมูลติดต่อ
        if (employee.Contact == null)
        {
            employee.Contact = new EmployeeContact { EmployeeId = employee.Id };
        }
        employee.Contact.PersonalPhone = request.PersonalPhone?.Trim();
        employee.Contact.PersonalEmail = request.PersonalEmail?.Trim();
        employee.Contact.OrganizationEmail = request.OrganizationEmail?.Trim();

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

    private static EmployeeDto MapToDto(Employee e)
    {
        return new EmployeeDto
        {
            Id = e.Id,
            EmployeeCode = e.EmployeeCode,
            Prefix = e.Prefix,
            FirstName = e.FirstName,
            LastName = e.LastName,
            FullName = e.FullName,
            CitizenIdMasked = e.CitizenIdMasked,
            BirthDate = e.BirthDate,
            Gender = e.Gender,
            GenderId = e.GenderId,
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
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
            Contact = e.Contact != null ? new EmployeeContactDto
            {
                PersonalPhone = e.Contact.PersonalPhone,
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
            }).ToList()
        };
    }
}
