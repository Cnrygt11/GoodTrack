using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.DTOs.Feedback;

public class FeedbackInputDto
{
    [Required(ErrorMessage = "Geri bildirim başlığı zorunludur.")]
    [MaxLength(100, ErrorMessage = "Geri bildirim başlığı en fazla 100 karakter olabilir.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Geri bildirim mesajı zorunludur.")]
    [MaxLength(2000, ErrorMessage = "Geri bildirim mesajı en fazla 2000 karakter olabilir.")]
    public string Message { get; set; } = string.Empty;

    [MaxLength(500, ErrorMessage = "Tarayıcı bilgisi en fazla 500 karakter olabilir.")]
    public string? BrowserInfo { get; set; }
}
