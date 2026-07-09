namespace GoodTrack.API.DTOs.Etsy;

/// <summary>
/// Bir Etsy API çağrısı için gereken kimlik bilgileri (platform anahtarları + mağaza access token).
/// x-api-key başlığı "keystring:sharedSecret", Authorization ise "Bearer accessToken" olarak gönderilir.
/// </summary>
public sealed record EtsyCredentials(string Keystring, string SharedSecret, string AccessToken);
