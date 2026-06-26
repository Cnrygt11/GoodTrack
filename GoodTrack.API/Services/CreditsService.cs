using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

/// <summary>
/// Service managing user credits and subscription plan actions.
/// </summary>
public class CreditsService : ICreditsService
{
    private readonly ICreditsRepository _creditsRepository;

    /// <summary>
    /// Initializes a new instance of the <see cref="CreditsService"/> class.
    /// </summary>
    /// <param name="creditsRepository">The credits data repository.</param>
    public CreditsService(ICreditsRepository creditsRepository)
    {
        _creditsRepository = creditsRepository;
    }

    /// <inheritdoc />
    public async Task<UserCredit> GetOrCreateCreditsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var record = await _creditsRepository.GetByUserIdAsync(userId, cancellationToken);
        if (record != null)
        {
            return record;
        }

        // Lazy initialize with Free plan details (5 credits default)
        record = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Free,
            Credits = 5,
            PlanStartedAt = DateTime.UtcNow.ToString("o"),
            RenewsAt = DateTime.UtcNow.AddMonths(1).ToString("o")
        };

        await _creditsRepository.SaveAsync(record, cancellationToken);
        return record;
    }

    /// <inheritdoc />
    public async Task DeductForOrderAsync(string userId, CancellationToken cancellationToken = default)
    {
        var record = await GetOrCreateCreditsAsync(userId, cancellationToken);

        if (record.Credits < CreditCost.OrderCreation)
        {
            throw new InsufficientCreditsException("Krediniz yetersiz! Lütfen sipariş oluşturabilmek için planınızı yükseltin.");
        }

        record.Credits -= CreditCost.OrderCreation;
        await _creditsRepository.SaveAsync(record, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<UserCredit> UpgradePlanAsync(string userId, string plan, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(plan))
        {
            throw new ArgumentException("Plan seçimi boş olamaz!");
        }

        var record = await GetOrCreateCreditsAsync(userId, cancellationToken);

        int newCredits;
        if (plan.Equals(SubscriptionPlan.Free, StringComparison.OrdinalIgnoreCase))
        {
            newCredits = 5;
            record.Plan = SubscriptionPlan.Free;
        }
        else if (plan.Equals(SubscriptionPlan.Pro, StringComparison.OrdinalIgnoreCase))
        {
            newCredits = 100;
            record.Plan = SubscriptionPlan.Pro;
        }
        else if (plan.Equals(SubscriptionPlan.Enterprise, StringComparison.OrdinalIgnoreCase))
        {
            newCredits = 1000;
            record.Plan = SubscriptionPlan.Enterprise;
        }
        else
        {
            throw new ArgumentException("Geçersiz abonelik planı seçimi!");
        }

        record.Credits = newCredits;
        record.PlanStartedAt = DateTime.UtcNow.ToString("o");
        record.RenewsAt = DateTime.UtcNow.AddMonths(1).ToString("o");

        await _creditsRepository.SaveAsync(record, cancellationToken);
        return record;
    }

    /// <inheritdoc />
    public Task<List<SubscriptionPlanDetail>> GetPlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = new List<SubscriptionPlanDetail>
        {
            new()
            {
                Plan = SubscriptionPlan.Free,
                Credits = 5,
                Price = 0.00m,
                Features = new List<string> { "feature_free_orders", "feature_free_mfrs", "feature_free_support" }
            },
            new()
            {
                Plan = SubscriptionPlan.Pro,
                Credits = 100,
                Price = 49.00m,
                Features = new List<string> { "feature_prof_orders", "feature_prof_mfrs", "feature_prof_analytics", "feature_prof_support" }
            },
            new()
            {
                Plan = SubscriptionPlan.Enterprise,
                Credits = 1000,
                Price = 199.00m,
                Features = new List<string> { "feature_ent_orders", "feature_ent_mfrs", "feature_ent_analytics", "feature_ent_support", "feature_ent_custom" }
            }
        };

        return Task.FromResult(plans);
    }
}
