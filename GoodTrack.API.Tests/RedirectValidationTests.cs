using FluentAssertions;
using Xunit;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

/// <summary>
/// Açık-yönlendirme koruması: OAuth dönüşünde yalnız izin verilen origin'lere yönlenilir.
/// </summary>
public class RedirectValidationTests
{
    private static readonly string[] Allowed =
    {
        "https://goodtrack-client.onrender.com",
        "http://localhost:5173",
    };

    [Theory]
    [InlineData("https://goodtrack-client.onrender.com/seller/profile?tab=integrations")]
    [InlineData("https://goodtrack-client.onrender.com")]
    public void AllowedOrigin_IsAccepted(string url)
    {
        RedirectValidation.IsOriginAllowed(url, Allowed).Should().BeTrue();
    }

    [Theory]
    [InlineData("http://localhost:5173/anything")]
    [InlineData("http://127.0.0.1:3000/x")]
    public void Localhost_IsAlwaysAccepted(string url)
    {
        RedirectValidation.IsOriginAllowed(url, Allowed).Should().BeTrue();
    }

    [Theory]
    [InlineData("https://evil.com/callback")]
    [InlineData("https://goodtrack-client.onrender.com.evil.com/x")] // alt-alan spoof
    [InlineData("http://goodtrack-client.onrender.com/x")] // yanlış şema (https bekleniyor)
    [InlineData("not-a-url")]
    [InlineData("")]
    [InlineData("javascript:alert(1)")]
    public void DisallowedOrExoticTargets_AreRejected(string url)
    {
        RedirectValidation.IsOriginAllowed(url, Allowed).Should().BeFalse();
    }
}
