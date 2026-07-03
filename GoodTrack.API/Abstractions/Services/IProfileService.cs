using System.Threading.Tasks;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Abstractions.Services;

public interface IProfileService
{
    Task<UserProfileDto> GetProfileAsync(string userId);
    Task<UserProfileDto> GetProfileByUsernameAsync(string username);
    Task UpdateProfileAsync(string userId, UserProfileDto dto);
    Task<PagedResultDto<UserProfileDto>> SearchManufacturersAsync(string? city, string? keyword, string? cursor, int limit, bool mustHaveGallery = false, bool mustHaveAvatar = false);
}
