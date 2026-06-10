namespace GoodTrack.API.Constants;

/// <summary>
/// Central source of truth for user role strings.
/// Use these constants everywhere instead of raw "seller" / "mfr" string literals.
/// </summary>
public static class Roles
{
    public const string Seller = "seller";
    public const string Mfr    = "mfr";
    public const string Admin  = "admin";
}
