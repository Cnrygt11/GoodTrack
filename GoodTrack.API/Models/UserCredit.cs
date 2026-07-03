using System;
using System.Collections.Generic;

namespace GoodTrack.API.Models;

/// <summary>
/// Represents a user's credit balance and subscription plan details.
/// </summary>
public class UserCredit
{
    /// <summary>
    /// Unique identifier (primary key) for the user credit record.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// The unique foreign key ID pointing to the associated user.
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// The current subscription plan (e.g. Free, Pro, Enterprise).
    /// </summary>
    public string Plan { get; set; } = string.Empty;

    /// <summary>
    /// The current balance of credits.
    /// </summary>
    public int Credits { get; set; }

    /// <summary>
    /// Timestamp of when the plan was started.
    /// </summary>
    public DateTime PlanStartedAt { get; set; }

    /// <summary>
    /// Timestamp of when the plan renews next.
    /// </summary>
    public DateTime RenewsAt { get; set; }

    /// <summary>
    /// Concurrency token for optimistic locking (xmin system column in PostgreSQL).
    /// </summary>
    public uint RowVersion { get; set; }
}

/// <summary>
/// Represents detailed metrics and metadata of a subscription tier.
/// </summary>
public class SubscriptionPlanDetail
{
    /// <summary>
    /// The plan tier name.
    /// </summary>
    public string Plan { get; set; } = string.Empty;

    /// <summary>
    /// The number of credits included per cycle.
    /// </summary>
    public int Credits { get; set; }

    /// <summary>
    /// The monthly cost of the plan.
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Features included in this tier (keys that frontend maps to translations).
    /// </summary>
    public List<string> Features { get; set; } = new();
}

/// <summary>
/// Exception thrown when a user tries to perform a paid operation without sufficient credits.
/// </summary>
public class InsufficientCreditsException : Exception
{
    /// <summary>
    /// Initializes a new instance of the InsufficientCreditsException class.
    /// </summary>
    /// <param name="message">The exception message.</param>
    public InsufficientCreditsException(string message) : base(message) { }
}
