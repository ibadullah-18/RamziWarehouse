// ==========================================================================
// GrandWall - Sessiya / Lisenziya Problemi HÉ™lli
//
// PROBLEM: HazÄ±rda, Ã§ox gÃ¼man, access token-in Ã¶mrÃ¼ Ã§ox qÄ±sadÄ±r (vÉ™ ya
// lisenziya yoxlamasÄ± hÉ™r aÃ§Ä±lÄ±ÅŸda serverÉ™ sÉ™rt sual verir) vÉ™ refresh
// mexanizmi yoxdur/iÅŸlÉ™mir - ona gÃ¶rÉ™ 10 dÉ™qiqÉ™ sonra "lisenziya bitib"
// deyib login-É™ atÄ±r.
//
// HÆLL: Ä°KÄ° token modeli:
//   - AccessToken: qÄ±sa Ã¶mÃ¼rlÃ¼ (15-30 dÉ™q) - hÉ™r API sorÄŸusunda gÃ¶ndÉ™rilir.
//   - RefreshToken: uzun Ã¶mÃ¼rlÃ¼ VÆ SÃœRÃœÅžÆN (hÉ™r istifadÉ™dÉ™ Ã¶mrÃ¼ yenilÉ™nir).
//     TÉ™tbiq arxa planda access token bitÉ™ndÉ™ SÆSSÄ°ZCÆ refresh edir,
//     istifadÉ™Ã§i heÃ§ nÉ™ gÃ¶rmÃ¼r. YalnÄ±z refresh token da bitibsÉ™ (yÉ™ni
//     tÉ™tbiq HÆQÄ°QÆTÆN uzun mÃ¼ddÉ™t - mÉ™s. 45 gÃ¼n - aÃ§Ä±lmayÄ±bsa) o zaman
//     login sÉ™hifÉ™sinÉ™ yÃ¶nlÉ™ndirilir.
//
// TODO: connection string, DbContext adlarÄ±nÄ± Ã¶z layihÉ™nlÉ™ uyÄŸunlaÅŸdÄ±r.
// ==========================================================================

using System.Security.Cryptography;

namespace GrandWall.Auth;

public class RefreshTokenSettings
{
    public TimeSpan AccessTokenLifetime { get; set; } = TimeSpan.FromMinutes(20);

    // HÉ™r istifadÉ™dÉ™ bu qÉ™dÉ™r UZANIR (sliding). Ä°stifadÉ™Ã§i mÃ¼tÉ™madi
    // iÅŸlÉ™tdikcÉ™ heÃ§ vaxt bitmir.
    public TimeSpan RefreshTokenSlidingLifetime { get; set; } = TimeSpan.FromDays(45);

    // TÉ™hlÃ¼kÉ™sizlik Ã¼Ã§Ã¼n mÃ¼tlÉ™q tavan (heÃ§ iÅŸlÉ™dilmÉ™sÉ™ belÉ™ bu tarixdÉ™n
    // sonra mÃ¼tlÉ™q yenidÉ™n login tÉ™lÉ™b olunur). Ä°stÉ™sÉ™n Ã§ox uzun (mÉ™s. 1 il)
    // qoy vÉ™ ya sÄ±fÄ±rla (Timespan.MaxValue) - amma tÃ¶vsiyÉ™ heÃ§ olmasa var olsun.
    public TimeSpan RefreshTokenAbsoluteLifetime { get; set; } = TimeSpan.FromDays(180);
}

public class StoredRefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = default!;   // heÃ§ vaxt plain saxlama
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }        // sliding - hÉ™r refresh-dÉ™ yenilÉ™nir
    public DateTimeOffset AbsoluteExpiresAt { get; set; } // dÉ™yiÅŸmir
    public bool Revoked { get; set; }
    public string? ReplacedByTokenHash { get; set; }     // rotasiya izi (tÉ™hlÃ¼kÉ™sizlik)
}

public interface IRefreshTokenStore
{
    Task<StoredRefreshToken> CreateAsync(Guid userId, RefreshTokenSettings settings);
    Task<StoredRefreshToken?> FindValidAsync(string rawToken);
    Task RevokeAsync(Guid tokenId, string? replacedByTokenHash = null);
}

