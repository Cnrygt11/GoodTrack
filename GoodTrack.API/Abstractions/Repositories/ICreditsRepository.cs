using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

/// <summary>
/// Defines data access operations for user credit records.
/// </summary>
public interface ICreditsRepository
{
    /// <summary>
    /// Retrieves the credit record for a specific user.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>The UserCredit record if found; otherwise, null.</returns>
    Task<UserCredit?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves or updates the credit record.
    /// </summary>
    /// <param name="userCredit">The user credit record to save.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    Task SaveAsync(UserCredit userCredit, CancellationToken cancellationToken = default);
}
