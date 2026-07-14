using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace GoodTrack.API.Configuration;

/// <summary>
/// Rate limiting bölümleme anahtarı üreticileri. Ayrı sınıfta tutulur ki anahtar seçimi
/// birim testlerle doğrulanabilsin (bkz. RateLimitPartitionTests).
/// </summary>
public static class RateLimitPartitioners
{
    /// <summary>
    /// Kimliği doğrulanmış istekte kullanıcı ID'sini, anonim istekte "ip:" önekli istemci
    /// IP'sini döner. Önek, bir kullanıcı ID'si ile IP string'inin aynı anahtara düşme
    /// olasılığını ortadan kaldırır. UseRateLimiter, UseAuthentication'dan sonra çalıştığından
    /// (bkz. Program.cs) User claim'leri bu noktada doludur.
    /// </summary>
    public static string ResolveUserOrIpPartitionKey(HttpContext httpContext)
    {
        var userId = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            return userId;
        }

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString();
        return "ip:" + ip;
    }
}
