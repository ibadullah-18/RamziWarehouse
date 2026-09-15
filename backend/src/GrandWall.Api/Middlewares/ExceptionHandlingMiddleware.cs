using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using GrandWall.Application.Common.Exceptions;

namespace GrandWall.Api.Middlewares;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(
        HttpContext context,
        Exception exception)
    {
        var (statusCode, title) = exception switch
        {
            ValidationException =>
                (StatusCodes.Status400BadRequest, "Validation xətası"),

            UnauthorizedException =>
                (StatusCodes.Status401Unauthorized, "Giriş xətası"),

            ForbiddenException =>
                (StatusCodes.Status403Forbidden, "İcazə yoxdur"),

            NotFoundException =>
                (StatusCodes.Status404NotFound, "Məlumat tapılmadı"),

            ConflictException =>
                (StatusCodes.Status409Conflict, "Məlumat ziddiyyəti"),

            InvalidOperationException =>
                (StatusCodes.Status409Conflict, "Əməliyyat mümkün deyil"),

            _ => (
                StatusCodes.Status500InternalServerError,
                "Server xətası")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(
                exception,
                "An unexpected server error occurred.");
        }
        else
        {
            _logger.LogWarning(
                exception,
                "A handled application error occurred.");
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = statusCode ==
                     StatusCodes.Status500InternalServerError
                ? "Gözlənilməz server xətası baş verdi."
                : exception.Message,
            Instance = context.Request.Path
        };

        problemDetails.Extensions["traceId"] =
            context.TraceIdentifier;

        if (exception is ValidationException validationException)
        {
            var errors = validationException.Errors
                .GroupBy(error => error.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group
                        .Select(error => error.ErrorMessage)
                        .Distinct()
                        .ToArray());

            problemDetails.Extensions["errors"] = errors;
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(
            problemDetails,
            context.RequestAborted);
    }
}