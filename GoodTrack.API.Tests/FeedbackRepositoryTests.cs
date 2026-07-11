using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;

namespace GoodTrack.API.Tests;

/// <summary>
/// Feedback Id'sini servis değil repository üretir. Bu davranış burada gerçek
/// repository ile doğrulanır (FeedbackServiceTests repository'yi mock'ladığı için orada test edilemez).
/// </summary>
public class FeedbackRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly PostgresFeedbackRepository _repository;

    public FeedbackRepositoryTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _context = new AppDbContext(options, Mock.Of<Microsoft.AspNetCore.Http.IHttpContextAccessor>());
        _context.Database.EnsureCreated();

        _repository = new PostgresFeedbackRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private static Feedback NewFeedback() => new()
    {
        UserId = "u1",
        Username = "seller_one",
        Role = "seller",
        Title = "Başlık",
        Message = "Mesaj",
        BrowserInfo = "Chrome",
        CreatedAt = DateTime.UtcNow.ToString("o")
    };

    [Fact]
    public async Task SaveAsync_NewFeedback_GeneratesId()
    {
        var feedback = NewFeedback();
        feedback.Id.Should().BeEmpty(); // servis Id atamaz

        await _repository.SaveAsync(feedback);

        feedback.Id.Should().NotBeNullOrWhiteSpace();
        _context.Feedbacks.Should().ContainSingle(f => f.Id == feedback.Id);
    }

    [Fact]
    public async Task SaveAsync_TwoNewFeedbacks_GetDistinctIds()
    {
        var first = NewFeedback();
        var second = NewFeedback();

        await _repository.SaveAsync(first);
        await _repository.SaveAsync(second);

        first.Id.Should().NotBe(second.Id);
        _context.Feedbacks.Should().HaveCount(2);
    }

    [Fact]
    public async Task SaveAsync_ExistingId_UpdatesInsteadOfInserting()
    {
        var feedback = NewFeedback();
        await _repository.SaveAsync(feedback);
        var originalId = feedback.Id;

        feedback.Title = "Güncellendi";
        await _repository.SaveAsync(feedback);

        feedback.Id.Should().Be(originalId);
        _context.Feedbacks.Should().ContainSingle();
        _context.Feedbacks.Single().Title.Should().Be("Güncellendi");
    }
}
