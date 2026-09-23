using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GrandWall.Api.Controllers;

[ApiController]
[Route("api/app-version")]
public sealed class AppVersionController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public AppVersionController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpGet("android")]
    public IActionResult GetAndroidVersion()
    {
        var section = _configuration.GetSection("AppVersion:Android");

        return Ok(new
        {
            platform = "android",
            latestVersion = section["LatestVersion"] ?? "1.0.0",
            latestVersionCode =
                section.GetValue<int>("LatestVersionCode"),
            minimumVersionCode =
                section.GetValue<int>("MinimumVersionCode"),
            forceUpdate =
                section.GetValue<bool>("ForceUpdate"),
            downloadUrl =
                section["DownloadUrl"]
                ?? "https://api.grandwall.az/download/grandwall.apk",
            releaseNotes =
                section.GetSection("ReleaseNotes").Get<string[]>()
                ?? Array.Empty<string>()
        });
    }
}
