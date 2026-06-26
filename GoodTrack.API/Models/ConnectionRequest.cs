namespace GoodTrack.API.Models;

public class ConnectionRequest
{
    public string Id { get; set; } = string.Empty;

    public string SenderId { get; set; } = string.Empty;

    public string SenderUsername { get; set; } = string.Empty;

    public string ReceiverId { get; set; } = string.Empty;

    public string ReceiverUsername { get; set; } = string.Empty;

    public string Status { get; set; } = "pending"; // "pending", "accepted", "rejected"

    public string CreatedAt { get; set; } = string.Empty;
}
