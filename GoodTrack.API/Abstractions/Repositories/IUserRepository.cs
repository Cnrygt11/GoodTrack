using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<List<User>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken cancellationToken = default);
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<List<User>> GetManufacturersAsync(CancellationToken cancellationToken = default);
    Task<(List<User> Items, string? NextCursor)> SearchManufacturersAsync(string? city, string? keyword, string? cursor, int limit, bool mustHaveGallery = false, bool mustHaveAvatar = false, CancellationToken cancellationToken = default);
    Task SaveAsync(User user, CancellationToken cancellationToken = default);
    Task<List<User>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task DeleteUserAsync(string id, CancellationToken cancellationToken = default);
}
