using System.Net;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using GoodTrack.API.Configuration;

namespace GoodTrack.API.Tests;

/// <summary>
/// Rate limiting bölümleme anahtarı seçiminin testleri: kimliği doğrulanmış istek kullanıcı
/// ID'sine, anonim istek "ip:" önekli istemci IP'sine bölümlenmelidir.
/// </summary>
public class RateLimitPartitionTests
{
    [Fact]
    public void AuthenticatedUser_PartitionsByUserId()
    {
        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "user-123") }, "TestAuth"));
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");

        var key = RateLimitPartitioners.ResolveUserOrIpPartitionKey(context);

        key.Should().Be("user-123");
    }

    [Fact]
    public void AnonymousRequest_PartitionsByIpWithPrefix()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");

        var key = RateLimitPartitioners.ResolveUserOrIpPartitionKey(context);

        key.Should().Be("ip:203.0.113.10");
    }

    [Fact]
    public void TwoAuthenticatedUsersBehindSameIp_GetDistinctPartitions()
    {
        var sharedIp = IPAddress.Parse("198.51.100.7");

        var first = new DefaultHttpContext();
        first.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "seller-1") }, "TestAuth"));
        first.Connection.RemoteIpAddress = sharedIp;

        var second = new DefaultHttpContext();
        second.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "seller-2") }, "TestAuth"));
        second.Connection.RemoteIpAddress = sharedIp;

        RateLimitPartitioners.ResolveUserOrIpPartitionKey(first)
            .Should().NotBe(RateLimitPartitioners.ResolveUserOrIpPartitionKey(second));
    }

    [Fact]
    public void UserIdMatchingAnIpString_DoesNotCollideWithAnonymousIpPartition()
    {
        // Kötü niyetli/tesadüfi durum: kullanıcı ID'si bir IP string'ine eşitse bile
        // anonim IP bölümüyle çakışmamalı ("ip:" öneki sayesinde).
        var authenticated = new DefaultHttpContext();
        authenticated.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "203.0.113.10") }, "TestAuth"));

        var anonymous = new DefaultHttpContext();
        anonymous.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");

        RateLimitPartitioners.ResolveUserOrIpPartitionKey(authenticated)
            .Should().NotBe(RateLimitPartitioners.ResolveUserOrIpPartitionKey(anonymous));
    }
}
