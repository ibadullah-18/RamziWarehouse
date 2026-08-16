using Microsoft.EntityFrameworkCore;
using RamziWarehouse.Application.Abstractions.Attendance;
using RamziWarehouse.Application.Abstractions.Identity;
using RamziWarehouse.Application.Abstractions.Notifications;
using RamziWarehouse.Application.Common.Exceptions;
using RamziWarehouse.Application.Common.Models;
using RamziWarehouse.Application.Common.Notifications;
using RamziWarehouse.Application.Features.Attendance.Dtos;
using RamziWarehouse.Domain.Entities;
using RamziWarehouse.Infrastructure.Notifications.Telegram.Formatting;
using RamziWarehouse.Infrastructure.Persistence;

namespace RamziWarehouse.Infrastructure.Services;

public sealed class AttendanceService : IAttendanceService
{
    private static readonly TimeZoneInfo BakuTimeZone =
        ResolveBakuTimeZone();

    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITelegramOutboxService _telegramOutboxService;
    private readonly TimeProvider _timeProvider;

    public AttendanceService(
        AppDbContext dbContext,
        ICurrentUserService currentUserService,
        ITelegramOutboxService telegramOutboxService,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _telegramOutboxService = telegramOutboxService;
        _timeProvider = timeProvider;
    }

    public async Task<PagedResultDto<AttendanceRecordDto>>
        GetAllAsync(
            AttendanceQueryDto query,
            CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var records = _dbContext.AttendanceRecords
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();

            records = records.Where(record =>
                record.User.FullName.Contains(search) ||
                record.User.Username.Contains(search));
        }

        if (query.UserId.HasValue)
        {
            records = records.Where(record =>
                record.UserId == query.UserId.Value);
        }

