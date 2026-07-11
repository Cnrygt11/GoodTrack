using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Constants;
using GoodTrack.API.DTOs.Auth;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class ProfileServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock = new();
    private readonly Mock<IImageStorageService> _imageStorageServiceMock = new();
    private readonly Mock<IEtsyConnectionRepository> _etsyConnectionRepositoryMock = new();
    private readonly Mock<Microsoft.AspNetCore.Identity.IPasswordHasher<User>> _passwordHasherMock = new();
    private readonly ProfileService _service;

    public ProfileServiceTests()
    {
        _service = new ProfileService(
            _userRepositoryMock.Object,
            _imageStorageServiceMock.Object,
            _etsyConnectionRepositoryMock.Object,
            _passwordHasherMock.Object,
            Mock.Of<ILogger<ProfileService>>());

        _imageStorageServiceMock
            .Setup(s => s.StoreImageAsync(It.IsAny<string?>()))
            .ReturnsAsync((string? v) => v);
    }

    [Fact]
    public async Task DeactivateAccount_ValidPassword_SetsDeactivated_ClearsSession_DisablesEtsy()
    {
        var user = new User { Id = "u1", PasswordHash = "hash", RefreshToken = "rt" };
        _userRepositoryMock.Setup(r => r.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasherMock
            .Setup(h => h.VerifyHashedPassword(user, "hash", "correct"))
            .Returns(Microsoft.AspNetCore.Identity.PasswordVerificationResult.Success);
        var connections = new List<EtsyConnection> { new() { IsActive = true }, new() { IsActive = true } };
        _etsyConnectionRepositoryMock.Setup(r => r.GetAllForUserAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(connections);

        await _service.DeactivateAccountAsync("u1", "correct");

        user.DeactivatedAt.Should().NotBeNull();
        user.RefreshToken.Should().BeEmpty();
        connections.Should().OnlyContain(c => c.IsActive == false);
        _userRepositoryMock.Verify(r => r.SaveAsync(user, It.IsAny<CancellationToken>()), Times.Once);
        _etsyConnectionRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeactivateAccount_WrongPassword_Throws_NoChanges()
    {
        var user = new User { Id = "u1", PasswordHash = "hash" };
        _userRepositoryMock.Setup(r => r.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasherMock
            .Setup(h => h.VerifyHashedPassword(user, "hash", "wrong"))
            .Returns(Microsoft.AspNetCore.Identity.PasswordVerificationResult.Failed);

        var act = () => _service.DeactivateAccountAsync("u1", "wrong");
        await act.Should().ThrowAsync<UnauthorizedAccessException>();

        user.DeactivatedAt.Should().BeNull();
        _userRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeactivateAccount_AlreadyDeactivated_IsIdempotent()
    {
        var user = new User { Id = "u1", PasswordHash = "hash", DeactivatedAt = DateTime.UtcNow.AddDays(-1) };
        _userRepositoryMock.Setup(r => r.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasherMock
            .Setup(h => h.VerifyHashedPassword(user, "hash", "correct"))
            .Returns(Microsoft.AspNetCore.Identity.PasswordVerificationResult.Success);

        await _service.DeactivateAccountAsync("u1", "correct");

        _userRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetProfileByUsername_Deactivated_ThrowsKeyNotFound()
    {
        _userRepositoryMock
            .Setup(r => r.GetByUsernameAsync("gone", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u1", Username = "gone", DeactivatedAt = DateTime.UtcNow });

        var act = () => _service.GetProfileByUsernameAsync("gone");
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetProfile_NotFound_ThrowsKeyNotFound()
    {
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var act = () => _service.GetProfileAsync("missing");
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdateProfile_UserNotFound_ThrowsKeyNotFound()
    {
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var act = () => _service.UpdateProfileAsync("missing", new UserProfileDto());
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdateProfile_InvalidEmailFormat_Throws()
    {
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u1", Role = Roles.Seller, Email = "old@mail.com" });

        var dto = new UserProfileDto { FirstName = "A", LastName = "B", Email = "not-an-email" };

        var act = () => _service.UpdateProfileAsync("u1", dto);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UpdateProfile_DuplicateEmail_Throws()
    {
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u1", Role = Roles.Seller, Email = "old@mail.com" });
        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync("new@mail.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "other" });

        var dto = new UserProfileDto { FirstName = "A", LastName = "B", Email = "new@mail.com" };

        var act = () => _service.UpdateProfileAsync("u1", dto);
        await act.Should().ThrowAsync<ArgumentException>();

        _userRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_MfrBioTooLong_Throws()
    {
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync("m1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "m1", Role = Roles.Mfr });

        var dto = new UserProfileDto { FirstName = "A", LastName = "B", Bio = new string('x', 501) };

        var act = () => _service.UpdateProfileAsync("m1", dto);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UpdateProfile_ValidSeller_Saves()
    {
        _userRepositoryMock
            .Setup(r => r.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u1", Role = Roles.Seller, Email = "old@mail.com" });

        var dto = new UserProfileDto { FirstName = "Yeni", LastName = "Ad" };

        await _service.UpdateProfileAsync("u1", dto);

        _userRepositoryMock.Verify(
            r => r.SaveAsync(It.Is<User>(u => u.FirstName == "Yeni" && u.LastName == "Ad"), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
