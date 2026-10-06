using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Organization.Dtos;
using Hrms.Application.Features.Payroll;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Organization.Services;

public class CompanyBankAccountService : ICompanyBankAccountService
{
    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAesEncryptionService _crypto;

    public CompanyBankAccountService(IHrmsDbContext context, ICurrentUserService currentUser, IAesEncryptionService crypto)
    {
        _context = context;
        _currentUser = currentUser;
        _crypto = crypto;
    }

    /// <summary>เลขบัญชีบริษัทเต็มเห็นได้เฉพาะ ADMIN / ฝ่ายการเงิน — คนอื่นเห็นแบบ xxxxxx1234</summary>
    private bool CanSeeFullAccount() =>
        _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER") || PayrollAccess.IsFinance(_currentUser);

    private static string NormalizeStatus(string? status)
    {
        var s = string.IsNullOrWhiteSpace(status) ? "ACTIVE" : status.Trim().ToUpperInvariant();
        if (s != "ACTIVE" && s != "INACTIVE")
            throw new BusinessRuleException("สถานะบัญชีต้องเป็น ACTIVE หรือ INACTIVE");
        return s;
    }

    public async Task<List<CompanyBankAccountDto>> GetAllAsync(long? companyId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.CompanyBankAccounts
            .Include(a => a.Bank)
            .Include(a => a.Company)
            .AsNoTracking();

        if (companyId.HasValue && companyId.Value > 0)
        {
            query = query.Where(a => a.CompanyId == companyId.Value);
        }

        var accounts = await query
            .OrderByDescending(a => a.IsPrimaryPayrollAccount)
            .ThenBy(a => a.Id)
            .ToListAsync(cancellationToken);

        var full = CanSeeFullAccount();
        return accounts.Select(a => MapToDto(a, full)).ToList();
    }

    public async Task<CompanyBankAccountDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var account = await _context.CompanyBankAccounts
            .Include(a => a.Bank)
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (account == null)
            throw new NotFoundException("บัญชีธนาคารบริษัท", id);

