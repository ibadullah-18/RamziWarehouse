using FluentValidation;

namespace GrandWall.Application.Features.Attendance.Dtos;

public sealed class AttendanceQueryDtoValidator
    : AbstractValidator<AttendanceQueryDto>
{
    public AttendanceQueryDtoValidator()
    {
        RuleFor(query => query.PageNumber)
            .GreaterThan(0)
            .WithMessage(
                "Səhifə nömrəsi sıfırdan böyük olmalıdır.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage(
                "Səhifədəki məlumat sayı 1–100 arasında olmalıdır.");

        RuleFor(query => query)
            .Must(query =>
                !query.FromDate.HasValue ||
                !query.ToDate.HasValue ||
                query.FromDate.Value <= query.ToDate.Value)
            .WithMessage(
                "Başlanğıc tarixi son tarixdən böyük ola bilməz.");
    }
}