using GrandWall.Application.Abstractions.Files;
using GrandWall.Application.Abstractions.Identity;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Application.Common.Files;
using GrandWall.Application.Features.Handovers;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Notifications.Push;
using GrandWall.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GrandWall.Infrastructure.Services;

/// <summary>
/// "Mal təhvil": the driver photographs the delivered goods (up to 10 photos), picks the
/// customer, adds a note and sends; users with "handovers.view" see each day's list and get a
/// notification. The driver sees and may fix or delete their own handovers.
/// </summary>
public sealed class HandoverService(
    AppDbContext db,
    ICurrentUserService user,
    IFileStorageService storage,
    PushNotificationQueue push,
    TimeProvider clock,
    ILogger<HandoverService> logger)
{
    private const long MaxPhotoBytes = 10 * 1024 * 1024;

    /// <summary>Business date in Baku (UTC+4), the same as the açot.</summary>
    public DateOnly Today => DateOnly.FromDateTime(clock.GetUtcNow().ToOffset(TimeSpan.FromHours(4)).DateTime);

    public async Task<HandoverDto> CreateAsync(Guid operationId, Guid customerId, string? note, IReadOnlyList<HandoverPhotoUpload> photos, CancellationToken ct)
    {
        Require(Permission.HandoversCreate);
        if (operationId == Guid.Empty) throw new ConflictException("Əməliyyat identifikatoru düzgün deyil.");

        // The same send repeated after a lost answer: give back what was stored the first time.
        var existing = await db.Handovers.AsNoTracking().Include(h => h.Photos).FirstOrDefaultAsync(h => h.OperationId == operationId, ct);
        if (existing is not null)
        {
            if (existing.CreatedByUserId != user.UserId) throw new ConflictException("Bu əməliyyat artıq istifadə olunub.");
            return Map(existing);
        }

        if (photos.Count is < 1 or > Handover.MaxPhotos) throw new ConflictException($"1–{Handover.MaxPhotos} şəkil göndərin.");
        if (photos.Any(p => p.Length is <= 0 or > MaxPhotoBytes)) throw new ConflictException("Hər şəkil 10 MB-dan kiçik olmalıdır.");
        if (photos.Any(p => !p.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))) throw new ConflictException("Yalnız şəkil göndərmək olar.");
        var cleanNote = CleanNote(note);
        var customer = await Customer(customerId, ct);

        var handover = new Handover
        {
            OperationId = operationId,
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            Note = cleanNote,
            BusinessDate = Today,
            CreatedByUserId = user.UserId,
            CreatedByFullName = user.FullName,
            CreatedAtUtc = clock.GetUtcNow().UtcDateTime,
        };

        var folder = $"{FileStorageFolders.Handover}/{handover.Id:N}";
        var stored = new List<string>();
        try
        {
            for (var index = 0; index < photos.Count; index++)
            {
                var photo = photos[index];
                var file = await storage.UploadImageAsync(new FileUploadRequest
                {
                    Content = photo.Content,
                    FileName = photo.FileName,
                    ContentType = photo.ContentType,
                    FileSizeBytes = photo.Length,
                }, folder, ct);
                stored.Add(file.PublicId);
                handover.Photos.Add(new HandoverPhoto
                {
                    HandoverId = handover.Id,
                    SortOrder = index,
                    StoragePublicId = file.PublicId,
                    ContentType = file.ContentType,
                    FileSizeBytes = file.FileSizeBytes,
                });
            }

            db.Handovers.Add(handover);
            await push.EnqueueHandoverAsync(handover, ct);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            // Nothing half-saved: remove the photos that already reached the storage.
            foreach (var publicId in stored)
            {
                try { await storage.DeleteImageAsync(publicId, CancellationToken.None); }
                catch (Exception exception) { logger.LogWarning(exception, "Handover photo cleanup failed."); }
            }
            throw;
        }

        return Map(handover);
    }

    /// <summary>A day's handovers: everyone's ("handovers.view") or only the signed-in user's.</summary>
    public async Task<HandoverDayDto> GetDayAsync(DateOnly? date, bool mine, CancellationToken ct)
    {
        if (mine) RequireAny(Permission.HandoversCreate, Permission.HandoversView);
        else Require(Permission.HandoversView);
        var day = date ?? Today;
        if (day > Today) throw new ConflictException("Gələcək tarix üçün təhvil yoxdur.");

        var query = db.Handovers.AsNoTracking().Include(h => h.Photos).Where(h => h.BusinessDate == day && !h.IsDeleted);
        if (mine) query = query.Where(h => h.CreatedByUserId == user.UserId);
        var items = await query.OrderByDescending(h => h.CreatedAtUtc).ToListAsync(ct);
        return new HandoverDayDto { Date = day, IsToday = day == Today, Items = items.Select(Map).ToList() };
    }

    public async Task<HandoverDto> GetAsync(Guid id, CancellationToken ct) => Map(await Visible(id, ct));

    public async Task<StoredFileContentDto> PhotoAsync(Guid id, Guid photoId, bool thumbnail, CancellationToken ct)
    {
        var handover = await Visible(id, ct);
        var photo = handover.Photos.FirstOrDefault(p => p.Id == photoId) ?? throw new NotFoundException("Şəkil tapılmadı.");
        return thumbnail
            ? await storage.DownloadThumbnailAsync(photo.StoragePublicId, ct)
            : await storage.DownloadImageAsync(photo.StoragePublicId, ct);
    }

    /// <summary>The sender fixes a wrong customer or note (no reason needed).</summary>
    public async Task<HandoverDto> UpdateAsync(Guid id, UpdateHandoverRequest request, CancellationToken ct)
    {
        var handover = await Editable(id, ct);
        var customer = await Customer(request.CustomerId, ct);
        handover.CustomerId = customer.Id;
        handover.CustomerName = customer.Name;
        handover.Note = CleanNote(request.Note);
        handover.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
        return Map(handover);
    }

    /// <summary>The sender removes a handover sent by mistake (no reason needed).</summary>
    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var handover = await Editable(id, ct);
        handover.IsDeleted = true;
        handover.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
    }

    private bool MayEdit(Handover handover) => handover.CreatedByUserId == user.UserId || user.Role == UserRole.Admin;

    private async Task<Handover> Visible(Guid id, CancellationToken ct)
    {
        var handover = await db.Handovers.AsNoTracking().Include(h => h.Photos).FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted, ct)
            ?? throw new NotFoundException("Təhvil tapılmadı.");
        if (handover.CreatedByUserId != user.UserId && !user.Has(Permission.HandoversView))
            throw new ForbiddenException("Bu təhvilə baxmaq icazəniz yoxdur.");
        return handover;
    }

    private async Task<Handover> Editable(Guid id, CancellationToken ct)
    {
        var handover = await db.Handovers.Include(h => h.Photos).FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted, ct)
            ?? throw new NotFoundException("Təhvil tapılmadı.");
        if (!MayEdit(handover)) throw new ForbiddenException("Yalnız təhvili göndərən dəyişə və silə bilər.");
        return handover;
    }

    private async Task<Customer> Customer(Guid id, CancellationToken ct)
        => await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct)
            ?? throw new ConflictException("Müştəri seçin.");

    private static string? CleanNote(string? note)
    {
        var text = note?.Trim();
        if (string.IsNullOrEmpty(text)) return null;
        if (text.Length > Handover.MaxNoteLength) throw new ConflictException($"Qeyd {Handover.MaxNoteLength} simvoldan çox ola bilməz.");
        return text;
    }

    private void Require(string permission)
    {
        if (!user.Has(permission)) throw new ForbiddenException("Bu əməliyyat üçün icazəniz yoxdur.");
    }

    private void RequireAny(params string[] permissions)
    {
        if (!permissions.Any(user.Has)) throw new ForbiddenException("Bu əməliyyat üçün icazəniz yoxdur.");
    }

    private HandoverDto Map(Handover h) => new()
    {
        Id = h.Id,
        CustomerId = h.CustomerId,
        CustomerName = h.CustomerName,
        Note = h.Note,
        BusinessDate = h.BusinessDate,
        CreatedByUserId = h.CreatedByUserId,
        CreatedByFullName = h.CreatedByFullName,
        CreatedAtUtc = h.CreatedAtUtc,
        UpdatedAtUtc = h.UpdatedAtUtc,
        Photos = h.Photos.OrderBy(p => p.SortOrder).Select(p => new HandoverPhotoDto { Id = p.Id }).ToList(),
        CanEdit = MayEdit(h),
    };
}
