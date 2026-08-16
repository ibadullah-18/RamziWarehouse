using RamziWarehouse.Api.Extensions;
using RamziWarehouse.Api.Filters;
using RamziWarehouse.Api.Middlewares;
using RamziWarehouse.Application;
using RamziWarehouse.Infrastructure;
using RamziWarehouse.Infrastructure.Persistence;
using RamziWarehouse.Api.Services;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Api.BackgroundServices;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddHostedService<
    DataRetentionBackgroundService>();
builder.Services.AddHostedService<
    TelegramOutboxBackgroundService>();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var seeder = scope.ServiceProvider
        .GetRequiredService<DatabaseSeeder>();

    await seeder.SeedAsync();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwaggerDocumentation();
}
app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
public partial class Program;