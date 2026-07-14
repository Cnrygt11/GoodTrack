using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using FluentValidation.AspNetCore;
using Serilog;
using Serilog.Formatting.Compact;
using GoodTrack.API.Configuration;
using GoodTrack.API.DTOs.Common;
using GoodTrack.API.Validators;

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

    // ── Service registration ────────────────────────────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddHttpContextAccessor();

    // FluentValidation
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<FeedbackInputDtoValidator>();

    // Return model-validation failures in the same ApiResponse shape as the rest of the
    // API (so the frontend's { success:false, message } envelope handling recognizes them),
    // instead of ASP.NET's default ProblemDetails.
    builder.Services.Configure<ApiBehaviorOptions>(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var message = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault(m => !string.IsNullOrWhiteSpace(m)) ?? "Geçersiz istek.";
            return new BadRequestObjectResult(ApiResponse.Fail(message));
        };
    });

    builder.Services.AddOpenApiWithBearerAuth();

    builder.Services.AddPersistence(builder.Configuration);
    builder.Services.AddApplicationServices();
    builder.Services.AddJwtAuthentication(builder.Configuration, builder.Environment);
    builder.Services.AddRateLimitingPolicies();
    builder.Services.AddCorsPolicies(builder.Configuration, builder.Environment);

    builder.Services.AddSignalR();

    // /health veritabanı erişilebilirliğini de doğrular: DB düşükken instance "Unhealthy"
    // raporlar ve platform (Render) 500'ler servis etmek yerine sağlıksız işaretler.
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<GoodTrack.API.Infrastructure.AppDbContext>("database");

    var app = builder.Build();

    // ── HTTP request pipeline ───────────────────────────────────────────────
    // Render'ın reverse proxy'si arkasında X-Forwarded-For ancak proxy güvenilir listedeyken
    // işlenir; varsayılan liste yalnız loopback'i içerdiğinden ve Render proxy IP'leri sabit
    // olmadığından güven listeleri temizlenir. ForwardLimit=1 ile yalnız en yakın proxy hop'una
    // güvenilir: istemcinin sahte X-Forwarded-For zinciri ekleyerek gerçek IP'sini gizlemesi
    // engellenir (rate limiting gerçek istemci IP'sine dayanır). ASPNETCORE_FORWARDEDHEADERS_ENABLED
    // env var'ı bilinçli olarak kullanılmıyor: örtük davranış yerine repo'da görünür yapılandırma.
    var forwardedHeadersOptions = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
        ForwardLimit = 1
    };
    forwardedHeadersOptions.KnownIPNetworks.Clear();
    forwardedHeadersOptions.KnownProxies.Clear();
    app.UseForwardedHeaders(forwardedHeadersOptions);

    app.UseMiddleware<GoodTrack.API.Middlewares.SecurityHeadersMiddleware>();
    app.UseMiddleware<GoodTrack.API.Middlewares.ExceptionHandlingMiddleware>();
    app.UseMiddleware<GoodTrack.API.Middlewares.HttpLoggingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseRouting();
    app.UseCors("AllowFrontend");
    app.UseSerilogRequestLogging();
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseRateLimiter();

    app.MapControllers();
    app.MapHealthChecks("/health");
    app.MapHub<GoodTrack.API.Hubs.TrackingHub>("/hubs/tracking");

    // Serve the SPA (React build output) from wwwroot with client-side routing fallback
    app.UseDefaultFiles();
    app.UseStaticFiles();
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
