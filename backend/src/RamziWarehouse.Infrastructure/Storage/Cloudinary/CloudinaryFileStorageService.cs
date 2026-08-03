using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using RamziWarehouse.Application.Abstractions.Files;
using RamziWarehouse.Application.Common.Files;

namespace RamziWarehouse.Infrastructure.Storage.Cloudinary;

public sealed class CloudinaryFileStorageService : IFileStorageService
{
    private const long MaxImageFileSizeBytes = 10 * 1024 * 1024;
    private static readonly HttpClient ImageDownloadClient = new()
    {
        Timeout = TimeSpan.FromSeconds(30),
        MaxResponseContentBufferSize = MaxImageFileSizeBytes
    };

    private static readonly HashSet<string> AllowedContentTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif"
        };

    private readonly CloudinaryDotNet.Cloudinary _cloudinary;

    public CloudinaryFileStorageService(
        IOptions<CloudinarySettings> options)
    {
        var settings = options.Value;

        if (string.IsNullOrWhiteSpace(settings.CloudName) ||
            string.IsNullOrWhiteSpace(settings.ApiKey) ||
            string.IsNullOrWhiteSpace(settings.ApiSecret))
        {
            throw new InvalidOperationException(
                "Cloudinary settings are not configured.");
        }

        var account = new Account(
            settings.CloudName,
            settings.ApiKey,
            settings.ApiSecret);

        _cloudinary = new CloudinaryDotNet.Cloudinary(account);
        _cloudinary.Api.Secure = true;
    }

    public async Task<StoredFileDto> UploadImageAsync(
        FileUploadRequest request,
        string folder,
        CancellationToken cancellationToken = default)
    {
        ValidateUploadRequest(request, folder);

        cancellationToken.ThrowIfCancellationRequested();

        if (request.Content.CanSeek)
        {
            request.Content.Position = 0;
        }

        var safeFileName = Path.GetFileName(request.FileName);

        var uploadParameters = new ImageUploadParams
        {
            File = new FileDescription(
                safeFileName,
                request.Content),

            Folder = folder,
            UseFilename = false,
            UniqueFilename = true,
            Overwrite = false
        };

        var uploadResult = await _cloudinary.UploadAsync(
            uploadParameters);

        cancellationToken.ThrowIfCancellationRequested();

        if (uploadResult.Error is not null)
        {
            throw new InvalidOperationException(
                $"Şəkil Cloudinary-yə yüklənmədi: " +
                $"{uploadResult.Error.Message}");
        }

        if (string.IsNullOrWhiteSpace(uploadResult.PublicId))
        {
            throw new InvalidOperationException(
                "Cloudinary şəkil üçün public ID qaytarmadı.");
        }

        return new StoredFileDto
        {
            PublicId = uploadResult.PublicId,
            OriginalFileName = safeFileName,
            ContentType = request.ContentType,
            FileSizeBytes = uploadResult.Bytes > 0
                ? uploadResult.Bytes
                : request.FileSizeBytes
        };
    }

    public async Task<StoredFileContentDto> DownloadImageAsync(
    string publicId,
    CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            throw new ArgumentException(
                "Cloudinary public ID boş ola bilməz.",
                nameof(publicId));
        }

        cancellationToken.ThrowIfCancellationRequested();

        var deliveryUrl = _cloudinary.Api.UrlImgUp
            .BuildUrl(publicId);

        using var response = await ImageDownloadClient.GetAsync(
            deliveryUrl,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        if (response.StatusCode ==
            System.Net.HttpStatusCode.NotFound)
        {
            throw new FileNotFoundException(
                "Şəkil Cloudinary-də tapılmadı.");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Şəkil Cloudinary-dən oxunmadı. " +
                $"Status: {(int)response.StatusCode}");
        }

        var content = await response.Content
            .ReadAsByteArrayAsync(cancellationToken);

        if (content.Length == 0)
        {
            throw new InvalidOperationException(
                "Cloudinary boş şəkil faylı qaytardı.");
        }

        if (content.Length > MaxImageFileSizeBytes)
        {
            throw new InvalidOperationException(
                "Cloudinary-dən gələn şəkil maksimum ölçünü keçir.");
        }

        var contentType =
            response.Content.Headers.ContentType?.MediaType;

        return new StoredFileContentDto
        {
            Content = content,
            ContentType = string.IsNullOrWhiteSpace(contentType)
                ? "application/octet-stream"
                : contentType
        };
    }

    public async Task DeleteImageAsync(
        string publicId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            throw new ArgumentException(
                "Cloudinary public ID boş ola bilməz.",
                nameof(publicId));
        }

        cancellationToken.ThrowIfCancellationRequested();

        var deletionParameters = new DeletionParams(publicId)
        {
            ResourceType = ResourceType.Image,
            Invalidate = true
        };

        var deletionResult = await _cloudinary.DestroyAsync(
            deletionParameters);

        cancellationToken.ThrowIfCancellationRequested();

        if (deletionResult.Error is not null)
        {
            throw new InvalidOperationException(
                $"Şəkil Cloudinary-dən silinmədi: " +
                $"{deletionResult.Error.Message}");
        }

        if (!string.Equals(
                deletionResult.Result,
                "ok",
                StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(
                deletionResult.Result,
                "not found",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Cloudinary şəkli silə bilmədi.");
        }
    }

    private static void ValidateUploadRequest(
        FileUploadRequest request,
        string folder)
    {
        var failures = new List<ValidationFailure>();

        if (request.Content is null || !request.Content.CanRead)
        {
            failures.Add(new ValidationFailure(
                "File",
                "Oxuna bilən şəkil faylı göndərilməlidir."));
        }

        if (string.IsNullOrWhiteSpace(request.FileName))
        {
            failures.Add(new ValidationFailure(
                "File",
                "Şəkil faylının adı yoxdur."));
        }

        if (request.FileSizeBytes <= 0)
        {
            failures.Add(new ValidationFailure(
                "File",
                "Boş şəkil faylı göndərilə bilməz."));
        }
        else if (request.FileSizeBytes > MaxImageFileSizeBytes)
        {
            failures.Add(new ValidationFailure(
                "File",
                "Şəkilin ölçüsü maksimum 10 MB ola bilər."));
        }

        if (string.IsNullOrWhiteSpace(request.ContentType) ||
            !AllowedContentTypes.Contains(request.ContentType))
        {
            failures.Add(new ValidationFailure(
                "File",
                "Yalnız JPEG, PNG, WEBP, HEIC və HEIF şəkilləri qəbul olunur."));
        }

        if (string.IsNullOrWhiteSpace(folder))
        {
            failures.Add(new ValidationFailure(
                "Folder",
                "Şəkil qovluğu müəyyən edilməyib."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }
    }
}