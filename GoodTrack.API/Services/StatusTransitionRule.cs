using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Services;

/// <summary>
/// Sipariş durum geçişi kuralı: gerekli rol, izin verilen kaynak durumlar, ihlal mesajı ve
/// geçiş aksiyonu. Aksiyon, scoped servis bağımlılıklarına (kredi iadesi, görsel temizliği)
/// erişebilmek için <see cref="OrderWorkflowService"/> instance'ını parametre alır; böylece
/// kural tablosu closure yakalamadan statik kurulur ve istek başına yeniden inşa edilmez.
/// </summary>
public sealed class StatusTransitionRule
{
    public required string RequiredRole { get; init; }
    public required HashSet<string> AllowedSourceStatuses { get; init; }
    public required string ErrorMessage { get; init; }

    /// <summary>(servis, sipariş, eskiDurum, kusurNotu, kusurGörseli) → log mesajı.</summary>
    public required Func<OrderWorkflowService, Product, string, string?, string?, Task<string>> TransitionAction { get; init; }
}
