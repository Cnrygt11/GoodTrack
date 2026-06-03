namespace GoodTrack.API.DTOs.Auth;

public class ConnectionRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string SenderUsername { get; set; } = string.Empty;
    public string ReceiverId { get; set; } = string.Empty;
    public string ReceiverUsername { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "pending", "accepted", "rejected"
    public string CreatedAt { get; set; } = string.Empty;
}
