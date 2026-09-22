using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Organization.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Organization.Services;

public class CompanyBankAccountService : ICompanyBankAccountService
{
    private readonly IHrmsDbContext _context;

    public CompanyBankAccountService(IHrmsDbContext context)
    {
        _context = context;
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

        return accounts.Select(MapToDto).ToList();
    }

    public async Task<CompanyBankAccountDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var account = await _context.CompanyBankAccounts
            .Include(a => a.Bank)
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (account == null)
            throw new NotFoundException("บัญชีธนาคารบริษัท", id);

        return MapToDto(account);
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
        var bankExists = await _context.Banks.AnyAsync(b => b.Id == dto.BankId, cancellationToken);
        if (!bankExists)
            throw new NotFoundException("ธนาคาร", dto.BankId);

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
            // หากยังไม่มีบัญชีใดเลยในบริษัท ให้บัญชีนี้เป็นบัญชีหลักโดยอัตโนมัติ
            var anyAccounts = await _context.CompanyBankAccounts.AnyAsync(a => a.CompanyId == companyId, cancellationToken);
            if (!anyAccounts)
            {
                dto.IsPrimaryPayrollAccount = true;
            }
        }

        var entity = new CompanyBankAccount
        {
            CompanyId = companyId,
            BankId = dto.BankId,
            AccountNumber = dto.AccountNumber.Trim(),
            AccountName = dto.AccountName?.Trim(),
            IsPrimaryPayrollAccount = dto.IsPrimaryPayrollAccount,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "ACTIVE" : dto.Status.ToUpper()
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

        var bankExists = await _context.Banks.AnyAsync(b => b.Id == dto.BankId, cancellationToken);
        if (!bankExists)
            throw new NotFoundException("ธนาคาร", dto.BankId);

        if (dto.CompanyId.HasValue && dto.CompanyId.Value > 0)
        {
            entity.CompanyId = dto.CompanyId.Value;
        }

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

        entity.BankId = dto.BankId;
        entity.AccountNumber = dto.AccountNumber.Trim();
        entity.AccountName = dto.AccountName?.Trim();
        entity.IsPrimaryPayrollAccount = dto.IsPrimaryPayrollAccount;
        entity.Status = string.IsNullOrWhiteSpace(dto.Status) ? "ACTIVE" : dto.Status.ToUpper();

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

        _context.CompanyBankAccounts.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static CompanyBankAccountDto MapToDto(CompanyBankAccount account)
    {
        return new CompanyBankAccountDto
        {
            Id = account.Id,
            CompanyId = account.CompanyId,
            CompanyName = account.Company?.CompanyName,
            BankId = account.BankId,
            BankCode = account.Bank?.BankCode ?? string.Empty,
            BankName = account.Bank?.BankName ?? string.Empty,
            AccountNumber = account.AccountNumber,
            AccountName = account.AccountName,
            IsPrimaryPayrollAccount = account.IsPrimaryPayrollAccount,
            Status = account.Status
        };
    }
}
