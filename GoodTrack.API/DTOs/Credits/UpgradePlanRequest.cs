namespace GoodTrack.API.DTOs.Credits;

/// <summary>
/// Data transfer object containing parameters for upgrading a subscription plan.
/// </summary>
public class UpgradePlanRequest
{
    /// <summary>
    /// The target plan name to upgrade to.
    /// </summary>
    public string Plan { get; set; } = string.Empty;
}
