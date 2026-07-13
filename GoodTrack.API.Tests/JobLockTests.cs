using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Services;

namespace GoodTrack.API.Tests;

/// <summary>
/// <see cref="PostgresAdvisoryJobLock"/>'un non-Postgres (SQLite test) ortamında no-op'a düşüp işi
/// çalıştırdığını doğrular — böylece tek-instance/test akışı bozulmaz.
/// </summary>
public class JobLockTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;

    public JobLockTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var httpContextAccessorMock = new Moq.Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        _context = new AppDbContext(options, httpContextAccessorMock.Object);
        _context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    [Fact]
    public async Task RunExclusive_ExecutesWork_OnNonPostgresProvider()
    {
        var jobLock = new PostgresAdvisoryJobLock(_context);
        var ran = false;

        await jobLock.RunExclusiveAsync(12345, ct =>
        {
            ran = true;
            return Task.CompletedTask;
        });

        ran.Should().BeTrue();
    }
}
