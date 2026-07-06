using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Services;

public interface IEtsyService
{
    string GenerateOAuthUrl(string userId, string keystring, string sharedSecret, string redirectUri, out string codeVerifier);
    Task<EtsyConnection> ExchangeCodeForTokensAsync(string userId, string keystring, string sharedSecret, string authorizationCode, string codeVerifier, string redirectUri, CancellationToken cancellationToken = default);
    Task<EtsyConnection> ExchangeStateForTokensAsync(string state, string authorizationCode, CancellationToken cancellationToken = default);
    Task<EtsyConnection> RefreshAccessTokenAsync(string userId, string shopId, CancellationToken cancellationToken = default);
    Task<List<EtsyConnection>> GetConnectionsAsync(string userId, CancellationToken cancellationToken = default);
    Task<EtsyConnection?> GetConnectionAsync(string userId, string shopId, CancellationToken cancellationToken = default);
    Task<List<CatalogProduct>> FetchAndImportEtsyListingsAsync(string userId, CancellationToken cancellationToken = default);
    Task ProcessEtsyOrderSyncAsync(string userId, string shopId, string receiptId, CancellationToken cancellationToken = default);
    Task SyncRecentOrdersAsync(string userId, CancellationToken cancellationToken = default);
}