        if (query.FromDate.HasValue)
        {
            records = records.Where(record =>
                record.WorkDate >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            records = records.Where(record =>
                record.WorkDate <= query.ToDate.Value);
        }

        var totalCount =
            await records.CountAsync(cancellationToken);

        var items = await records
            .OrderByDescending(record => record.WorkDate)
            .ThenByDescending(record =>
                record.CheckedInAtUtc)
            .Skip(
                (query.PageNumber - 1) *
                query.PageSize)
            .Take(query.PageSize)
            .Select(record => new AttendanceRecordDto
            {
                Id = record.Id,
                UserId = record.UserId,
                UserFullName = record.User.FullName,
                WorkDate = record.WorkDate,
                CheckedInAtUtc =
                    record.CheckedInAtUtc,
                CheckedOutAtUtc =
                    record.CheckedOutAtUtc,
                CompletedAtUtc =
                    record.CompletedAtUtc,
                DeleteAfterUtc =
                    record.DeleteAfterUtc
            })
            .ToListAsync(cancellationToken);

        return new PagedResultDto<AttendanceRecordDto>
        {
            Items = items,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<AttendanceRecordDto?> GetMyTodayAsync(
        CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var utcNow =
            _timeProvider.GetUtcNow().UtcDateTime;

        var workDate = GetBakuDate(utcNow);

        return await _dbContext.AttendanceRecords
            .AsNoTracking()
            .Where(record =>
                record.UserId ==
                    _currentUserService.UserId &&
                record.WorkDate == workDate)
            .Select(record => new AttendanceRecordDto
            {
                Id = record.Id,
                UserId = record.UserId,
                UserFullName = record.User.FullName,
                WorkDate = record.WorkDate,
                CheckedInAtUtc =
                    record.CheckedInAtUtc,
                CheckedOutAtUtc =
                    record.CheckedOutAtUtc,
                CompletedAtUtc =
                    record.CompletedAtUtc,
                DeleteAfterUtc =
                    record.DeleteAfterUtc
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<AttendanceRecordDto> CheckInAsync(
        CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var currentUserId =
            _currentUserService.UserId;

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                currentUser =>
                    currentUser.Id == currentUserId &&
                    currentUser.IsActive,
                cancellationToken);

        if (user is null)
        {
            throw new ForbiddenException(
                "Aktiv istifadəçi hesabı tapılmadı.");
        }

        var hasOpenRecord =
            await _dbContext.AttendanceRecords
                .AnyAsync(
                    record =>
                        record.UserId == currentUserId &&
                        !record.CheckedOutAtUtc.HasValue,
                    cancellationToken);

        if (hasOpenRecord)
        {
            throw new ConflictException(
                "Sizin artıq açıq işə giriş qeydiniz var.");
        }

        var utcNow =
            _timeProvider.GetUtcNow().UtcDateTime;

        var workDate = GetBakuDate(utcNow);

        var todayRecordExists =
            await _dbContext.AttendanceRecords
                .AnyAsync(
                    record =>
                        record.UserId == currentUserId &&
                        record.WorkDate == workDate,
                    cancellationToken);

        if (todayRecordExists)
        {
            throw new ConflictException(
                "Bu gün üçün işə giriş artıq qeydə alınıb.");
        }

        var attendanceRecord = new AttendanceRecord
        {
            UserId = currentUserId,
            User = user,
            WorkDate = workDate,
            CheckedInAtUtc = utcNow
        };

        _dbContext.AttendanceRecords.Add(
            attendanceRecord);

        var message =
            AttendanceTelegramMessageBuilder.BuildCheckIn(
                user.FullName,
                workDate,
                utcNow);

        await _telegramOutboxService.EnqueueAsync(
            TelegramChannel.Attendance,
            message,
            TelegramRelatedEntityTypes.Attendance,
            attendanceRecord.Id,
            photos: null,
            cancellationToken);

        try
        {
            await _dbContext.SaveChangesAsync(
                cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException(
                "Bu gün üçün işə giriş artıq qeydə alınıb.");
        }

        return MapToDto(
            attendanceRecord,
            user.FullName);
    }

    public async Task<AttendanceRecordDto> CheckOutAsync(
        CancellationToken cancellationToken = default)
    {
        EnsureAuthenticated();

        var currentUserId =
            _currentUserService.UserId;

        var attendanceRecord =
            await _dbContext.AttendanceRecords
                .Include(record => record.User)
                .Where(record =>
                    record.UserId == currentUserId &&
                    !record.CheckedOutAtUtc.HasValue)
                .OrderByDescending(record =>
                    record.CheckedInAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

        if (attendanceRecord is null)
        {
            throw new ConflictException(
                "Açıq işə giriş qeydiniz tapılmadı.");
        }

        var utcNow =
            _timeProvider.GetUtcNow().UtcDateTime;

        attendanceRecord.CheckOut(utcNow);

        var message =
            AttendanceTelegramMessageBuilder.BuildCheckOut(
                attendanceRecord.User.FullName,
                attendanceRecord.WorkDate,
                attendanceRecord.CheckedInAtUtc,
                utcNow);

        await _telegramOutboxService.EnqueueAsync(
            TelegramChannel.Attendance,
            message,
            TelegramRelatedEntityTypes.Attendance,
            attendanceRecord.Id,
            photos: null,
            cancellationToken);

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return MapToDto(
            attendanceRecord,
            attendanceRecord.User.FullName);
    }

    private void EnsureAuthenticated()
    {
        if (!_currentUserService.IsAuthenticated)
        {
            throw new ForbiddenException(
                "Bu əməliyyat üçün sistemə daxil olmalısınız.");
        }
    }

    private static AttendanceRecordDto MapToDto(
        AttendanceRecord record,
        string userFullName)
    {
        return new AttendanceRecordDto
        {
            Id = record.Id,
            UserId = record.UserId,
            UserFullName = userFullName,
            WorkDate = record.WorkDate,
            CheckedInAtUtc =
                record.CheckedInAtUtc,
            CheckedOutAtUtc =
                record.CheckedOutAtUtc,
            CompletedAtUtc =
                record.CompletedAtUtc,
            DeleteAfterUtc =
                record.DeleteAfterUtc
        };
    }

    private static DateOnly GetBakuDate(
        DateTime utcDateTime)
    {
        var normalizedUtc = DateTime.SpecifyKind(
            utcDateTime,
            DateTimeKind.Utc);

        var bakuDateTime =
            TimeZoneInfo.ConvertTimeFromUtc(
                normalizedUtc,
                BakuTimeZone);

        return DateOnly.FromDateTime(
            bakuDateTime);
    }

    private static TimeZoneInfo ResolveBakuTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Asia/Baku");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Azerbaijan Standard Time");
        }
    }
}