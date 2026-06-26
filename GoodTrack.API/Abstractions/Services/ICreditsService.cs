using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Services;

/// <summary>
/// Service interface managing subscription plans and user credits.
/// </summary>
public interface ICreditsService
{
    /// <summary>
    /// Retrieves or initializes a user's credit profile.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>The UserCredit record.</returns>
    Task<UserCredit> GetOrCreateCreditsAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deducts credits for a seller when submitting a production order.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    Task DeductForOrderAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Upgrades a user's subscription plan.
    /// </summary>
    /// <param name="userId">The ID of the user.</param>
    /// <param name="plan">The plan to upgrade to.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>The updated UserCredit record.</returns>
    Task<UserCredit> UpgradePlanAsync(string userId, string plan, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all available subscription plans.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>A list of SubscriptionPlanDetail.</returns>
    Task<List<SubscriptionPlanDetail>> GetPlansAsync(CancellationToken cancellationToken = default);
}
