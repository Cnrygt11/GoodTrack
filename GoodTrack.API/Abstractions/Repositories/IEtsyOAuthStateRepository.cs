using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IEtsyOAuthStateRepository
{
    Task AddAsync(EtsyOAuthState state, CancellationToken cancellationToken = default);

    /// <summary>
    /// State'i atomik biçimde tüketir: satırı siler ve içeriğini döndürür.
    /// Bulunamazsa, süresi dolmuşsa veya eşzamanlı bir çağrı önce tüketmişse <c>null</c> döner.
    /// </summary>
    Task<EtsyOAuthState?> ConsumeAsync(string state, CancellationToken cancellationToken = default);

    /// <summary>Süresi dolmuş state kayıtlarını siler; silinen satır sayısını döndürür.</summary>
    Task<int> DeleteExpiredAsync(CancellationToken cancellationToken = default);
}
