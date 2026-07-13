using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<List<User>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken cancellationToken = default);
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Görünür üreticileri yalnız {Id, Username, Role} projeksiyonuyla döner — base64 avatar/galeri
    /// sütunları DB'den okunmaz (bağlantı/liste akışları bu üç alandan fazlasını kullanmaz).
    /// </summary>
    Task<List<UserDto>> GetManufacturerSummariesAsync(CancellationToken cancellationToken = default);
    /// <summary>
    /// Görünür üreticileri offset ile sayfalı arar. Sonuç DB projeksiyonuyla döner: ağır
    /// <c>ProductImages</c> galerisi çekilmez (yalnız <see cref="UserProfileDto.GalleryCount"/>),
    /// avatar thumbnail'e düşer. <paramref name="name"/> isim/kullanıcı-adı araması (kasa-duyarsız),
    /// <paramref name="sort"/> sıralama ("completeness" | "name" | "city"). Toplam eşleşme sayısı da döner.
    /// </summary>
    Task<(List<UserProfileDto> Items, int TotalCount)> SearchManufacturersAsync(string? city, string? keyword, string? name, string? sort, int page, int pageSize, bool mustHaveGallery = false, bool mustHaveAvatar = false, CancellationToken cancellationToken = default);
    Task SaveAsync(User user, CancellationToken cancellationToken = default);
    Task<List<User>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task DeleteUserAsync(string id, CancellationToken cancellationToken = default);
}
