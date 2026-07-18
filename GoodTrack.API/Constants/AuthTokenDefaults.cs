using System;

namespace GoodTrack.API.Constants;

/// <summary>Oturum token'ı ömürlerinin tek kaynağı.</summary>
public static class AuthTokenDefaults
{
    /// <summary>JWT access token ömrü.</summary>
    public static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromHours(3);

    /// <summary>Refresh token ömrü.</summary>
    public static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);
}
