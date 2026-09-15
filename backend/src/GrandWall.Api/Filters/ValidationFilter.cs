using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GrandWall.Api.Filters;

public sealed class ValidationFilter : IAsyncActionFilter
{
    private readonly IServiceProvider _serviceProvider;

    public ValidationFilter(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var failures = new List<ValidationFailure>();

        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null)
            {
                continue;
            }

            var argumentType = argument.GetType();

            var validatorType = typeof(IValidator<>)
                .MakeGenericType(argumentType);

            if (_serviceProvider.GetService(validatorType)
                is not IValidator validator)
            {
                continue;
            }

            var validationContextType = typeof(ValidationContext<>)
                .MakeGenericType(argumentType);

            var validationContext = (IValidationContext)Activator
                .CreateInstance(validationContextType, argument)!;

            var validationResult = await validator.ValidateAsync(
                validationContext,
                context.HttpContext.RequestAborted);

            failures.AddRange(validationResult.Errors);
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        await next();
    }
}