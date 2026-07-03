using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Serilog;
using Serilog.Formatting.Compact;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.With<GoodTrack.API.Infrastructure.Logging.SensitiveDataMaskingEnricher>()
    .WriteTo.Console()
    .WriteTo.File(new RenderedCompactJsonFormatter(), "logs/goodtrack-.json", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    Log.Information("Starting GoodTrack.API...");

    var builder = WebApplication.CreateBuilder(args);

    // Integrate Serilog into ASP.NET Core host
    builder.Host.UseSerilog();

    // Add services to the container.
    builder.Services.AddControllers();
    builder.Services.AddOpenApi(options =>
    {
        options.AddDocumentTransformer((document, context, cancellationToken) =>
        {
            document.Components ??= new Microsoft.OpenApi.OpenApiComponents();
            
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

    // Password Hasher Registration
    builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

    // Database Configuration
    var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
        ?? builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException(
            "FATAL: Database connection string is not configured. " +
            "Set the 'DATABASE_URL' environment variable or 'ConnectionStrings:DefaultConnection' in appsettings.json.");

    var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(connectionString);
    dataSourceBuilder.EnableDynamicJson();
    var dataSource = dataSourceBuilder.Build();

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(dataSource, npgsqlOptions =>
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null))
               .UseSnakeCaseNamingConvention());

    // Register Repositories
    builder.Services.AddScoped<IUserRepository, PostgresUserRepository>();
    builder.Services.AddScoped<IConnectionRequestRepository, PostgresConnectionRequestRepository>();
    builder.Services.AddScoped<IUserConnectionRepository, PostgresUserConnectionRepository>();
    builder.Services.AddScoped<IProductRepository, PostgresProductRepository>();
    builder.Services.AddScoped<ICatalogRepository, PostgresCatalogRepository>();
    builder.Services.AddScoped<IFieldRepository, PostgresFieldRepository>();
    builder.Services.AddScoped<IFeedbackRepository, PostgresFeedbackRepository>();
    builder.Services.AddScoped<ICreditsRepository, CreditsRepository>();

    // Register Services
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IConnectionService, ConnectionService>();
    builder.Services.AddScoped<IProfileService, ProfileService>();
    builder.Services.AddScoped<IProductService, ProductService>();
    builder.Services.AddScoped<IOrderWorkflowService, OrderWorkflowService>();
    builder.Services.AddScoped<ICatalogService, CatalogService>();
    builder.Services.AddScoped<IFieldService, FieldService>();
    builder.Services.AddScoped<IImageStorageService, Base64ImageStorageService>();
    builder.Services.AddScoped<ICreditsService, CreditsService>();
    builder.Services.AddScoped<IEmailService, MailKitEmailService>();

    const string DefaultDevelopmentJwtKey = "GoodTrackProductionTrackingSystemSuperSecretKey2026!";

    // Configure JWT Authentication
    var jwtSection = builder.Configuration.GetSection("Jwt");
    // Prefer JWT_KEY env var for production security (Render.com env vars override appsettings)
    var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") ?? jwtSection["Key"];
    if (string.IsNullOrEmpty(jwtKey) || jwtKey == "YOUR_JWT_SECRET_KEY")
    {
        throw new InvalidOperationException("FATAL: JWT signing key is not configured. Set 'JWT_KEY' environment variable or 'Jwt:Key' in appsettings.json.");
    }

    // Ensure default development key is not used in production
    if (builder.Environment.IsProduction() && jwtKey == DefaultDevelopmentJwtKey)
    {
        throw new InvalidOperationException("FATAL: Default JWT signing key cannot be used in a production environment. Please set a secure 'Jwt:Key' via environment variable.");
    }

    var jwtIssuer = jwtSection["Issuer"] ?? "GoodTrack.API";
    var jwtAudience = jwtSection["Audience"] ?? "GoodTrack.Client";

    builder.Services.AddAuthentication(options =>
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

    builder.Services.AddAuthorization();

    // Configure Rate Limiting
    builder.Services.AddRateLimiter(options =>
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

    // Add SignalR Real-time communication services
    builder.Services.AddSignalR();
    builder.Services.AddHealthChecks();

    // Configure CORS whitelisting
    var allowedOriginsList = new List<string>();

    var configOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (configOrigins != null)
    {
        allowedOriginsList.AddRange(configOrigins);
    }

    var envOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
    if (builder.Environment.IsProduction() && string.IsNullOrEmpty(envOrigins))
    {
        throw new InvalidOperationException("FATAL: CORS allowed origins are not configured for Production. Please set the 'CORS_ALLOWED_ORIGINS' environment variable.");
    }

    if (!string.IsNullOrEmpty(envOrigins))
    {
        var split = envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        allowedOriginsList.AddRange(split);
    }

    var allowedOrigins = allowedOriginsList.Distinct().ToArray();

    builder.Services.AddCors(options =>
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

    var app = builder.Build();

    // 14. UseForwardedHeaders() middleware
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    });

    // 8. Security headers middleware (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
    app.Use(async (context, next) =>
    {
        context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss: ws:; frame-ancestors 'none';");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        if (!app.Environment.IsDevelopment())
        {
            context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        }

        await next();
    });

    // Enable Global Exception Handler Middleware early in the pipeline
    app.UseMiddleware<GoodTrack.API.Middlewares.ExceptionHandlingMiddleware>();

    // HTTP Request Logging Middleware
    app.UseMiddleware<GoodTrack.API.Middlewares.HttpLoggingMiddleware>();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseRouting();

    app.UseCors("AllowFrontend");

    // Add Serilog Request Logging middleware
    app.UseSerilogRequestLogging();

    app.UseAuthentication();
    app.UseAuthorization();

    app.UseRateLimiter();

    app.MapControllers();
    app.MapHealthChecks("/health");

    // Map SignalR Connections Hub
    app.MapHub<GoodTrack.API.Hubs.TrackingHub>("/hubs/tracking");

    // Serve static files from wwwroot (React build output)
    app.UseDefaultFiles();
    app.UseStaticFiles();

    // SPA fallback: serve index.html for all unmatched routes
    app.MapFallbackToFile("index.html");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "GoodTrack.API host terminated unexpectedly!");
}
finally
{
    Log.CloseAndFlush();
}
