namespace GoodTrack.API.DTOs.Auth;

/// <summary>Hesap deaktivasyonu (soft-delete) isteği. Güvenlik için şifre onayı istenir.</summary>
public class DeactivateAccountDto
{
    public string Password { get; set; } = string.Empty;
}
