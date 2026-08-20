using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using RamziWarehouse.Api.BackgroundServices;
using RamziWarehouse.Api.Extensions;
using RamziWarehouse.Api.Filters;
using RamziWarehouse.Api.Middlewares;
using RamziWarehouse.Api.Services;
using RamziWarehouse.Application;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Infrastructure;
using RamziWarehouse.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;

    options.ForwardLimit = 1;

    // API Docker şəbəkəsində yalnız reverse proxy arxasında
    // yayımlanacaq. API portu internetə birbaşa açılmayacaq.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddScoped<ValidationFilter>();

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<
    ICurrentUserService,
    CurrentUserService>();

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidationFilter>();
});

builder.Services.AddSwaggerDocumentation();

builder.Services.AddApplication();

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddJwtAuthentication(builder.Configuration);

builder.Services
    .AddHealthChecks()
    .AddDbContextCheck<AppDbContext>(
        name: "sql-server");

builder.Services.AddHostedService<
    DataRetentionBackgroundService>();

builder.Services.AddHostedService<
    TelegramOutboxBackgroundService>();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();

    if (dbContext.Database.IsRelational())
    {
        await dbContext.Database.MigrateAsync();
    }

    var seeder = scope.ServiceProvider
        .GetRequiredService<DatabaseSeeder>();

    await seeder.SeedAsync();
}

app.UseForwardedHeaders();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwaggerDocumentation();
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseAuthentication();

app.UseAuthorization();

app.MapHealthChecks("/health")
    .AllowAnonymous();

app.MapControllers();

app.Run();

public partial class Program;