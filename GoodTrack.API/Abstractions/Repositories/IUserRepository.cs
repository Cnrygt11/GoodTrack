using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByEmailAsync(string email);
    Task<List<User>> GetManufacturersAsync();
    Task<(List<User> Items, string? NextCursor)> SearchManufacturersAsync(string? city, string? keyword, string? cursor, int limit);
    Task SaveAsync(User user);
}
