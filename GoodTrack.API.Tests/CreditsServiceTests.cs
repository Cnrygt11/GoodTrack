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
    [InlineData(SubscriptionPlan.Pro, 150)]
    [InlineData(SubscriptionPlan.Enterprise, 500)]
    public async Task UpgradePlanAsync_ValidPlan_ShouldUpgradeCredits(string plan, int expectedCredits)
    {
        // Arrange: Free plandan yükseltme; düşük bakiye planın aylık kredisine tamamlanır.
        var userId = "user-upgrade";
        var existingRecord = new UserCredit
        {
            UserId = userId,
            Plan = SubscriptionPlan.Free,
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
    public async Task UpgradePlanAsync_HigherExistingBalance_IsPreserved()
    {
        // Paket kredisiyle şişmiş bakiye yükseltmede ASLA azalmaz (max semantiği).
        var userId = "user-upgrade-max";
        var existingRecord = new UserCredit { UserId = userId, Plan = SubscriptionPlan.Free, Credits = 300 };
        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        var result = await _creditsService.UpgradePlanAsync(userId, SubscriptionPlan.Pro);

        result.Credits.Should().Be(300);
        result.Plan.Should().Be(SubscriptionPlan.Pro);
    }

    [Fact]
    public async Task UpgradePlanAsync_Downgrade_ShouldThrow()
    {
        var userId = "user-downgrade";
        var existingRecord = new UserCredit { UserId = userId, Plan = SubscriptionPlan.Enterprise, Credits = 400 };
        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        var act = () => _creditsService.UpgradePlanAsync(userId, SubscriptionPlan.Pro);
        await act.Should().ThrowAsync<GoodTrack.API.Models.BusinessRuleException>().WithMessage("Alt plana geçiş yapılamaz.");

        _creditsRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<UserCredit>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task TopUpAsync_ValidPackage_AddsCredits()
    {
        var userId = "user-topup";
        var existingRecord = new UserCredit { UserId = userId, Plan = SubscriptionPlan.Free, Credits = 3 };
        _creditsRepositoryMock
            .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingRecord);

        var result = await _creditsService.TopUpAsync(userId, "small"); // 25 kredi

        result.Credits.Should().Be(28);
        _creditsRepositoryMock.Verify(r => r.SaveAsync(existingRecord, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TopUpAsync_InvalidPackage_ShouldThrow()
    {
        var act = () => _creditsService.TopUpAsync("user-x", "mega");
        await act.Should().ThrowAsync<ArgumentException>();

        _creditsRepositoryMock.Verify(r => r.SaveAsync(It.IsAny<UserCredit>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ─── Aylık yenileme semantiği (CreditRenewalService.ApplyRenewal) ───────────

    [Fact]
    public void ApplyRenewal_TopsUpToPlanMonthlyCredits_AndAdvancesRenewsAt()
    {
        var now = new DateTime(2026, 7, 17, 12, 0, 0, DateTimeKind.Utc);
        var record = new UserCredit
        {
            Plan = SubscriptionPlan.Pro,
            Credits = 12,
            RenewsAt = now.AddDays(-3)
        };

        CreditRenewalService.ApplyRenewal(record, now);

        record.Credits.Should().Be(150);
        record.RenewsAt.Should().BeAfter(now);
        record.RenewsAt.Should().BeOnOrBefore(now.AddMonths(1));
    }

    [Fact]
    public void ApplyRenewal_HigherBalance_IsNotReduced()
    {
        // Satın alınmış paket kredileri yenilemede silinmez.
        var now = DateTime.UtcNow;
        var record = new UserCredit { Plan = SubscriptionPlan.Free, Credits = 210, RenewsAt = now.AddMinutes(-1) };

        CreditRenewalService.ApplyRenewal(record, now);

        record.Credits.Should().Be(210);
    }

    [Fact]
    public void ApplyRenewal_LongOutage_CatchesUpToFutureRenewalDate()
    {
        // Aylarca vade kaçmışsa RenewsAt tek turda güncel vadeye taşınır (takvim çıpası korunur).
        var now = new DateTime(2026, 7, 17, 0, 0, 0, DateTimeKind.Utc);
        var record = new UserCredit { Plan = SubscriptionPlan.Pro, Credits = 0, RenewsAt = now.AddMonths(-3) };

        CreditRenewalService.ApplyRenewal(record, now);

        record.RenewsAt.Should().BeAfter(now);
        record.Credits.Should().Be(150);
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
        await act.Should().ThrowAsync<GoodTrack.API.Models.BusinessRuleException>()
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
