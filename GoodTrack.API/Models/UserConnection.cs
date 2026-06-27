using System;

namespace GoodTrack.API.Models;

public class UserConnection
{
    public string Id { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public string ManufacturerId { get; set; } = string.Empty;
    public string ConnectedAt { get; set; } = string.Empty;
}