        return MapToDto(account, CanSeeFullAccount());
    }

    public async Task<CompanyBankAccountDto> CreateAsync(CreateCompanyBankAccountDto dto, CancellationToken cancellationToken = default)
    {
        // กำหนด Company ID หากไม่ได้ระบุ ให้ใช้บริษัทแรกในระบบ
        long companyId = dto.CompanyId ?? 0;
        if (companyId <= 0)
        {
            var firstCompany = await _context.Companies.Select(c => c.Id).FirstOrDefaultAsync(cancellationToken);
            if (firstCompany <= 0)
                throw new BusinessRuleException("ไม่พบข้อมูลบริษัทในระบบ กรุณาสร้างข้อมูลบริษัทก่อน");
            companyId = firstCompany;
        }

        // ตรวจสอบว่ามีธนาคารนี้อยู่จริง
        var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == dto.BankId, cancellationToken);
        var bankExists = bank != null;
        if (!bankExists)
            throw new NotFoundException("ธนาคาร", dto.BankId);

        var status = NormalizeStatus(dto.Status);
        if (dto.IsPrimaryPayrollAccount && status != "ACTIVE")
            throw new BusinessRuleException("บัญชีหลักจ่ายเงินเดือนต้องเป็นสถานะเปิดใช้งาน");

        // หากกำหนดเป็นบัญชีจ่ายเงินเดือนหลัก ให้รีเซ็ตบัญชีอื่นของบริษัทนี้
        if (dto.IsPrimaryPayrollAccount)
        {
            var existingPrimaries = await _context.CompanyBankAccounts
                .Where(a => a.CompanyId == companyId && a.IsPrimaryPayrollAccount)
                .ToListAsync(cancellationToken);

            foreach (var p in existingPrimaries)
            {
                p.IsPrimaryPayrollAccount = false;
            }
        }
        else
        {
            // หากยังไม่มีบัญชีหลักที่ใช้งานอยู่ ให้บัญชีนี้ (ถ้าเปิดใช้งาน) เป็นบัญชีหลักโดยอัตโนมัติ
            var hasActivePrimary = await _context.CompanyBankAccounts.AnyAsync(
                a => a.CompanyId == companyId && a.IsPrimaryPayrollAccount && a.Status == "ACTIVE", cancellationToken);
            if (!hasActivePrimary && status == "ACTIVE")
            {
                dto.IsPrimaryPayrollAccount = true;
            }
        }

        var entity = new CompanyBankAccount
        {
            CompanyId = companyId,
            BankId = dto.BankId,
            AccountNumber = NormalizeAccountNumber(dto.AccountNumber, bank!),
            AccountName = dto.AccountName?.Trim(),
            IsPrimaryPayrollAccount = dto.IsPrimaryPayrollAccount,
            Status = status
        };

        _context.CompanyBankAccounts.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        // Reload with navigation properties
        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<CompanyBankAccountDto> UpdateAsync(long id, UpdateCompanyBankAccountDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _context.CompanyBankAccounts
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (entity == null)
            throw new NotFoundException("บัญชีธนาคารบริษัท", id);

        var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == dto.BankId, cancellationToken);
        var bankExists = bank != null;
        if (!bankExists)
            throw new NotFoundException("ธนาคาร", dto.BankId);

        var status = NormalizeStatus(dto.Status);

        // บัญชีหลักต้องมีอยู่เสมอ: ห้ามปลดบัญชีหลัก/ปิดใช้งานบัญชีหลักตรง ๆ — ให้ตั้งบัญชีอื่นเป็นบัญชีหลักก่อน
        if (entity.IsPrimaryPayrollAccount && (!dto.IsPrimaryPayrollAccount || status != "ACTIVE"))
            throw new BusinessRuleException("บัญชีนี้เป็นบัญชีหลักจ่ายเงินเดือน — กรุณาตั้งบัญชีอื่นเป็นบัญชีหลักก่อน จึงจะยกเลิกหรือปิดใช้งานบัญชีนี้ได้");
        if (dto.IsPrimaryPayrollAccount && status != "ACTIVE")
            throw new BusinessRuleException("บัญชีหลักจ่ายเงินเดือนต้องเป็นสถานะเปิดใช้งาน");

        // หากมีการตั้งเป็นบัญชีหลัก ให้ปลดบัญชีอื่นของบริษัทนี้
        if (dto.IsPrimaryPayrollAccount && !entity.IsPrimaryPayrollAccount)
        {
            var existingPrimaries = await _context.CompanyBankAccounts
                .Where(a => a.CompanyId == entity.CompanyId && a.Id != id && a.IsPrimaryPayrollAccount)
                .ToListAsync(cancellationToken);

            foreach (var p in existingPrimaries)
            {
                p.IsPrimaryPayrollAccount = false;
            }
        }

        // ผู้ที่เห็นเลขแบบปิดบางส่วน (xxxxxx1234) แล้วกดบันทึกโดยไม่ได้แก้เลข → คงเลขเดิมไว้
        var isMaskedInput = (dto.AccountNumber ?? string.Empty).Contains('x', StringComparison.OrdinalIgnoreCase);
        if (isMaskedInput)
        {
            if (entity.BankId != dto.BankId)
                throw new BusinessRuleException("เปลี่ยนธนาคารต้องกรอกเลขบัญชีใหม่ทั้งหมด");
        }
        else
        {
            entity.AccountNumber = NormalizeAccountNumber(dto.AccountNumber ?? string.Empty, bank!);
        }

        entity.BankId = dto.BankId;
        entity.AccountName = dto.AccountName?.Trim();
        entity.IsPrimaryPayrollAccount = dto.IsPrimaryPayrollAccount;
        entity.Status = status;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<CompanyBankAccountDto> SetPrimaryAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.CompanyBankAccounts
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (entity == null)
            throw new NotFoundException("บัญชีธนาคารบริษัท", id);

        // ปลดบัญชีหลักเดิมของบริษัทนี้ทั้งหมด
        var otherAccounts = await _context.CompanyBankAccounts
            .Where(a => a.CompanyId == entity.CompanyId && a.Id != id && a.IsPrimaryPayrollAccount)
            .ToListAsync(cancellationToken);

        foreach (var acc in otherAccounts)
        {
            acc.IsPrimaryPayrollAccount = false;
        }

        entity.IsPrimaryPayrollAccount = true;
        entity.Status = "ACTIVE"; // บัญชีหลักต้อง ACTIVE เสมอ

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.CompanyBankAccounts
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (entity == null)
            throw new NotFoundException("บัญชีธนาคารบริษัท", id);

        if (entity.IsPrimaryPayrollAccount)
            throw new BusinessRuleException("ไม่สามารถปิดใช้งานบัญชีหลักจ่ายเงินเดือนได้ — กรุณาตั้งบัญชีอื่นเป็นบัญชีหลักก่อน");

        // ไม่ลบจริง: ปิดใช้งานแทน เพื่อเก็บประวัติ (การเปลี่ยนแปลงถูกบันทึกใน Audit Log อัตโนมัติ)
        entity.Status = "INACTIVE";
        await _context.SaveChangesAsync(cancellationToken);
    }

    private CompanyBankAccountDto MapToDto(CompanyBankAccount account, bool fullAccountNumber)
    {
        return new CompanyBankAccountDto
        {
            Id = account.Id,
            CompanyId = account.CompanyId,
            CompanyName = account.Company?.CompanyName,
            BankId = account.BankId,
            BankCode = account.Bank?.BankCode ?? string.Empty,
            BankName = account.Bank?.BankName ?? string.Empty,
            AccountNumber = fullAccountNumber ? account.AccountNumber : _crypto.MaskAccountNumber(account.AccountNumber),
            IsAccountNumberMasked = !fullAccountNumber,
            AccountName = account.AccountName,
            IsPrimaryPayrollAccount = account.IsPrimaryPayrollAccount,
            Status = account.Status
        };
    }

    /// <summary>เลขบัญชีเก็บเป็นตัวเลขล้วน และต้องมีจำนวนหลักตามที่ตั้งไว้ในข้อมูลหลักธนาคาร</summary>
    private static string NormalizeAccountNumber(string raw, Domain.Entities.Bank bank)
    {
        var digits = new string((raw ?? string.Empty).Where(char.IsDigit).ToArray());
        if (digits.Length == 0)
            throw new BusinessRuleException("กรุณาระบุเลขที่บัญชี");
        if (bank.AccountDigits.HasValue && digits.Length != bank.AccountDigits.Value)
            throw new BusinessRuleException($"เลขบัญชี{bank.BankName}ต้องมี {bank.AccountDigits.Value} หลัก (กรอกมา {digits.Length} หลัก)");
        return digits;
    }
}
