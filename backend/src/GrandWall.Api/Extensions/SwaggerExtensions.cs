using Microsoft.OpenApi;

namespace GrandWall.Api.Extensions;

public static class SwaggerExtensions
{
    public static IServiceCollection AddSwaggerDocumentation(
        this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc(
                "v1",
                new OpenApiInfo
                {
                    Title = "GrandWall API",
                    Version = "v1",
                    Description =
                        "GrandWall mobil tətbiqinin API-si"
                });

            options.AddSecurityDefinition(
                "bearer",
                new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description =
                        "Login-dən gələn accessToken dəyərini yazın."
                });

            options.AddSecurityRequirement(
                document => new OpenApiSecurityRequirement
                {
                    [
                        new OpenApiSecuritySchemeReference(
                            "bearer",
                            document)
                    ] = []
                });
        });

        return services;
    }

    public static WebApplication UseSwaggerDocumentation(
        this WebApplication app)
    {
        app.UseSwagger();

        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint(
                "/swagger/v1/swagger.json",
                "GrandWall API v1");

            options.RoutePrefix = "swagger";
            options.DocumentTitle = "GrandWall API";
            options.DisplayRequestDuration();
        });

        return app;
    }
}