using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Models;
using GoodTrack.API.Services;
using GoodTrack.API.Services.Etsy;

namespace GoodTrack.API.Configuration;

/// <summary>
/// Program.cs'i sade tutmak için servis kayıtlarını konuya göre gruplayan extension'lar.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>OpenAPI/Swagger + JWT Bearer güvenlik şeması.</summary>
    public static IServiceCollection AddOpenApiWithBearerAuth(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, context, cancellationToken) =>
            {
                document.Components ??= new Microsoft.OpenApi.OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, Microsoft.OpenApi.IOpenApiSecurityScheme>();

                var scheme = new Microsoft.OpenApi.OpenApiSecurityScheme
                {
                    Type = Microsoft.OpenApi.SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"bearer {token}\""
                };

                document.Components.SecuritySchemes.Add("Bearer", scheme);

                var requirement = new Microsoft.OpenApi.OpenApiSecurityRequirement
                {
                    [new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
                };

                document.Security = new List<Microsoft.OpenApi.OpenApiSecurityRequirement> { requirement };

                return Task.CompletedTask;
            });
        });

        return services;
    }

    /// <summary>Npgsql DbContext + tüm repository kayıtları.</summary>
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "FATAL: Database connection string is not configured. " +
                "Set the 'DATABASE_URL' environment variable or 'ConnectionStrings:DefaultConnection' in configuration.");

        var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(connectionString);
        dataSourceBuilder.EnableDynamicJson();
        var dataSource = dataSourceBuilder.Build();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(dataSource, npgsqlOptions =>
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null))
                   .UseSnakeCaseNamingConvention());

        services.AddScoped<IUserRepository, PostgresUserRepository>();
        services.AddScoped<IConnectionRequestRepository, PostgresConnectionRequestRepository>();
        services.AddScoped<IUserConnectionRepository, PostgresUserConnectionRepository>();
        services.AddScoped<IProductRepository, PostgresProductRepository>();
        services.AddScoped<ICatalogRepository, PostgresCatalogRepository>();
        services.AddScoped<IFieldRepository, PostgresFieldRepository>();
        services.AddScoped<IFeedbackRepository, PostgresFeedbackRepository>();
        services.AddScoped<ICreditsRepository, PostgresCreditsRepository>();
        services.AddScoped<IEtsyConnectionRepository, PostgresEtsyConnectionRepository>();
        services.AddScoped<IEtsyOAuthStateRepository, PostgresEtsyOAuthStateRepository>();

        // Etsy token/secret'larının at-rest şifrelenmesi için Data Protection.
        // Anahtar halkası veritabanında (data_protection_keys) kalıcı tutulur:
        // yeniden başlatma ve çok-instance dağıtım arasında aynı anahtarlar kullanılır,
        // böylece şifreli token'lar her koşulda çözülebilir. SetApplicationName tüm
        // instance'ların aynı halkayı paylaşması için sabittir.
        //
        // Not: Anahtarlar DB'de default olarak korumasız (XML) durur — DB'ye erişebilen
        // zaten şifreli verilere de erişebileceğinden bu kabul edilebilir. Daha ileri
        // koruma için ProtectKeysWithCertificate (sertifika altyapısı gerekir) eklenebilir.
        services.AddDataProtection()
            .PersistKeysToDbContext<AppDbContext>()
            .SetApplicationName("GoodTrack");

        return services;
    }

    /// <summary>Uygulama (domain) servisleri + Etsy typed HttpClient.</summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IConnectionService, ConnectionService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IOrderWorkflowService, OrderWorkflowService>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<IFieldService, FieldService>();
        services.AddScoped<IImageStorageService, Base64ImageStorageService>();
        services.AddScoped<IImageCleanupService, ImageCleanupService>();
        services.AddScoped<IJobLock, PostgresAdvisoryJobLock>();
        services.AddScoped<ICreditsService, CreditsService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<INotificationService, SignalRNotificationService>();
        services.AddScoped<IEmailService, MailKitEmailService>();

        // Etsy integration: typed HttpClient + OAuth + orchestration service.
        // Outbound throttle + 429/5xx retry katmanı (Etsy 10 QPS / 10k QPD limitine uyum).
        services.AddTransient<EtsyRateLimitingHandler>();
        services.AddHttpClient<IEtsyApiClient, EtsyApiClient>(client =>
        {
            client.BaseAddress = new Uri("https://api.etsy.com/");
        })
        .AddHttpMessageHandler<EtsyRateLimitingHandler>();
        services.AddScoped<IEtsyOAuthService, EtsyOAuthService>();
        services.AddScoped<IEtsyService, EtsyService>();

        // Arşivlenen siparişleri 30 gün sonra "başkalaştıran" (görseller + müşteri PII temizliği,
        // minimum veriyle süresiz saklama) arka plan job'ı. Hata görsellerini de kapsar.
        services.AddHostedService<ArchivedOrderRetentionService>();

        // Eski audit log kayıtlarını retention süresi sonrası temizleyen arka plan job'ı.
        services.AddHostedService<AuditLogRetentionService>();

        return services;
    }

    /// <summary>JWT Bearer authentication. Anahtar env/user-secrets'tan okunur ve doğrulanır.</summary>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var jwtSection = configuration.GetSection("Jwt");
        // Prefer JWT_KEY env var for production security (Render.com env vars override appsettings).
        // In Development the key is read from user-secrets / appsettings; no secret is hardcoded in source.
        var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") ?? jwtSection["Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey == "YOUR_JWT_SECRET_KEY")
        {
            throw new InvalidOperationException(
                "FATAL: JWT signing key is not configured. Set the 'JWT_KEY' environment variable, " +
                "or configure 'Jwt:Key' via user-secrets (development) / environment variables (production).");
        }

        // Enforce a minimum key strength in production instead of comparing against a hardcoded default.
        if (environment.IsProduction() && jwtKey.Length < 32)
        {
            throw new InvalidOperationException(
                "FATAL: JWT signing key is too weak for production. Provide a key of at least 32 characters via the 'JWT_KEY' environment variable.");
        }

        var jwtIssuer = jwtSection["Issuer"] ?? "GoodTrack.API";
        var jwtAudience = jwtSection["Audience"] ?? "GoodTrack.Client";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ClockSkew = TimeSpan.Zero
            };

            // Extract authorization token from query string parameter for WebSocket handshakes
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization();

        return services;
    }

    /// <summary>IP başına fixed-window rate limiting politikaları.</summary>
    public static IServiceCollection AddRateLimitingPolicies(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = 429;

            options.AddPolicy("auth-strict", httpContext =>
            {
                var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString();
                return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
            });

            options.AddPolicy("api-general", httpContext =>
            {
                var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString();
                return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 60,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
            });
        });

        return services;
    }

    /// <summary>"AllowFrontend" CORS politikası (config + env whitelist).</summary>
    public static IServiceCollection AddCorsPolicies(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var allowedOriginsList = new List<string>();

        var configOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (configOrigins != null)
        {
            allowedOriginsList.AddRange(configOrigins);
        }

        var envOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
        if (environment.IsProduction() && string.IsNullOrEmpty(envOrigins))
        {
            throw new InvalidOperationException("FATAL: CORS allowed origins are not configured for Production. Please set the 'CORS_ALLOWED_ORIGINS' environment variable.");
        }

        if (!string.IsNullOrEmpty(envOrigins))
        {
            var split = envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            allowedOriginsList.AddRange(split);
        }

        var allowedOrigins = allowedOriginsList.Distinct().ToArray();

        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                if (allowedOrigins.Length > 0)
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                }
                else
                {
                    policy.SetIsOriginAllowed(origin =>
                    {
                        if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                        {
                            return uri.Host == "localhost" || uri.Host == "127.0.0.1";
                        }
                        return false;
                    })
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
                }
            });
        });

        return services;
    }
}
