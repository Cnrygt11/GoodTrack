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

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

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
    options.UseNpgsql(dataSource)
           .UseSnakeCaseNamingConvention());

// Register Repositories
builder.Services.AddScoped<IUserRepository, PostgresUserRepository>();
builder.Services.AddScoped<IConnectionRequestRepository, PostgresConnectionRequestRepository>();
builder.Services.AddScoped<IProductRepository, PostgresProductRepository>();
builder.Services.AddScoped<ICatalogRepository, PostgresCatalogRepository>();
builder.Services.AddScoped<IFieldRepository, PostgresFieldRepository>();
builder.Services.AddScoped<IFeedbackRepository, PostgresFeedbackRepository>();

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<IFieldService, FieldService>();
builder.Services.AddScoped<IImageStorageService, Base64ImageStorageService>();

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
// "auth-strict": login/register/password endpoints — 5 requests per minute per IP
// "api-general": all other authenticated endpoints — 60 requests per minute per IP
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;

    options.AddFixedWindowLimiter("auth-strict", cfg =>
    {
        cfg.PermitLimit = 5;
        cfg.Window = TimeSpan.FromMinutes(1);
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        cfg.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("api-general", cfg =>
    {
        cfg.PermitLimit = 60;
        cfg.Window = TimeSpan.FromMinutes(1);
        cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        cfg.QueueLimit = 0;
    });
});

// Add SignalR Real-time communication services
builder.Services.AddSignalR();

// Configure CORS whitelisting
var allowedOriginsList = new List<string>();

var configOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (configOrigins != null)
{
    allowedOriginsList.AddRange(configOrigins);
}

var envOrigins = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
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
            // Fallback for development: only allow localhost/127.0.0.1 origins
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

// Enable Global Exception Handler Middleware early in the pipeline
app.UseMiddleware<GoodTrack.API.Middlewares.ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

app.MapControllers();

// Map SignalR Connections Hub
app.MapHub<GoodTrack.API.Hubs.TrackingHub>("/hubs/tracking");

// Serve static files from wwwroot (React build output)
app.UseDefaultFiles();
app.UseStaticFiles();

// SPA fallback: serve index.html for all unmatched routes (API controllers are matched first above)
app.MapFallbackToFile("index.html");

app.Run();

