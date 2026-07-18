using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

/// <summary>
/// Service managing user credits and subscription plan actions.
/// </summary>
public sealed class CreditsService : ICreditsService
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

        // Lazy initialize with Free plan details (kredi sayısı plan kataloğundan gelir)
        record = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Free,
            Credits = SubscriptionPlanCatalog.ResolveOrFree(SubscriptionPlan.Free).MonthlyCredits,
            PlanStartedAt = DateTime.UtcNow,
            RenewsAt = DateTime.UtcNow.AddMonths(1)
        };

        await _creditsRepository.SaveAsync(record, cancellationToken);
        return record;
    }

    /// <inheritdoc />
    public async Task DeductForOrderAsync(string userId, CancellationToken cancellationToken = default)
    {
        // Krediler xmin (RowVersion) ile optimistic-lock'landığından, aynı kullanıcının
        // eşzamanlı sipariş oluşturması çakışmaya yol açabilir. Böyle bir durumda güncel
        // bakiyeyi yeniden okuyup işlemi sınırlı sayıda tekrar deneriz.
        const int maxAttempts = 3;

        var record = await GetOrCreateCreditsAsync(userId, cancellationToken);

        for (int attempt = 1; ; attempt++)
        {
            if (record.Credits < CreditCost.OrderCreation)
            {
                throw new InsufficientCreditsException("Krediniz yetersiz! Lütfen sipariş oluşturabilmek için planınızı yükseltin.");
            }

            record.Credits -= CreditCost.OrderCreation;

            try
            {
                await _creditsRepository.SaveAsync(record, cancellationToken);
                return;
            }
            catch (DbUpdateConcurrencyException ex) when (attempt < maxAttempts)
            {
                // Başka bir işlem bakiyeyi bu arada değiştirdi: güncel değerleri (Credits + xmin)
                // veritabanından yeniden yükle ve döngüde tekrar dene.
                foreach (var entry in ex.Entries)
                {
                    await entry.ReloadAsync(cancellationToken);
                }
            }
        }
    }

    /// <inheritdoc />
    public async Task<UserCredit> UpgradePlanAsync(string userId, string plan, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(plan))
        {
            throw new ArgumentException("Plan seçimi boş olamaz!");
        }

        var targetPlan = SubscriptionPlanCatalog.FindPlan(plan)
            ?? throw new ArgumentException("Geçersiz abonelik planı seçimi!");

        var record = await GetOrCreateCreditsAsync(userId, cancellationToken);

        if (record.Plan.Equals(targetPlan.Plan, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Zaten '{plan}' planına sahipsiniz! Aynı plana tekrar yükseltme yapamazsınız.");
        }

        // Alt plana geçiş yok: bakiye/özellik kaybına yol açar ve iade akışı bulunmuyor.
        var currentPlan = SubscriptionPlanCatalog.ResolveOrFree(record.Plan);
        if (targetPlan.Rank < currentPlan.Rank)
        {
            throw new InvalidOperationException("Alt plana geçiş yapılamaz.");
        }

        // Yükseltmede bakiye asla azalmaz: satın alınmış paket kredileri korunur,
        // yeni planın aylık kredisi tabandır (yenileme semantiğiyle aynı — bkz. CreditRenewalService).
        record.Plan = targetPlan.Plan;
        record.Credits = Math.Max(record.Credits, targetPlan.MonthlyCredits);
        record.PlanStartedAt = DateTime.UtcNow;
        record.RenewsAt = DateTime.UtcNow.AddMonths(1);

        await _creditsRepository.SaveAsync(record, cancellationToken);
        return record;
    }

    /// <inheritdoc />
    public async Task<UserCredit> TopUpAsync(string userId, string packageId, CancellationToken cancellationToken = default)
    {
        var package = SubscriptionPlanCatalog.FindPackage(packageId)
            ?? throw new ArgumentException("Geçersiz kredi paketi seçimi!");

        // Bakiye xmin ile optimistic-lock'lu; eşzamanlı sipariş düşümüyle çakışırsa
        // güncel değeri yükleyip sınırlı sayıda tekrar dene (DeductForOrderAsync ile aynı desen).
        const int maxAttempts = 3;
        var record = await GetOrCreateCreditsAsync(userId, cancellationToken);

        for (int attempt = 1; ; attempt++)
        {
            record.Credits += package.Credits;

            try
            {
                await _creditsRepository.SaveAsync(record, cancellationToken);
                return record;
            }
            catch (DbUpdateConcurrencyException ex) when (attempt < maxAttempts)
            {
                foreach (var entry in ex.Entries)
                {
                    await entry.ReloadAsync(cancellationToken);
                }
            }
        }
    }

    /// <inheritdoc />
    public Task<List<CreditPackage>> GetPackagesAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(SubscriptionPlanCatalog.Packages.ToList());
    }

    /// <inheritdoc />
    public async Task RefundCreditAsync(string userId, int amount = 1, CancellationToken cancellationToken = default)
    {
        var record = await GetOrCreateCreditsAsync(userId, cancellationToken);
        record.Credits += amount;
        await _creditsRepository.SaveAsync(record, cancellationToken);
    }

    /// <inheritdoc />
    public Task<List<SubscriptionPlanDetail>> GetPlansAsync(CancellationToken cancellationToken = default)
    {
        // Tek kaynak SubscriptionPlanCatalog; fiyat/kredi/özellik değişikliği orada yapılır.
        var plans = SubscriptionPlanCatalog.Plans
            .Select(p => new SubscriptionPlanDetail
            {
                Plan = p.Plan,
                Credits = p.MonthlyCredits,
                Price = p.Price,
                Features = p.FeatureKeys.ToList()
            })
            .ToList();

        return Task.FromResult(plans);
    }
}
