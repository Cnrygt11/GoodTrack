using System;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure;

namespace GoodTrack.API.Services;

/// <summary>
/// <see cref="IJobLock"/>'un Postgres advisory-lock uygulaması. Kilit, iş süresince tek bir açık
/// bağlantı üzerinde tutulur (session-level <c>pg_try_advisory_lock</c>) ve sonunda bırakılır.
/// Postgres olmayan sağlayıcılarda (SQLite testleri) kilit atlanır; iş doğrudan çalışır.
/// </summary>
public sealed class PostgresAdvisoryJobLock : IJobLock
{
    private readonly AppDbContext _context;
    private readonly bool _isPostgres;

    public PostgresAdvisoryJobLock(AppDbContext context)
    {
        _context = context;
        _isPostgres = context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;
    }

    public async Task RunExclusiveAsync(long key, Func<CancellationToken, Task> work, CancellationToken cancellationToken = default)
    {
        if (!_isPostgres)
        {
            // Tek-instance / test ortamı: kilit gerekmez.
            await work(cancellationToken);
            return;
        }

        var connection = _context.Database.GetDbConnection();
        var openedHere = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
            openedHere = true;
        }

        try
        {
            if (!await TryAdvisoryLockAsync(connection, key, cancellationToken))
            {
                // Başka bir instance bu işi çalıştırıyor; bu turu atla.
                return;
            }

            try
            {
                await work(cancellationToken);
            }
            finally
            {
                await AdvisoryUnlockAsync(connection, key, cancellationToken);
            }
        }
        finally
        {
            if (openedHere)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> TryAdvisoryLockAsync(System.Data.Common.DbConnection connection, long key, CancellationToken ct)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT pg_try_advisory_lock(@key)";
        AddKeyParameter(cmd, key);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is true;
    }

    private static async Task AdvisoryUnlockAsync(System.Data.Common.DbConnection connection, long key, CancellationToken ct)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT pg_advisory_unlock(@key)";
        AddKeyParameter(cmd, key);
        await cmd.ExecuteScalarAsync(ct);
    }

    private static void AddKeyParameter(System.Data.Common.DbCommand cmd, long key)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = "@key";
        p.Value = key;
        cmd.Parameters.Add(p);
    }
}
