using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

/// <summary>
/// Service สำหรับจัดการ Master Data ธนาคาร (Reference Feature ตัวอย่างสำหรับทั้งทีม)
/// </summary>
public class BankService : IBankService
{
    private readonly IHrmsDbContext _context;

    public BankService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<BankDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Banks
            .AsNoTracking()
            .OrderBy(b => b.BankCode)
            .Select(b => new BankDto
            {
                Id = b.Id,
                BankCode = b.BankCode,
                BankName = b.BankName,
                ShortName = b.ShortName,
                AccountDigits = b.AccountDigits,
                Status = b.Status
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<BankDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var bank = await _context.Banks
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (bank == null)
            throw new NotFoundException("ธนาคาร", id);

        return new BankDto
        {
            Id = bank.Id,
            BankCode = bank.BankCode,
            BankName = bank.BankName,
            ShortName = bank.ShortName,
            AccountDigits = bank.AccountDigits,
            Status = bank.Status
        };
    }

    public async Task<BankDto> CreateAsync(CreateBankDto dto, CancellationToken cancellationToken = default)
    {
        // ตรวจสอบรหัสธนาคารซ้ำ
        var exists = await _context.Banks
            .AnyAsync(b => b.BankCode.ToLower() == dto.BankCode.Trim().ToLower(), cancellationToken);

        if (exists)
            throw new BusinessRuleException($"รหัสธนาคาร '{dto.BankCode}' มีอยู่ในระบบแล้ว");
        ValidateDigits(dto.AccountDigits);

        var bank = new Bank
        {
            BankCode = dto.BankCode.Trim().ToUpper(),
            BankName = dto.BankName.Trim(),
            ShortName = string.IsNullOrWhiteSpace(dto.ShortName) ? null : dto.ShortName.Trim().ToUpper(),
            AccountDigits = dto.AccountDigits,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "ACTIVE" : dto.Status.ToUpper()
        };

        _context.Banks.Add(bank);
        await _context.SaveChangesAsync(cancellationToken);

        return new BankDto
        {
            Id = bank.Id,
            BankCode = bank.BankCode,
            BankName = bank.BankName,
            ShortName = bank.ShortName,
            AccountDigits = bank.AccountDigits,
            Status = bank.Status
        };
    }

    public async Task<BankDto> UpdateAsync(long id, UpdateBankDto dto, CancellationToken cancellationToken = default)
    {
        var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (bank == null)
            throw new NotFoundException("ธนาคาร", id);

        ValidateDigits(dto.AccountDigits);
        bank.BankName = dto.BankName.Trim();
        bank.ShortName = string.IsNullOrWhiteSpace(dto.ShortName) ? null : dto.ShortName.Trim().ToUpper();
        bank.AccountDigits = dto.AccountDigits;
        bank.Status = string.IsNullOrWhiteSpace(dto.Status) ? bank.Status : dto.Status.ToUpper();

        await _context.SaveChangesAsync(cancellationToken);

        return new BankDto
        {
            Id = bank.Id,
            BankCode = bank.BankCode,
            BankName = bank.BankName,
            ShortName = bank.ShortName,
            AccountDigits = bank.AccountDigits,
            Status = bank.Status
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (bank == null)
            throw new NotFoundException("ธนาคาร", id);

        var inUse = await _context.EmployeeBankAccounts.AnyAsync(a => a.BankId == id, cancellationToken)
                    || await _context.CompanyBankAccounts.AnyAsync(a => a.BankId == id, cancellationToken);
        if (inUse)
            throw new BusinessRuleException("ไม่สามารถลบธนาคารนี้ได้ เนื่องจากมีบัญชีพนักงานหรือบัญชีบริษัทใช้อยู่ (ปิดการใช้งานแทนได้)");

        _context.Banks.Remove(bank);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateDigits(int? digits)
    {
        if (digits.HasValue && (digits.Value < 6 || digits.Value > 20))
            throw new BusinessRuleException("จำนวนหลักเลขบัญชีต้องอยู่ระหว่าง 6 ถึง 20 หลัก");
    }
}
