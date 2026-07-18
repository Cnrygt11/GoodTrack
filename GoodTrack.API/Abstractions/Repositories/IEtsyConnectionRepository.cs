using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

/// <summary>
/// EtsyConnection kalıcılığı için repository. Diğer entity'lerle tutarlı olsun diye
/// Etsy akışları AppDbContext'e doğrudan erişmek yerine bunu kullanır.
/// </summary>
public interface IEtsyConnectionRepository
{
    Task<EtsyConnection?> GetAsync(string userId, string shopId, CancellationToken cancellationToken = default);
    Task<List<EtsyConnection>> GetAllForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<List<EtsyConnection>> GetActiveForUserAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>Shop id'ye sahip AKTİF bağlantıyı döner (webhook'un satıcıyı bulması için).</summary>
    Task<EtsyConnection?> GetActiveByShopIdAsync(string shopId, CancellationToken cancellationToken = default);

    /// <summary>Bağlantıyı silinmek üzere işaretler (SaveChangesAsync çağrılana kadar kalıcı olmaz).</summary>
    void Remove(EtsyConnection connection);

    /// <summary>Yeni bir bağlantıyı context'e ekler (SaveChangesAsync çağrılana kadar kalıcı olmaz).</summary>
    Task AddAsync(EtsyConnection connection, CancellationToken cancellationToken = default);

    /// <summary>Bekleyen değişiklikleri (yeni eklenen veya izlenen entity mutasyonları) kalıcı hale getirir.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
