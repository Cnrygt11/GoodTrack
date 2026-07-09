namespace GoodTrack.API.DTOs.Etsy;

public class UpdateWebhookSecretDto
{
    public string EtsyShopId { get; set; } = string.Empty;
    public string WebhookSigningSecret { get; set; } = string.Empty;
}
