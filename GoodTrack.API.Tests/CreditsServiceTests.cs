using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Constants;
using GoodTrack.API.Models;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

public class CreditsServiceTests
{
    private readonly Mock<ICreditsRepository> _creditsRepositoryMock;
    private readonly CreditsService _creditsService;

    public CreditsServiceTests()
    {
        _creditsRepositoryMock = new Mock<ICreditsRepository>();
        _creditsService = new CreditsService(_creditsRepositoryMock.Object);
    }

    [Fact]
    public async Task GetOrCreateCreditsAsync_RecordExists_ShouldReturnExistingRecord()
    {
        // Arrange
        var userId = "user-123";
        var existingRecord = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Pro,
            Credits = 50
        };

        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        // Act
        var result = await _creditsService.GetOrCreateCreditsAsync(userId);

        // Assert
        result.Should().BeEquivalentTo(existingRecord);
        _creditsRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<UserCredit>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetOrCreateCreditsAsync_RecordDoesNotExist_ShouldLazyInitializeWithFreePlan()
    {
        // Arrange
        var userId = "user-456";

        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserCredit?)null);

        // Act
        var result = await _creditsService.GetOrCreateCreditsAsync(userId);

        // Assert
        result.UserId.Should().Be(userId);
        result.Plan.Should().Be(SubscriptionPlan.Free);
        result.Credits.Should().Be(5);
        result.PlanStartedAt.Should().NotBe(default(DateTime));
        result.RenewsAt.Should().NotBe(default(DateTime));

        _creditsRepositoryMock.Verify(r => r.SaveAsync(It.Is<UserCredit>(c => c.UserId == userId && c.Plan == SubscriptionPlan.Free), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeductForOrderAsync_SufficientCredits_ShouldDeductCredits()
    {
        // Arrange
        var userId = "user-789";
        var existingRecord = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Free,
            Credits = 5
        };

        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        // Act
        await _creditsService.DeductForOrderAsync(userId);

        // Assert
        existingRecord.Credits.Should().Be(4); // 5 - CreditCost.OrderCreation (1) = 4
        _creditsRepositoryMock.Verify(r => r.SaveAsync(existingRecord, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeductForOrderAsync_InsufficientCredits_ShouldThrowInsufficientCreditsException()
    {
        // Arrange
        var userId = "user-999";
        var existingRecord = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Free,
            Credits = 0
        };

        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        // Act & Assert
        var act = () => _creditsService.DeductForOrderAsync(userId);
        await act.Should().ThrowAsync<InsufficientCreditsException>();

        _creditsRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<UserCredit>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(SubscriptionPlan.Free, 5)]
    [InlineData(SubscriptionPlan.Pro, 100)]
    [InlineData(SubscriptionPlan.Enterprise, 1000)]
    public async Task UpgradePlanAsync_ValidPlan_ShouldUpgradeCredits(string plan, int expectedCredits)
    {
        // Arrange
        var userId = "user-upgrade";
        var existingRecord = new UserCredit
        {
            UserId = userId,
            Plan = plan == SubscriptionPlan.Free ? SubscriptionPlan.Pro : SubscriptionPlan.Free,
            Credits = 2
        };

        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        // Act
        var result = await _creditsService.UpgradePlanAsync(userId, plan);

        // Assert
        result.Plan.Should().Be(plan);
        result.Credits.Should().Be(expectedCredits);
        _creditsRepositoryMock.Verify(r => r.SaveAsync(existingRecord, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpgradePlanAsync_SamePlan_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var userId = "user-same";
        var existingRecord = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Pro,
            Credits = 100
        };

        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        // Act & Assert
        var act = () => _creditsService.UpgradePlanAsync(userId, SubscriptionPlan.Pro);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Zaten 'Pro' planına sahipsiniz! Aynı plana tekrar yükseltme yapamazsınız.");

        _creditsRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<UserCredit>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RefundCreditAsync_ShouldIncreaseCreditsByAmount()
    {
        // Arrange
        var userId = "user-refund";
        var existingRecord = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Free,
            Credits = 5
        };

        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        // Act
        await _creditsService.RefundCreditAsync(userId, 2);

        // Assert
        existingRecord.Credits.Should().Be(7); // 5 + 2 = 7
        _creditsRepositoryMock.Verify(r => r.SaveAsync(existingRecord, It.IsAny<CancellationToken>()), Times.Once);
    }
}
