using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GrandWall.Api.Controllers;

[ApiController]
[Route("api/app-version")]
public sealed class AppVersionController : ControllerBase
{
    private const string ReleaseFilePath =
        "/app/data/releases/android.json";

    private readonly IConfiguration _configuration;
    private readonly ILogger<AppVersionController> _logger;

    public AppVersionController(
        IConfiguration configuration,
        ILogger<AppVersionController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpGet("android")]
    public async Task<IActionResult> GetAndroidVersion(
        CancellationToken cancellationToken)
    {
        var release = await TryReadReleaseFileAsync(
            cancellationToken);

        if (release is not null)
        {
            return Ok(new
            {
                platform = "android",
                latestVersion = release.LatestVersion,
                latestVersionCode = release.LatestVersionCode,
                minimumVersionCode = release.MinimumVersionCode,
                forceUpdate = release.ForceUpdate,
                downloadUrl = release.DownloadUrl,
                releaseNotes = release.ReleaseNotes
            });
        }

        var section =
            _configuration.GetSection("AppVersion:Android");

        return Ok(new
        {
            platform = "android",
            latestVersion =
                section["LatestVersion"] ?? "1.0.0",

            latestVersionCode =
                section.GetValue<int>("LatestVersionCode"),

            minimumVersionCode =
                section.GetValue<int>("MinimumVersionCode"),

            forceUpdate =
                section.GetValue<bool>("ForceUpdate"),

            downloadUrl =
                section["DownloadUrl"]
                ?? "https://grandwall.az/?mode=update",

            releaseNotes =
                section
                    .GetSection("ReleaseNotes")
                    .Get<string[]>()
                ?? Array.Empty<string>()
        });
    }

    private async Task<AndroidRelease?> TryReadReleaseFileAsync(
        CancellationToken cancellationToken)
    {
        try
        {
            if (!System.IO.File.Exists(ReleaseFilePath))
            {
                return null;
            }

            await using var stream =
                System.IO.File.OpenRead(ReleaseFilePath);

            var release =
                await JsonSerializer.DeserializeAsync<AndroidRelease>(
                    stream,
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    },
                    cancellationToken);

            if (release is null ||
                release.LatestVersionCode <= 0 ||
                release.MinimumVersionCode <= 0 ||
                string.IsNullOrWhiteSpace(release.LatestVersion) ||
                string.IsNullOrWhiteSpace(release.DownloadUrl))
            {
                _logger.LogWarning(
                    "Android release faylı etibarsızdır. " +
                    "Appsettings fallback istifadə olunur.");

                return null;
            }

            return release;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Android release faylı oxuna bilmədi. " +
                "Appsettings fallback istifadə olunur.");

            return null;
        }
    }

    private sealed class AndroidRelease
    {
        public string LatestVersion { get; init; } = "1.0.0";

        public int LatestVersionCode { get; init; }

        public int MinimumVersionCode { get; init; }

        public bool ForceUpdate { get; init; }

        public string DownloadUrl { get; init; } =
            "https://grandwall.az/?mode=update";

        public string[] ReleaseNotes { get; init; } =
            Array.Empty<string>();
    }
}
