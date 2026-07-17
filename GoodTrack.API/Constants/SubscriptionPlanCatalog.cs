using System;
using System.Collections.Generic;
using System.Linq;

namespace GoodTrack.API.Constants;

/// <summary>Bir abonelik planının tanımı: aylık kredi, fiyat, sıra ve özellik anahtarları.</summary>
public sealed record PlanDefinition(string Plan, int Rank, int MonthlyCredits, decimal Price, IReadOnlyList<string> FeatureKeys);

/// <summary>Tek seferlik kredi paketi tanımı (dolum/top-up).</summary>
public sealed record CreditPackage(string Id, int Credits, decimal Price, bool Popular);

/// <summary>
/// Plan ve kredi paketi tanımlarının TEK kaynağı. GetPlansAsync, UpgradePlanAsync ve
/// aylık yenileme job'ı (CreditRenewalService) buradan okur — kredi/fiyat değişikliği
/// yalnız burada yapılır. Rank alçak plana geçişi engellemek için kullanılır (Free=0).
/// </summary>
public static class SubscriptionPlanCatalog
{
    public static readonly IReadOnlyList<PlanDefinition> Plans = new List<PlanDefinition>
    {
        new(SubscriptionPlan.Free, Rank: 0, MonthlyCredits: 5, Price: 0.00m, FeatureKeys: new[]
        {
            "feature_free_orders", "feature_free_directory", "feature_free_support"
        }),
        new(SubscriptionPlan.Pro, Rank: 1, MonthlyCredits: 150, Price: 19.00m, FeatureKeys: new[]
        {
            "feature_prof_orders", "feature_prof_mfrs", "feature_prof_directory",
            "feature_prof_etsy", "feature_prof_support"
        }),
        new(SubscriptionPlan.Enterprise, Rank: 2, MonthlyCredits: 500, Price: 49.00m, FeatureKeys: new[]
        {
            "feature_ent_orders", "feature_ent_everything", "feature_ent_support", "feature_ent_custom"
        }),
    };

    /// <summary>
    /// Tek seferlik kredi paketleri. Kredi başı fiyat bilinçli olarak plan kredi başı
    /// fiyatının üzerindedir (abonelik cazip kalsın): 25/$5, 75/$12, 200/$25.
    /// </summary>
    public static readonly IReadOnlyList<CreditPackage> Packages = new List<CreditPackage>
    {
        new("small", Credits: 25, Price: 5.00m, Popular: false),
        new("medium", Credits: 75, Price: 12.00m, Popular: true),
        new("large", Credits: 200, Price: 25.00m, Popular: false),
    };

    /// <summary>Plan adına göre tanım (kasa-duyarsız); bilinmeyen planda null.</summary>
    public static PlanDefinition? FindPlan(string? plan) =>
        Plans.FirstOrDefault(p => p.Plan.Equals(plan, StringComparison.OrdinalIgnoreCase));

    /// <summary>Paket kimliğine göre tanım (kasa-duyarsız); bilinmeyen pakette null.</summary>
    public static CreditPackage? FindPackage(string? packageId) =>
        Packages.FirstOrDefault(p => p.Id.Equals(packageId, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Bilinmeyen plan adlarında (eski/bozuk kayıt) Free varsayılır — yenileme job'ı
    /// hiçbir kaydı işleyemez durumda bırakmaz.
    /// </summary>
    public static PlanDefinition ResolveOrFree(string? plan) => FindPlan(plan) ?? Plans[0];
}
