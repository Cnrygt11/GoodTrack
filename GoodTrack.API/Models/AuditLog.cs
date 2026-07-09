using System;

namespace GoodTrack.API.Models;

public class AuditLog
{
    public string Id { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // Insert, Update, Delete
    public string KeyValues { get; set; } = string.Empty; // JSON Primary Key
    public string? OldValues { get; set; } // JSON eski değerler
    public string? NewValues { get; set; } // JSON yeni değerler
    public DateTime Timestamp { get; set; }
}
