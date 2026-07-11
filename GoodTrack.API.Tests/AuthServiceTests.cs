using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;
using GoodTrack.API.Services;
using GoodTrack.API.DTOs.Auth;

namespace GoodTrack.API.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IPasswordHasher<User>> _passwordHasherMock;
    private readonly Mock<IEtsyConnectionRepository> _etsyConnectionRepositoryMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<ILogger<AuthService>> _loggerMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _passwordHasherMock = new Mock<IPasswordHasher<User>>();
        _etsyConnectionRepositoryMock = new Mock<IEtsyConnectionRepository>();
        _configurationMock = new Mock<IConfiguration>();
        _loggerMock = new Mock<ILogger<AuthService>>();

        _authService = new AuthService(
            _userRepositoryMock.Object,
            _passwordHasherMock.Object,
            _etsyConnectionRepositoryMock.Object,
            _configurationMock.Object,
            _loggerMock.Object);
    }

    [Theory]
    [InlineData("123", "Şifre en az 8, en fazla 20 karakter uzunluğunda olmalı")] // too short
    [InlineData("lowercase123!", "Şifre en az 8, en fazla 20 karakter uzunluğunda olmalı")] // no uppercase
    [InlineData("UPPERCASE123!", "Şifre en az 8, en fazla 20 karakter uzunluğunda olmalı")] // no lowercase
    [InlineData("NoSpecialChar123", "Şifre en az 8, en fazla 20 karakter uzunluğunda olmalı")] // no special character
    public async Task RegisterAsync_InvalidPasswordPolicy_ShouldThrowArgumentException(string password, string expectedMessagePart)
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser",
            Password = password,
            ConfirmPassword = password,
            Email = "test@example.com",
            PhoneNumber = "+905555555555",
            FirstName = "Test",
            LastName = "User",
            Role = Roles.Seller
        };

        // Act & Assert
        var act = () => _authService.RegisterAsync(request, "http://localhost");
        var exception = await act.Should().ThrowAsync<ArgumentException>();
        exception.And.Message.Should().Contain(expectedMessagePart);
    }

    [Fact]
    public async Task RegisterAsync_ValidRequest_ShouldHashPasswordAndSaveUser()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "validuser",
            Password = "ValidPassword123!",
            ConfirmPassword = "ValidPassword123!",
            Email = "valid@example.com",
            PhoneNumber = "+905555555555",
            FirstName = "Valid",
            LastName = "User",
            Role = Roles.Seller
        };

        _userRepositoryMock
            .Setup(r => r.GetByUsernameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User)null!);

        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User)null!);

        _passwordHasherMock
            .Setup(h => h.HashPassword(It.IsAny<User>(), It.IsAny<string>()))
            .Returns("hashed_password");

        // Act
        await _authService.RegisterAsync(request, "http://localhost");

        // Assert
        _userRepositoryMock.Verify(r => r.SaveAsync(It.Is<User>(u =>
            u.Username == "validuser" &&
            u.Email == "valid@example.com" &&
            u.PasswordHash == "hashed_password" &&
            u.Role == Roles.Seller
        )), Times.Once);
    }

    [Fact]
    public async Task RefreshTokenAsync_ValidTokenAndHashedRefreshTokenMatches_ShouldSucceed()
    {
        // Arrange
        var userId = "user-123";
        var plainRefreshToken = "plain_refresh_token_123";
        var bytes = System.Text.Encoding.UTF8.GetBytes(plainRefreshToken);
        var hash = System.Security.Cryptography.SHA256.HashData(bytes);
        var hashedToken = Convert.ToHexString(hash);

        var user = new User
        {
            Id = userId,
            Username = "testuser",
            Role = Roles.Seller,
            RefreshToken = hashedToken,
            RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(1),
            IsActive = true
        };

        _userRepositoryMock
            .Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var jwtKey = "super_secret_key_123_super_secret_key_123";
        Environment.SetEnvironmentVariable("JWT_KEY", jwtKey);

        _configurationMock.Setup(c => c["Jwt:Key"]).Returns(jwtKey);
        _configurationMock.Setup(c => c["Jwt:Issuer"]).Returns("GoodTrack");
        _configurationMock.Setup(c => c["Jwt:Audience"]).Returns("GoodTrackUsers");

        _userRepositoryMock
            .Setup(r => r.GetByUsernameAsync("testuser", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _passwordHasherMock
            .Setup(h => h.VerifyHashedPassword(user, user.PasswordHash, "password"))
            .Returns(PasswordVerificationResult.Success);

        var loginRes = await _authService.LoginAsync(new LoginRequest { Username = "testuser", Password = "password" });
        var jwtToken = loginRes.Token;
        var returnedRefreshToken = loginRes.RefreshToken;

        var refreshRequest = new TokenRefreshRequest
        {
            Token = jwtToken,
            RefreshToken = returnedRefreshToken
        };

        // Act
        var refreshRes = await _authService.RefreshTokenAsync(refreshRequest);

        // Assert
        refreshRes.Should().NotBeNull();
        refreshRes.Token.Should().NotBeNullOrEmpty();
        refreshRes.RefreshToken.Should().NotBeNullOrEmpty();
        refreshRes.RefreshToken.Should().NotBe(returnedRefreshToken);

        // Clean up env
        Environment.SetEnvironmentVariable("JWT_KEY", null);
    }

    [Fact]
    public async Task Login_DeactivatedUser_CorrectPassword_ReactivatesAndReenablesEtsy()
    {
        var user = new User
        {
            Id = "u1",
            Username = "testuser",
            PasswordHash = "hash",
            Role = Roles.Seller,
            IsActive = true,
            DeactivatedAt = DateTime.UtcNow.AddDays(-3) // deaktive
        };

        var jwtKey = "super_secret_key_123_super_secret_key_123";
        Environment.SetEnvironmentVariable("JWT_KEY", jwtKey);
        _configurationMock.Setup(c => c["Jwt:Key"]).Returns(jwtKey);

        _userRepositoryMock.Setup(r => r.GetByUsernameAsync("testuser", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasherMock.Setup(h => h.VerifyHashedPassword(user, "hash", "password")).Returns(PasswordVerificationResult.Success);

        var connections = new List<EtsyConnection> { new() { IsActive = false } };
        _etsyConnectionRepositoryMock.Setup(r => r.GetAllForUserAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(connections);

        var result = await _authService.LoginAsync(new LoginRequest { Username = "testuser", Password = "password" });

        result.Token.Should().NotBeNullOrEmpty();
        user.DeactivatedAt.Should().BeNull();                 // reaktive oldu
        connections.Should().OnlyContain(c => c.IsActive);    // Etsy geri açıldı
        _etsyConnectionRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        Environment.SetEnvironmentVariable("JWT_KEY", null);
    }
}
