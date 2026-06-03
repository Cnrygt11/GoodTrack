using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<IFieldService, FieldService>();
builder.Services.AddScoped<IImageStorageService, LocalImageStorageService>();



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
    
    // Resolve credentials path
    var fullCredentialPath = Path.IsPathRooted(credentialPath) 
        ? credentialPath 
        : Path.Combine(env.ContentRootPath, credentialPath ?? "firebase-key.json");

    if (File.Exists(fullCredentialPath))
    {
        Console.WriteLine($"Initializing Firestore with service account credentials from: {fullCredentialPath}");
        var credential = Google.Apis.Auth.OAuth2.CredentialFactory.FromFile<Google.Apis.Auth.OAuth2.ServiceAccountCredential>(fullCredentialPath)
            .ToGoogleCredential();
        return new FirestoreDbBuilder
        {
            ProjectId = projectId,
            Credential = credential
        }.Build();
    }
    else
    {
        Console.WriteLine($"Credentials file not found at: {fullCredentialPath}. Attempting to initialize Firestore Db with default credentials.");
        return FirestoreDb.Create(projectId);
    }
});

// Configure JWT Authentication
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"];
if (string.IsNullOrEmpty(jwtKey) || jwtKey == "YOUR_JWT_SECRET_KEY")
{
    throw new InvalidOperationException("FATAL: JWT signing key is not configured in appsettings.json. Please set 'Jwt:Key'.");
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

// Add SignalR Real-time communication services
builder.Services.AddSignalR();

var app = builder.Build();

// Enable Global Exception Handler Middleware early in the pipeline
app.UseMiddleware<GoodTrack.API.Middlewares.ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Enable default files (index.html) and static files serving from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR Connections Hub
app.MapHub<GoodTrack.API.Hubs.TrackingHub>("/hubs/tracking");

app.Run();
