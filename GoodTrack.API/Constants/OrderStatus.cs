namespace GoodTrack.API.Constants;

/// <summary>
/// Central source of truth for order status strings.
/// Use these constants everywhere instead of raw string literals like "awaiting", "production", etc.
/// </summary>
public static class OrderStatus
{
    public const string Awaiting = "awaiting";
    public const string Production = "production";
    public const string Completed = "completed";
    public const string Delivered = "delivered";
    public const string Broken = "broken";
    public const string Corrected = "corrected";
    public const string Defective = "defective";
    public const string Missing = "missing";
    public const string ToShip = "to_ship";
    public const string Shipped = "shipped";
    public const string Cancelled = "cancelled";
}
