using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure.Configurations;

public sealed class UserCreditConfiguration : IEntityTypeConfiguration<UserCredit>
{
    private readonly bool _isSqlite;

    public UserCreditConfiguration(bool isSqlite)
    {
        _isSqlite = isSqlite;
    }

    public void Configure(EntityTypeBuilder<UserCredit> builder)
    {
        builder.ToTable("user_credits");
        builder.HasKey(c => c.Id);

        if (!_isSqlite)
        {
            builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()::text");
        }

        builder.Property(c => c.UserId).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Plan).IsRequired().HasMaxLength(50);
        builder.Property(c => c.Credits).IsRequired();
        builder.Property(c => c.PlanStartedAt).IsRequired();
        builder.Property(c => c.RenewsAt).IsRequired();

        builder.HasIndex(c => c.UserId).IsUnique();

        if (!_isSqlite)
        {
            builder.Property(c => c.RowVersion).IsRowVersion();
        }

        builder.HasOne<User>()
              .WithOne()
              .HasForeignKey<UserCredit>(c => c.UserId)
              .OnDelete(DeleteBehavior.Cascade);
    }
}
