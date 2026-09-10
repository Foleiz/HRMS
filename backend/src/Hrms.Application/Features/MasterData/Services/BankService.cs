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

        var bank = new Bank
        {
            BankCode = dto.BankCode.Trim().ToUpper(),
            BankName = dto.BankName.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "ACTIVE" : dto.Status.ToUpper()
        };

        _context.Banks.Add(bank);
        await _context.SaveChangesAsync(cancellationToken);

        return new BankDto
        {
            Id = bank.Id,
            BankCode = bank.BankCode,
            BankName = bank.BankName,
            Status = bank.Status
        };
    }

    public async Task<BankDto> UpdateAsync(long id, UpdateBankDto dto, CancellationToken cancellationToken = default)
    {
        var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (bank == null)
            throw new NotFoundException("ธนาคาร", id);

        bank.BankName = dto.BankName.Trim();
        bank.Status = string.IsNullOrWhiteSpace(dto.Status) ? bank.Status : dto.Status.ToUpper();

        await _context.SaveChangesAsync(cancellationToken);

        return new BankDto
        {
            Id = bank.Id,
            BankCode = bank.BankCode,
            BankName = bank.BankName,
            Status = bank.Status
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var bank = await _context.Banks.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (bank == null)
            throw new NotFoundException("ธนาคาร", id);

        _context.Banks.Remove(bank);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
