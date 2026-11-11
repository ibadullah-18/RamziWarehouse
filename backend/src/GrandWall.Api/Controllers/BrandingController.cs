using GrandWall.Api.Authorization;
using GrandWall.Api.Services;
using GrandWall.Application.Common.Exceptions;
using GrandWall.Domain.Entities;
using GrandWall.Domain.Enums;
using GrandWall.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GrandWall.Api.Controllers;

/// <summary>App name and logo. Everyone (also the login screen) reads them; "settings.manage" changes them.</summary>
[ApiController, Route("api/branding")]
public sealed class BrandingController(AppDbContext db, TimeProvider clock, IWebHostEnvironment environment) : ControllerBase
{
    private const int MaxLogoBytes = 1024 * 1024;

    public sealed record BrandingDto(string AppName, string? LogoUrl);
    public sealed record NameRequest(string AppName);

    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<BrandingDto>> Get(CancellationToken ct)
    {
        var row = await db.AppBranding.AsNoTracking()
            .Select(b => new { b.AppName, HasLogo = b.Logo != null, b.UpdatedAtUtc })
            .FirstOrDefaultAsync(ct);
        return Ok(new BrandingDto(
            row?.AppName ?? AppBranding.DefaultName,
            row is { HasLogo: true } ? "/api/branding/logo?v=" + row.UpdatedAtUtc.Ticks : null));
    }

    /// <summary>The logo file; the URL carries a version, so it may be cached for long.</summary>
    [HttpGet("logo"), AllowAnonymous]
    public async Task<IActionResult> Logo(CancellationToken ct)
    {
        var row = await db.AppBranding.AsNoTracking().FirstOrDefaultAsync(ct);
        if (row?.Logo is null) return NotFound();
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(row.Logo, row.LogoContentType ?? "image/png");
    }

    /// <summary>
    /// Home-screen icon (iPhone "Add to Home Screen", Android install) made from the logo; the
    /// built-in icon until a logo is uploaded.
    /// </summary>
    [HttpGet("icon/{size:int}"), AllowAnonymous]
    public async Task<IActionResult> Icon(int size, CancellationToken ct)
    {
        if (size is not (180 or 192 or 512)) return NotFound();
        var bytes = await db.AppBranding.AsNoTracking()
            .Select(b => size == 512 ? b.Icon512 : size == 192 ? b.Icon192 : b.Icon180)
            .FirstOrDefaultAsync(ct);
        Response.Headers.CacheControl = "no-cache";
        if (bytes is not null) return File(bytes, "image/png");
        var builtIn = size switch { 512 => "icon-512.png", 192 => "icon-192.png", _ => "apple-touch-icon.png" };
        var path = environment.WebRootPath is { } root ? Path.Combine(root, builtIn) : null;
        return path is not null && System.IO.File.Exists(path) ? PhysicalFile(path, "image/png") : NotFound();
    }

    /// <summary>Web app manifest with the current name and icons (read when the app is installed).</summary>
    [HttpGet("manifest"), AllowAnonymous]
    public async Task<IActionResult> Manifest(CancellationToken ct)
    {
        var row = await db.AppBranding.AsNoTracking()
            .Select(b => new { b.AppName, b.UpdatedAtUtc })
            .FirstOrDefaultAsync(ct);
        var name = row?.AppName ?? AppBranding.DefaultName;
        var version = row?.UpdatedAtUtc.Ticks ?? 0;
        Response.Headers.CacheControl = "no-cache";
        return new JsonResult(new
        {
            id = "/",
            name,
            short_name = name,
            description = name + " anbar idarəetmə sistemi",
            lang = "az",
            start_url = "/",
            scope = "/",
            display = "standalone",
            orientation = "any",
            theme_color = "#1D4ED8",
            background_color = "#F3F6FB",
            icons = new object[]
            {
                new { src = $"/api/branding/icon/192?v={version}", sizes = "192x192", type = "image/png", purpose = "any" },
                new { src = $"/api/branding/icon/512?v={version}", sizes = "512x512", type = "image/png", purpose = "any" },
                new { src = $"/api/branding/icon/512?v={version}", sizes = "512x512", type = "image/png", purpose = "maskable" },
            },
        })
        { ContentType = "application/manifest+json; charset=utf-8" };
    }

    [HttpPut("name"), Authorize, RequirePermission(Permission.SettingsManage)]
    public async Task<ActionResult<BrandingDto>> SetName(NameRequest request, CancellationToken ct)
    {
        var name = request.AppName?.Trim() ?? "";
        if (name.Length is < 1 or > 40) throw new ConflictException("Ad 1–40 simvol olmalıdır.");
        var row = await Row(ct);
        row.AppName = name;
        row.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
        return await Get(ct);
    }

    [HttpPut("logo"), Authorize, RequirePermission(Permission.SettingsManage), RequestSizeLimit(MaxLogoBytes + 64 * 1024)]
    public async Task<ActionResult<BrandingDto>> SetLogo(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length is 0 or > MaxLogoBytes) throw new ConflictException("Loqo 1 MB-dan böyük olmamalıdır.");
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        var bytes = stream.ToArray();
        var type = ImageType(bytes) ?? throw new ConflictException("Loqo PNG, JPG və ya WEBP şəkli olmalıdır.");
        var icons = BrandIconRenderer.Render(bytes) ?? throw new ConflictException("Şəkil oxunmadı. Başqa PNG və ya JPG seçin.");
        var row = await Row(ct);
        row.Logo = bytes;
        row.LogoContentType = type;
        row.Icon512 = icons.Icon512;
        row.Icon192 = icons.Icon192;
        row.Icon180 = icons.Icon180;
        row.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
        return await Get(ct);
    }

    [HttpDelete("logo"), Authorize, RequirePermission(Permission.SettingsManage)]
    public async Task<ActionResult<BrandingDto>> RemoveLogo(CancellationToken ct)
    {
        var row = await Row(ct);
        row.Logo = null;
        row.LogoContentType = null;
        row.Icon512 = null;
        row.Icon192 = null;
        row.Icon180 = null;
        row.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
        return await Get(ct);
    }

    private async Task<AppBranding> Row(CancellationToken ct)
    {
        var row = await db.AppBranding.FirstOrDefaultAsync(ct);
        if (row is not null) return row;
        row = new AppBranding();
        db.AppBranding.Add(row);
        return row;
    }

    /// <summary>Checks the file content itself, not the name the phone gave it.</summary>
    private static string? ImageType(byte[] b)
    {
        if (b.Length > 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return "image/png";
        if (b.Length > 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b.Length > 12 && b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46 && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50) return "image/webp";
        return null;
    }
}
