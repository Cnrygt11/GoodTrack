using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using GoodTrack.API.Models;
using GoodTrack.API.Abstractions.Repositories;
using GoodTrack.API.Abstractions.Services;
using GoodTrack.API.Infrastructure.Repositories;
using GoodTrack.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Password Hasher Registration
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// Register Repositories
builder.Services.AddScoped<IUserRepository, FirestoreUserRepository>();
builder.Services.AddScoped<IConnectionRequestRepository, FirestoreConnectionRequestRepository>();
builder.Services.AddScoped<IProductRepository, FirestoreProductRepository>();
builder.Services.AddScoped<ICatalogRepository, FirestoreCatalogRepository>();
builder.Services.AddScoped<IFieldRepository, FirestoreFieldRepository>();
builder.Services.AddScoped<IFeedbackRepository, FirestoreFeedbackRepository>();

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<IFieldService, FieldService>();
builder.Services.AddScoped<IImageStorageService, Base64ImageStorageService>();



// Firebase / Firestore Setup
var firebaseSection = builder.Configuration.GetSection("Firebase");
var projectId = firebaseSection["ProjectId"];
var credentialPath = firebaseSection["CredentialFilePath"];

if (string.IsNullOrEmpty(projectId) || projectId == "YOUR_FIREBASE_PROJECT_ID")
{
    throw new InvalidOperationException("FATAL: Firebase Project ID is not configured in appsettings.json. Please set 'Firebase:ProjectId'.");
}

// Register FirestoreDb
builder.Services.AddSingleton(sp =>
{
    var env = sp.GetRequiredService<IWebHostEnvironment>();
    
    // 1. Try environment variable FIREBASE_CREDENTIALS_JSON
    var envJson = Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_JSON");
    if (!string.IsNullOrEmpty(envJson))
    {
        try 
        {
            using var doc = System.Text.Json.JsonDocument.Parse(envJson);
            var email = doc.RootElement.GetProperty("client_email").GetString();
            Console.WriteLine($"[DEBUG] Requesting access for Service Account: {email}");
        } 
        catch { }

        Console.WriteLine("Attempting to initialize Firestore with credentials from environment variable (FIREBASE_CREDENTIALS_JSON)...");
        var credential = TryLoadCredentialFromJson(envJson, out var err);
        if (credential != null)
        {
            Console.WriteLine("Firestore initialized successfully using environment variable credentials.");
            Console.WriteLine($"[DEBUG] Loaded ProjectId: '{projectId}'");
            Console.WriteLine($"[DEBUG] Credential is UnderlyingType: {credential?.UnderlyingCredential?.GetType().Name}");
            return new FirestoreDbBuilder
            {
                ProjectId = projectId,
                Credential = credential
            }.Build();
        }
        else
        {
            Console.WriteLine($"WARNING: Failed to parse FIREBASE_CREDENTIALS_JSON environment variable. Error: {err}");
        }
    }

    // 2. Try file-based credentials
    var fullCredentialPath = Path.IsPathRooted(credentialPath) 
        ? credentialPath 
        : Path.Combine(env.ContentRootPath, credentialPath ?? "firebase-key.json");

    if (File.Exists(fullCredentialPath))
    {
        Console.WriteLine($"Attempting to initialize Firestore with credentials from file: {fullCredentialPath}");
        var fileContent = File.ReadAllText(fullCredentialPath);
        var credential = TryLoadCredentialFromJson(fileContent, out var err);
        if (credential != null)
        {
            Console.WriteLine($"Firestore initialized successfully using credentials from: {fullCredentialPath}");
            Console.WriteLine($"[DEBUG] Loaded ProjectId: '{projectId}'");
            Console.WriteLine($"[DEBUG] Credential is UnderlyingType: {credential?.UnderlyingCredential?.GetType().Name}");
            return new FirestoreDbBuilder
            {
                ProjectId = projectId,
                Credential = credential
            }.Build();
        }
        else
        {
            Console.WriteLine($"WARNING: Credentials file at {fullCredentialPath} could not be loaded. Error: {err}");
            Console.WriteLine("Attempting to fallback to Application Default Credentials (ADC).");
        }
    }
    else
    {
        Console.WriteLine($"Credentials file not found at: {fullCredentialPath}. Attempting to initialize Firestore Db with Application Default Credentials (ADC).");
    }

    // 3. Fallback to Application Default Credentials
    try
    {
        return FirestoreDb.Create(projectId);
    }
    catch (Exception ex)
    {
        throw new InvalidOperationException(
            $"FATAL: Failed to initialize FirestoreDb using service account file or Application Default Credentials (ADC). " +
            $"Please ensure a valid service account JSON file is placed at '{fullCredentialPath}' or set via 'FIREBASE_CREDENTIALS_JSON' env var. " +
            $"Inner Error: {ex.Message}", ex);
    }
});

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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
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

#region Helper Methods
static string SanitizePrivateKey(string rawKey)
{
    if (string.IsNullOrEmpty(rawKey)) return rawKey;

    // Replace escaped newlines
    var key = rawKey.Replace("\\n", "\n").Trim();

    // Normalize newlines
    key = key.Replace("\r\n", "\n").Replace("\r", "\n");

    // If it doesn't contain the header/footer, wrap it
    if (!key.Contains("-----BEGIN PRIVATE KEY-----"))
    {
        key = $"-----BEGIN PRIVATE KEY-----\n{key}\n-----END PRIVATE KEY-----\n";
    }
    else
    {
        // Ensure header and footer are separated by actual newlines
        if (!key.StartsWith("-----BEGIN PRIVATE KEY-----\n"))
        {
            key = key.Replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n");
        }
        if (!key.EndsWith("\n-----END PRIVATE KEY-----\n") && !key.EndsWith("\n-----END PRIVATE KEY-----"))
        {
            key = key.Replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----\n");
        }
    }

    // Clean up any double newlines
    while (key.Contains("\n\n"))
    {
        key = key.Replace("\n\n", "\n");
    }

    return key;
}

static Google.Apis.Auth.OAuth2.GoogleCredential? TryLoadCredentialFromJson(string jsonContent, out string? errorMessage)
{
    errorMessage = null;
    try
    {
        // Parse the JSON to inspect/sanitize the private key
        var jsonNode = System.Text.Json.Nodes.JsonNode.Parse(jsonContent);
        if (jsonNode == null)
        {
            errorMessage = "JSON content is empty or invalid.";
            return null;
        }

        var privateKeyNode = jsonNode["private_key"];
        if (privateKeyNode != null)
        {
            var rawKey = privateKeyNode.ToString();
            if (rawKey.Contains("YOUR_PRIVATE_KEY") || string.IsNullOrWhiteSpace(rawKey))
            {
                errorMessage = "Private key contains default placeholder values.";
                return null;
            }

            var sanitizedKey = SanitizePrivateKey(rawKey);
            jsonNode["private_key"] = sanitizedKey;
        }

        var projectIdNode = jsonNode["project_id"];
        if (projectIdNode != null && projectIdNode.ToString().Contains("YOUR_PROJECT_ID"))
        {
            errorMessage = "Project ID contains default placeholder values.";
            return null;
        }

        var updatedJson = jsonNode.ToJsonString(new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(updatedJson));
        
        return Google.Apis.Auth.OAuth2.CredentialFactory.FromStream<Google.Apis.Auth.OAuth2.ServiceAccountCredential>(stream)
            .ToGoogleCredential();
    }
    catch (Exception ex)
    {
        errorMessage = ex.Message;
        return null;
    }
}
#endregion

