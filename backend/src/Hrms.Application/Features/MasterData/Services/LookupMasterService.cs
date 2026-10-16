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

    // --- GenderTypes ---
    public async Task<List<GenderTypeDto>> GetAllGendersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.GenderTypes
            .AsNoTracking()
            .OrderBy(g => g.Id)
            .Select(g => new GenderTypeDto { Id = g.Id, GenderCode = g.GenderCode, GenderName = g.GenderName })
            .ToListAsync(cancellationToken);
    }

    public async Task<GenderTypeDto> CreateGenderAsync(CreateGenderTypeDto dto, CancellationToken cancellationToken = default)
    {
        var code = (dto.GenderCode ?? string.Empty).Trim().ToUpperInvariant();
        var name = (dto.GenderName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(code)) throw new BusinessRuleException("กรุณาระบุรหัสเพศ");
        if (string.IsNullOrEmpty(name)) throw new BusinessRuleException("กรุณาระบุชื่อเพศ");
        if (code.Length > 20) throw new BusinessRuleException("รหัสเพศยาวได้ไม่เกิน 20 ตัวอักษร");
        if (await _context.GenderTypes.AnyAsync(g => g.GenderCode.ToUpper() == code, cancellationToken))
            throw new BusinessRuleException($"รหัสเพศ '{code}' มีอยู่ในระบบแล้ว");
        if (await _context.GenderTypes.AnyAsync(g => g.GenderName.ToLower() == name.ToLower(), cancellationToken))
            throw new BusinessRuleException($"เพศ '{name}' มีอยู่ในระบบแล้ว");

        var item = new GenderType { GenderCode = code, GenderName = name };
        _context.GenderTypes.Add(item);
        await _context.SaveChangesAsync(cancellationToken);
        return new GenderTypeDto { Id = item.Id, GenderCode = item.GenderCode, GenderName = item.GenderName };
    }

    public async Task<GenderTypeDto> UpdateGenderAsync(long id, UpdateGenderTypeDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _context.GenderTypes.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("เพศ", id);
        var name = (dto.GenderName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name)) throw new BusinessRuleException("กรุณาระบุชื่อเพศ");
        if (await _context.GenderTypes.AnyAsync(g => g.Id != id && g.GenderName.ToLower() == name.ToLower(), cancellationToken))
            throw new BusinessRuleException($"เพศ '{name}' มีอยู่ในระบบแล้ว");

        item.GenderName = name;
        await _context.SaveChangesAsync(cancellationToken);
        return new GenderTypeDto { Id = item.Id, GenderCode = item.GenderCode, GenderName = item.GenderName };
    }

    public async Task DeleteGenderAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.GenderTypes.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("เพศ", id);
        if (await _context.Employees.AnyAsync(e => e.GenderId == id, cancellationToken))
            throw new BusinessRuleException($"ลบไม่ได้ — มีพนักงานที่ใช้เพศ '{item.GenderName}' อยู่");

        _context.GenderTypes.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // --- CertificateTypes ---
    public async Task<List<CertificateTypeMasterDto>> GetAllCertificateTypesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.CertificateTypes
            .AsNoTracking()
            .OrderBy(c => c.Id)
            .Select(c => new CertificateTypeMasterDto { Id = c.Id, CertificateCode = c.CertificateCode, CertificateName = c.CertificateName })
            .ToListAsync(cancellationToken);
    }

    public async Task<CertificateTypeMasterDto> CreateCertificateTypeAsync(CreateCertificateTypeMasterDto dto, CancellationToken cancellationToken = default)
    {
        var code = (dto.CertificateCode ?? string.Empty).Trim().ToUpperInvariant();
        var name = (dto.CertificateName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(code)) throw new BusinessRuleException("กรุณาระบุรหัสประเภทหนังสือรับรอง");
        if (string.IsNullOrEmpty(name)) throw new BusinessRuleException("กรุณาระบุชื่อประเภทหนังสือรับรอง");
        if (code.Length > 50) throw new BusinessRuleException("รหัสยาวได้ไม่เกิน 50 ตัวอักษร");
        if (await _context.CertificateTypes.AnyAsync(c => c.CertificateCode.ToUpper() == code, cancellationToken))
            throw new BusinessRuleException($"รหัส '{code}' มีอยู่ในระบบแล้ว");
        if (await _context.CertificateTypes.AnyAsync(c => c.CertificateName.ToLower() == name.ToLower(), cancellationToken))
            throw new BusinessRuleException($"ประเภทหนังสือรับรอง '{name}' มีอยู่ในระบบแล้ว");

        var item = new CertificateType { CertificateCode = code, CertificateName = name };
        _context.CertificateTypes.Add(item);
        await _context.SaveChangesAsync(cancellationToken);
        return new CertificateTypeMasterDto { Id = item.Id, CertificateCode = item.CertificateCode, CertificateName = item.CertificateName };
    }

    public async Task<CertificateTypeMasterDto> UpdateCertificateTypeAsync(long id, UpdateCertificateTypeMasterDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _context.CertificateTypes.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("ประเภทหนังสือรับรอง", id);
        var name = (dto.CertificateName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name)) throw new BusinessRuleException("กรุณาระบุชื่อประเภทหนังสือรับรอง");
        if (await _context.CertificateTypes.AnyAsync(c => c.Id != id && c.CertificateName.ToLower() == name.ToLower(), cancellationToken))
            throw new BusinessRuleException($"ประเภทหนังสือรับรอง '{name}' มีอยู่ในระบบแล้ว");

        // รหัสแก้ไม่ได้ — ระบบใช้รหัส (เช่น CERT_SALARY) ตัดสินว่าจะแสดงเงินเดือนในเอกสารหรือไม่
        item.CertificateName = name;
        await _context.SaveChangesAsync(cancellationToken);
        return new CertificateTypeMasterDto { Id = item.Id, CertificateCode = item.CertificateCode, CertificateName = item.CertificateName };
    }

    public async Task DeleteCertificateTypeAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.CertificateTypes.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (item == null) throw new NotFoundException("ประเภทหนังสือรับรอง", id);
        if (await _context.CertificateRequests.AnyAsync(r => r.CertificateTypeId == id, cancellationToken))
            throw new BusinessRuleException($"ลบไม่ได้ — มีคำขอหนังสือรับรอง '{item.CertificateName}' อยู่ในระบบ");

        _context.CertificateTypes.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
