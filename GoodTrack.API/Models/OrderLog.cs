namespace GoodTrack.API.Models;

public class OrderLog
{
    public string Timestamp { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;
}
