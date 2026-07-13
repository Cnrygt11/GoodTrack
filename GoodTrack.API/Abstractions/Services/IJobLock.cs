using System;
using System.Threading;
using System.Threading.Tasks;

namespace GoodTrack.API.Abstractions.Services;

/// <summary>
/// Çok-instance dağıtımlarda periyodik arka plan işlerinin (retention job'ları) yalnız tek instance'ta
/// çalışmasını sağlayan dağıtık kilit. Postgres advisory lock ile uygulanır; test/non-Postgres
/// ortamlarında no-op'a düşer (iş her zaman çalışır).
/// </summary>
public interface IJobLock
{
    /// <summary>
    /// <paramref name="key"/> için dağıtık kilidi almayı dener; alırsa <paramref name="work"/>'ü çalıştırır
    /// ve bitince kilidi bırakır. Alamazsa (başka instance çalıştırıyor) işi atlar.
    /// </summary>
    Task RunExclusiveAsync(long key, Func<CancellationToken, Task> work, CancellationToken cancellationToken = default);
}
