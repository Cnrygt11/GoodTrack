using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IUserConnectionRepository
{
    Task<List<UserConnection>> GetConnectionsByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<bool> AreConnectedAsync(string sellerId, string manufacturerId, CancellationToken cancellationToken = default);
    Task SaveAsync(UserConnection connection, CancellationToken cancellationToken = default);
    Task DeleteAsync(string sellerId, string manufacturerId, CancellationToken cancellationToken = default);
}
