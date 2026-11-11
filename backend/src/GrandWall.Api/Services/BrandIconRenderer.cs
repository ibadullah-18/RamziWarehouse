using SkiaSharp;

namespace GrandWall.Api.Services;

/// <summary>
/// Turns the uploaded logo into square home-screen icons: white background, logo centred
/// inside the safe zone (so Android can also round or mask it).
/// </summary>
public static class BrandIconRenderer
{
    public sealed record Icons(byte[] Icon512, byte[] Icon192, byte[] Icon180);

    /// <returns>null when the bytes are not a readable image.</returns>
    public static Icons? Render(byte[] logo)
    {
        using var source = SKBitmap.Decode(logo);
        if (source is null || source.Width < 1 || source.Height < 1) return null;
        return new Icons(Draw(source, 512), Draw(source, 192), Draw(source, 180));
    }

    private static byte[] Draw(SKBitmap source, int size)
    {
        using var surface = SKSurface.Create(new SKImageInfo(size, size, SKColorType.Rgba8888, SKAlphaType.Premul));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.White);

        // Maskable safe zone is the inner 80% circle; keep the logo inside ~70% of the side.
        var box = size * 0.70f;
        var scale = Math.Min(box / source.Width, box / source.Height);
        var width = source.Width * scale;
        var height = source.Height * scale;
        var target = SKRect.Create((size - width) / 2, (size - height) / 2, width, height);

        using var image = SKImage.FromBitmap(source);
        canvas.DrawImage(image, target, new SKSamplingOptions(SKCubicResampler.Mitchell));
        canvas.Flush();

        using var snapshot = surface.Snapshot();
        using var data = snapshot.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
