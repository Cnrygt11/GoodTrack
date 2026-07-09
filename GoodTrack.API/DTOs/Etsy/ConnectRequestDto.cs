namespace GoodTrack.API.DTOs.Etsy;

public class ConnectRequestDto
{
    public string Keystring { get; set; } = string.Empty;
    public string SharedSecret { get; set; } = string.Empty;
    public string CallbackUrl { get; set; } = string.Empty;
    public string FrontendUrl { get; set; } = string.Empty;
}
