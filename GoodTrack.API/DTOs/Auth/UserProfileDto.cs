using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Auth;

public class UserProfileDto
{
    /// <summary>Kullanıcı kimliği. Dizin sonuçlarında galeriyi talep üzerine çekmek için kullanılır.</summary>
    public string Id { get; set; } = string.Empty;

    [MaxLength(15)]
    public string Username { get; set; } = string.Empty;

    [MaxLength(100)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Role { get; set; } = string.Empty;

    // Base64 image — max ~5MB binary (≈ 6.8MB base64)
    [MaxLength(7_000_000)]
    public string ProfilePicture { get; set; } = string.Empty;

    /// <summary>Küçük avatar thumbnail'i; dizin/listeler bunu taşır, tam avatar profil detayında döner.</summary>
    public string ProfileThumbnail { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Bio { get; set; } = string.Empty;

    public List<string> ProductImages { get; set; } = new();
    public List<string> Keywords { get; set; } = new();
    public bool IsVisibleToSellers { get; set; }

    /// <summary>
    /// Ürün galerisindeki görsel sayısı. Dizin/arama sonuçlarında <see cref="ProductImages"/> boş döner
    /// (ağır base64 taşınmaz); istemci bu sayıyı "Galeriyi gör (N)" için kullanır ve galeriyi talep
    /// üzerine ayrı uç noktadan çeker.
    /// </summary>
    public int GalleryCount { get; set; }
}