public class RefreshTokenService
{
    private readonly IRefreshTokenStore _store;
    private readonly RefreshTokenSettings _settings;

    public RefreshTokenService(IRefreshTokenStore store, RefreshTokenSettings settings)
    {
        _store = store;
        _settings = settings;
    }

    public static string GenerateRawToken()
    {
        // kriptoqrafik tÉ™hlÃ¼kÉ™siz tÉ™sadÃ¼fi token
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>
    /// Login zamanÄ± Ã§aÄŸÄ±r: yeni access + refresh token cÃ¼tÃ¼ yaradÄ±r.
    /// </summary>
    public async Task<(string accessToken, string refreshToken, DateTimeOffset accessExpiresAt)>
        IssueTokensAsync(Guid userId, Func<Guid, TimeSpan, string> buildAccessToken)
    {
        var refresh = await _store.CreateAsync(userId, _settings);
        var accessToken = buildAccessToken(userId, _settings.AccessTokenLifetime);
        var accessExpiresAt = DateTimeOffset.UtcNow.Add(_settings.AccessTokenLifetime);

        return (accessToken, refresh.TokenHash, accessExpiresAt);
    }

    /// <summary>
    /// Mobil tÉ™tbiq access token bitÉ™ndÉ™ (401 alanda) SÆSSÄ°Z olaraq bunu Ã§aÄŸÄ±rÄ±r.
    /// Refresh token hÉ™lÉ™ etibarlÄ±dÄ±rsa -> yeni cÃ¼t qaytarÄ±r vÉ™ Ã¶mrÃ¼ YENÄ°DÆN UZADIR (sliding).
    /// EtibarsÄ±zdÄ±rsa (45+ gÃ¼n iÅŸlÉ™dilmÉ™yib, ya da mÃ¼tlÉ™q tavan keÃ§ib, ya da geri Ã§aÄŸÄ±rÄ±lÄ±b)
    /// -> null qaytarÄ±r, mobil tÉ™tbiq bunda login sÉ™hifÉ™sinÉ™ yÃ¶nlÉ™ndirir.
    /// </summary>
    public async Task<(string accessToken, string refreshToken, DateTimeOffset accessExpiresAt)?>
        TryRefreshAsync(string rawRefreshToken, Func<Guid, TimeSpan, string> buildAccessToken)
    {
        var existing = await _store.FindValidAsync(rawRefreshToken);
        if (existing is null) return null;

        if (existing.Revoked) return null;
        if (existing.AbsoluteExpiresAt < DateTimeOffset.UtcNow) return null;
        if (existing.ExpiresAt < DateTimeOffset.UtcNow) return null; // 45 gÃ¼n É™rzindÉ™ heÃ§ aÃ§Ä±lmayÄ±b

        // Rotasiya: kÃ¶hnÉ™ refresh token-i lÉ™ÄŸv et, yenisini ver (tÉ™hlÃ¼kÉ™sizlik best-practice)
        var newRefresh = await _store.CreateAsync(existing.UserId, _settings);
        await _store.RevokeAsync(existing.Id, newRefresh.TokenHash);

        var accessToken = buildAccessToken(existing.UserId, _settings.AccessTokenLifetime);
        var accessExpiresAt = DateTimeOffset.UtcNow.Add(_settings.AccessTokenLifetime);

        return (accessToken, newRefresh.TokenHash, accessExpiresAt);
    }
}

// Program.cs-dÉ™ qeydiyyat nÃ¼munÉ™si:
//
// builder.Services.AddSingleton(new RefreshTokenSettings());
// builder.Services.AddScoped<IRefreshTokenStore, EfRefreshTokenStore>(); // Ã¶z DbContext-inlÉ™ yaz
// builder.Services.AddScoped<RefreshTokenService>();
//
// POST /api/auth/refresh endpoint-i:
//
// [HttpPost("refresh")]
// [AllowAnonymous]
// public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
// {
//     var result = await _refreshTokenService.TryRefreshAsync(req.RefreshToken, _jwt.BuildAccessToken);
//     if (result is null) return Unauthorized(); // yalnÄ±z BURADA É™sl logout mÉ™ntiqi iÅŸÉ™ dÃ¼ÅŸmÉ™lidir
//     return Ok(new { accessToken = result.Value.accessToken, refreshToken = result.Value.refreshToken });
// }
