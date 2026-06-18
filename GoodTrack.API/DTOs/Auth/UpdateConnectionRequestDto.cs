using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Auth;

public class UpdateConnectionRequestDto
{
    [Required(ErrorMessage = "Durum bilgisi zorunludur.")]
    [RegularExpression("^(accepted|rejected)$", ErrorMessage = "Durum sadece 'accepted' veya 'rejected' olabilir.")]
    public string Status { get; set; } = string.Empty;
}
