using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GoodTrack.API.Models;

namespace GoodTrack.API.Abstractions.Repositories;

public interface IFeedbackRepository
{
    Task SaveAsync(Feedback feedback, CancellationToken cancellationToken = default);
    Task<List<Feedback>> GetAllFeedbacksAsync(CancellationToken cancellationToken = default);
}
