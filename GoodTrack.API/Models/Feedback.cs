using System.ComponentModel.DataAnnotations;

namespace GoodTrack.API.Models;

public class Feedback
{
    public string Id { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Message { get; set; } = string.Empty;

    public string BrowserInfo { get; set; } = string.Empty;

    public string CreatedAt { get; set; } = string.Empty;
}
