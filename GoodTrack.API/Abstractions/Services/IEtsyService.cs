using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Services;

public interface IEtsyService
{
    Task<string> GenerateOAuthUrlAsync(string userId, string keystring, string callbackUrl, string frontendUrl, CancellationToken cancellationToken = default);
    Task<EtsyConnection> ExchangeCodeForTokensAsync(string userId, string keystring, string sharedSecret, string authorizationCode, string codeVerifier, string redirectUri, CancellationToken cancellationToken = default);

    /// <summary>Bekleyen OAuth state'ini tek kullanımlık olarak tüketir; yoksa/süresi dolmuşsa null.</summary>
    Task<PendingConnectionState?> ConsumeOAuthStateAsync(string state, CancellationToken cancellationToken = default);
    Task<EtsyConnection> RefreshAccessTokenAsync(string userId, string shopId, CancellationToken cancellationToken = default);
    Task<List<EtsyConnection>> GetConnectionsAsync(string userId, CancellationToken cancellationToken = default);
    Task<EtsyConnection?> GetConnectionAsync(string userId, string shopId, CancellationToken cancellationToken = default);
    Task<List<CatalogProduct>> FetchAndImportEtsyListingsAsync(string userId, CancellationToken cancellationToken = default);
    Task ProcessEtsyOrderSyncAsync(string userId, string shopId, string receiptId, CancellationToken cancellationToken = default);
    Task ProcessEtsyOrderCancellationAsync(string userId, string shopId, string receiptId, CancellationToken cancellationToken = default);
    Task SyncRecentOrdersAsync(string userId, CancellationToken cancellationToken = default);
}
