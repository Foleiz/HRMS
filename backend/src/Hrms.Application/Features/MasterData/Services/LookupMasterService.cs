using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

public class LookupMasterService : ILookupMasterService
{
    private readonly IHrmsDbContext _context;

    public LookupMasterService(IHrmsDbContext context)
    {
        _context = context;
    }

    // --- Nationalities ---
    public async Task<List<NationalityDto>> GetAllNationalitiesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Nationalities
            .AsNoTracking()
            .OrderBy(n => n.Id)
            .Select(n => new NationalityDto
            {
                Id = n.Id,
                NationalityName = n.NationalityName
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<NationalityDto> GetNationalityByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.Nationalities.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("สัญชาติ", id);
        return new NationalityDto { Id = item.Id, NationalityName = item.NationalityName };
    }

    public async Task<NationalityDto> CreateNationalityAsync(CreateNationalityDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.NationalityName.Trim();
        var exists = await _context.Nationalities.AnyAsync(n => n.NationalityName.ToLower() == name.ToLower(), cancellationToken);
        if (exists) throw new BusinessRuleException($"สัญชาติ '{name}' มีอยู่ในระบบแล้ว");

        var item = new Nationality { NationalityName = name };
        _context.Nationalities.Add(item);
        await _context.SaveChangesAsync(cancellationToken);

        return new NationalityDto { Id = item.Id, NationalityName = item.NationalityName };
    }

    public async Task<NationalityDto> UpdateNationalityAsync(long id, UpdateNationalityDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _context.Nationalities.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("สัญชาติ", id);

        item.NationalityName = dto.NationalityName.Trim();
        await _context.SaveChangesAsync(cancellationToken);

        return new NationalityDto { Id = item.Id, NationalityName = item.NationalityName };
    }

    public async Task DeleteNationalityAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.Nationalities.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("สัญชาติ", id);

        _context.Nationalities.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // --- Religions ---
    public async Task<List<ReligionDto>> GetAllReligionsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Religions
            .AsNoTracking()
            .OrderBy(r => r.Id)
            .Select(r => new ReligionDto
            {
                Id = r.Id,
                ReligionName = r.ReligionName
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<ReligionDto> GetReligionByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.Religions.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("ศาสนา", id);
        return new ReligionDto { Id = item.Id, ReligionName = item.ReligionName };
    }

    public async Task<ReligionDto> CreateReligionAsync(CreateReligionDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.ReligionName.Trim();
        var exists = await _context.Religions.AnyAsync(r => r.ReligionName.ToLower() == name.ToLower(), cancellationToken);
        if (exists) throw new BusinessRuleException($"ศาสนา '{name}' มีอยู่ในระบบแล้ว");

        var item = new Religion { ReligionName = name };
        _context.Religions.Add(item);
        await _context.SaveChangesAsync(cancellationToken);

        return new ReligionDto { Id = item.Id, ReligionName = item.ReligionName };
    }

    public async Task<ReligionDto> UpdateReligionAsync(long id, UpdateReligionDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _context.Religions.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("ศาสนา", id);

        item.ReligionName = dto.ReligionName.Trim();
        await _context.SaveChangesAsync(cancellationToken);

        return new ReligionDto { Id = item.Id, ReligionName = item.ReligionName };
    }

    public async Task DeleteReligionAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.Religions.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("ศาสนา", id);

        _context.Religions.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // --- MaritalStatusTypes ---
    public async Task<List<MaritalStatusTypeDto>> GetAllMaritalStatusesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.MaritalStatusTypes
            .AsNoTracking()
            .OrderBy(m => m.Id)
            .Select(m => new MaritalStatusTypeDto
            {
                Id = m.Id,
                MaritalStatusName = m.MaritalStatusName
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<MaritalStatusTypeDto> GetMaritalStatusByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.MaritalStatusTypes.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("สถานภาพสมรส", id);
        return new MaritalStatusTypeDto { Id = item.Id, MaritalStatusName = item.MaritalStatusName };
    }

    public async Task<MaritalStatusTypeDto> CreateMaritalStatusAsync(CreateMaritalStatusTypeDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.MaritalStatusName.Trim();
        var exists = await _context.MaritalStatusTypes.AnyAsync(m => m.MaritalStatusName.ToLower() == name.ToLower(), cancellationToken);
        if (exists) throw new BusinessRuleException($"สถานภาพสมรส '{name}' มีอยู่ในระบบแล้ว");

        var item = new MaritalStatusType { MaritalStatusName = name };
        _context.MaritalStatusTypes.Add(item);
        await _context.SaveChangesAsync(cancellationToken);

        return new MaritalStatusTypeDto { Id = item.Id, MaritalStatusName = item.MaritalStatusName };
    }

    public async Task<MaritalStatusTypeDto> UpdateMaritalStatusAsync(long id, UpdateMaritalStatusTypeDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _context.MaritalStatusTypes.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("สถานภาพสมรส", id);

        item.MaritalStatusName = dto.MaritalStatusName.Trim();
        await _context.SaveChangesAsync(cancellationToken);

        return new MaritalStatusTypeDto { Id = item.Id, MaritalStatusName = item.MaritalStatusName };
    }

    public async Task DeleteMaritalStatusAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.MaritalStatusTypes.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("สถานภาพสมรส", id);

        _context.MaritalStatusTypes.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
