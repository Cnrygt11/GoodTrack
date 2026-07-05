using Microsoft.EntityFrameworkCore;
using GoodTrack.API.Models;

namespace GoodTrack.API.Infrastructure;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CatalogProduct> CatalogProducts => Set<CatalogProduct>();
    public DbSet<ConnectionRequest> ConnectionRequests => Set<ConnectionRequest>();
    public DbSet<ExtraFieldDef> ExtraFieldDefs => Set<ExtraFieldDef>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<UserCredit> UserCredits => Set<UserCredit>();
    public DbSet<UserConnection> UserConnections => Set<UserConnection>();
    public DbSet<EtsyConnection> EtsyConnections => Set<EtsyConnection>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        bool isSqlite = Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";
        
        // ── User ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            if (!isSqlite)
            {
                entity.Property(u => u.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(u => u.Username).IsRequired().HasMaxLength(100);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).IsRequired().HasMaxLength(20);
            entity.Property(u => u.Email).HasMaxLength(200);
            entity.Property(u => u.FirstName).HasMaxLength(100);
            entity.Property(u => u.LastName).HasMaxLength(100);
            entity.Property(u => u.PhoneNumber).HasMaxLength(20);
            entity.Property(u => u.City).HasMaxLength(100);
            entity.Property(u => u.Bio).HasMaxLength(1000);
            entity.Property(u => u.CreatedAt).HasMaxLength(50);
            entity.Property(u => u.VerificationToken).HasMaxLength(200);
            entity.Property(u => u.VerificationTokenExpiresAt).HasMaxLength(50);
            entity.Property(u => u.RefreshToken).HasMaxLength(500);
            entity.Property(u => u.RefreshTokenExpiryTime);
            // PostgreSQL native text[] arrays
            if (!isSqlite)
            {
                entity.Property(u => u.Keywords).HasColumnType("text[]");
                entity.Property(u => u.ProductImages).HasColumnType("text[]");
                entity.Property(u => u.RowVersion).IsRowVersion();
            }
            // Unique index
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // ── Product ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(p => p.Id);
            if (!isSqlite)
            {
                entity.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(p => p.Code).IsRequired().HasMaxLength(100);
            entity.Property(p => p.Status).IsRequired().HasMaxLength(50);
            entity.Property(p => p.SellerId).IsRequired().HasMaxLength(100);
            entity.Property(p => p.ManufacturerId).IsRequired().HasMaxLength(100);
            entity.Property(p => p.SellerName).HasMaxLength(200);
            entity.Property(p => p.ManufacturerName).HasMaxLength(200);
            entity.Property(p => p.CreatedAt).IsRequired();
            entity.Property(p => p.CompletedAt);
            entity.Property(p => p.Text).HasMaxLength(1000);
            entity.Property(p => p.Length).HasMaxLength(50);
            entity.Property(p => p.DefectNote).HasMaxLength(1000);
            // JSONB columns for nested structures
            if (!isSqlite)
            {
                entity.Property(p => p.Extras).HasColumnType("jsonb");
                entity.Property(p => p.Logs).HasColumnType("jsonb");
            }
            else
            {
                var jsonOptions = new System.Text.Json.JsonSerializerOptions();
                entity.Property(p => p.Extras).HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, jsonOptions),
                    v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, ExtraValue>>(v, jsonOptions) ?? new Dictionary<string, ExtraValue>()
                );
                entity.Property(p => p.Logs).HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, jsonOptions),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<OrderLog>>(v, jsonOptions) ?? new List<OrderLog>()
                );
            }
            // Indexes
            entity.HasIndex(p => p.SellerId);
            entity.HasIndex(p => p.ManufacturerId);
        });

        // ── CatalogProduct ────────────────────────────────────────────────────
        modelBuilder.Entity<CatalogProduct>(entity =>
        {
            entity.ToTable("catalog_products");
            entity.HasKey(c => c.Id);
            if (!isSqlite)
            {
                entity.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(c => c.SellerId).IsRequired().HasMaxLength(100);
            entity.Property(c => c.ProductCode).IsRequired().HasMaxLength(100);
            entity.Property(c => c.ManufacturerId).HasMaxLength(100);
            entity.Property(c => c.ManufacturerName).HasMaxLength(200);
            entity.Property(c => c.Text).HasMaxLength(1000);
            entity.Property(c => c.Length).HasMaxLength(50);
            entity.Property(c => c.CreatedAt).HasMaxLength(50);
            if (!isSqlite)
            {
                entity.Property(c => c.Extras).HasColumnType("jsonb");
            }
            else
            {
                var jsonOptions = new System.Text.Json.JsonSerializerOptions();
                entity.Property(c => c.Extras).HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, jsonOptions),
                    v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, ExtraValue>>(v, jsonOptions) ?? new Dictionary<string, ExtraValue>()
                );
            }
            entity.HasIndex(c => c.SellerId);
            entity.HasIndex(c => new { c.SellerId, c.ProductCode }).IsUnique();
        });

        // ── ConnectionRequest ─────────────────────────────────────────────────
        modelBuilder.Entity<ConnectionRequest>(entity =>
        {
            entity.ToTable("connection_requests");
            entity.HasKey(r => r.Id);
            if (!isSqlite)
            {
                entity.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(r => r.SenderId).IsRequired().HasMaxLength(100);
            entity.Property(r => r.SenderUsername).HasMaxLength(100);
            entity.Property(r => r.ReceiverId).IsRequired().HasMaxLength(100);
            entity.Property(r => r.ReceiverUsername).HasMaxLength(100);
            entity.Property(r => r.Status).IsRequired().HasMaxLength(20).HasDefaultValue("pending");
            entity.Property(r => r.CreatedAt).HasMaxLength(50);
            entity.HasIndex(r => r.ReceiverId);
            entity.HasIndex(r => r.SenderId);
        });

        // ── ExtraFieldDef ─────────────────────────────────────────────────────
        modelBuilder.Entity<ExtraFieldDef>(entity =>
        {
            entity.ToTable("extra_field_defs");
            entity.HasKey(f => f.Id);
            if (!isSqlite)
            {
                entity.Property(f => f.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(f => f.Name).IsRequired().HasMaxLength(100);
            entity.Property(f => f.Type).IsRequired().HasMaxLength(50);
            entity.Property(f => f.CreatedBy).HasMaxLength(100);
            if (!isSqlite)
            {
                entity.Property(f => f.Options).HasColumnType("text[]");
            }
            entity.HasIndex(f => f.CreatedBy);
        });

        // ── Feedback ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.ToTable("feedbacks");
            entity.HasKey(f => f.Id);
            if (!isSqlite)
            {
                entity.Property(f => f.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(f => f.UserId).HasMaxLength(100);
            entity.Property(f => f.Username).HasMaxLength(100);
            entity.Property(f => f.Role).HasMaxLength(20);
            entity.Property(f => f.Title).IsRequired().HasMaxLength(100);
            entity.Property(f => f.Message).IsRequired().HasMaxLength(2000);
            entity.Property(f => f.BrowserInfo).HasMaxLength(500);
            entity.Property(f => f.CreatedAt).HasMaxLength(50);
        });

        // ── UserCredit ────────────────────────────────────────────────────────
        modelBuilder.Entity<UserCredit>(entity =>
        {
            entity.ToTable("user_credits");
            entity.HasKey(c => c.Id);
            if (!isSqlite)
            {
                entity.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(c => c.UserId).IsRequired().HasMaxLength(100);
            entity.Property(c => c.Plan).IsRequired().HasMaxLength(50);
            entity.Property(c => c.Credits).IsRequired();
            entity.Property(c => c.PlanStartedAt).IsRequired();
            entity.Property(c => c.RenewsAt).IsRequired();

            entity.HasIndex(c => c.UserId).IsUnique();

            if (!isSqlite)
            {
                entity.Property(c => c.RowVersion).IsRowVersion();
            }

            entity.HasOne<User>()
                  .WithOne()
                  .HasForeignKey<UserCredit>(c => c.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── UserConnection ───────────────────────────────────────────────────
        modelBuilder.Entity<UserConnection>(entity =>
        {
            entity.ToTable("user_connections");
            entity.HasKey(c => c.Id);
            if (!isSqlite)
            {
                entity.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()::text");
            }
            entity.Property(c => c.SellerId).IsRequired().HasMaxLength(100);
            entity.Property(c => c.ManufacturerId).IsRequired().HasMaxLength(100);
            entity.Property(c => c.ConnectedAt).IsRequired();
            entity.HasIndex(c => new { c.SellerId, c.ManufacturerId }).IsUnique();
        });

        // ── EtsyConnection ───────────────────────────────────────────────────
        modelBuilder.Entity<EtsyConnection>(entity =>
        {
            entity.ToTable("etsy_connections");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasMaxLength(100);
            entity.Property(e => e.EtsyShopId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EtsyShopName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ApiKeyKeystring).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ApiKeySharedSecret).IsRequired().HasMaxLength(200);
            entity.Property(e => e.AccessToken).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.RefreshToken).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.TokenExpiresAt).IsRequired();
            entity.Property(e => e.WebhookSigningSecret).HasMaxLength(200);
            entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

            entity.HasOne<User>()
                  .WithOne()
                  .HasForeignKey<EtsyConnection>(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
