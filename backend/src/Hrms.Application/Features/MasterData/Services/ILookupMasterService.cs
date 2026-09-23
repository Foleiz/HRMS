using Hrms.Application.Features.MasterData.DTOs;

namespace Hrms.Application.Features.MasterData.Services;

public interface ILookupMasterService
{
    // Nationalities
    Task<List<NationalityDto>> GetAllNationalitiesAsync(CancellationToken cancellationToken = default);
    Task<NationalityDto> GetNationalityByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<NationalityDto> CreateNationalityAsync(CreateNationalityDto dto, CancellationToken cancellationToken = default);
    Task<NationalityDto> UpdateNationalityAsync(long id, UpdateNationalityDto dto, CancellationToken cancellationToken = default);
    Task DeleteNationalityAsync(long id, CancellationToken cancellationToken = default);

    // Religions
    Task<List<ReligionDto>> GetAllReligionsAsync(CancellationToken cancellationToken = default);
    Task<ReligionDto> GetReligionByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<ReligionDto> CreateReligionAsync(CreateReligionDto dto, CancellationToken cancellationToken = default);
    Task<ReligionDto> UpdateReligionAsync(long id, UpdateReligionDto dto, CancellationToken cancellationToken = default);
    Task DeleteReligionAsync(long id, CancellationToken cancellationToken = default);

    // MaritalStatusTypes
    Task<List<MaritalStatusTypeDto>> GetAllMaritalStatusesAsync(CancellationToken cancellationToken = default);
    Task<MaritalStatusTypeDto> GetMaritalStatusByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<MaritalStatusTypeDto> CreateMaritalStatusAsync(CreateMaritalStatusTypeDto dto, CancellationToken cancellationToken = default);
    Task<MaritalStatusTypeDto> UpdateMaritalStatusAsync(long id, UpdateMaritalStatusTypeDto dto, CancellationToken cancellationToken = default);
    Task DeleteMaritalStatusAsync(long id, CancellationToken cancellationToken = default);
}
