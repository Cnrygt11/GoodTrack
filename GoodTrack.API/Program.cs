using Microsoft.AspNetCore.HttpOverrides;
using FluentValidation;
using FluentValidation.AspNetCore;
using Serilog;
using Serilog.Formatting.Compact;
using GoodTrack.API.Configuration;
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

    builder.Services.AddOpenApiWithBearerAuth();

    builder.Services.AddPersistence(builder.Configuration);
    builder.Services.AddApplicationServices();
    builder.Services.AddJwtAuthentication(builder.Configuration, builder.Environment);
    builder.Services.AddRateLimitingPolicies();
    builder.Services.AddCorsPolicies(builder.Configuration, builder.Environment);

    builder.Services.AddSignalR();
    builder.Services.AddHealthChecks();

    var app = builder.Build();

    // ── HTTP request pipeline ───────────────────────────────────────────────
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    });

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
