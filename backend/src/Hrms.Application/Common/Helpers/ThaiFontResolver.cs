using PdfSharpCore.Fonts;

namespace Hrms.Application.Common.Helpers;

public class ThaiFontResolver : IFontResolver
{
    private static readonly string WindowsFontsDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Fonts");
    private static readonly string TahomaRegular = Path.Combine(WindowsFontsDir, "tahoma.ttf");
    private static readonly string TahomaBold = Path.Combine(WindowsFontsDir, "tahomabd.ttf");

    public string DefaultFontName => "Tahoma";

    public byte[]? GetFont(string faceName)
    {
        try
        {
            if (faceName == "TahomaBold" && File.Exists(TahomaBold))
            {
                return File.ReadAllBytes(TahomaBold);
            }

            if (File.Exists(TahomaRegular))
            {
                return File.ReadAllBytes(TahomaRegular);
            }
        }
        catch
        {
            // fallback if needed
        }

        return null;
    }

    public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
    {
        if (isBold)
        {
            return new FontResolverInfo("TahomaBold");
        }

        return new FontResolverInfo("Tahoma");
    }

    private static bool _isRegistered = false;
    private static readonly object _lock = new();

    public static void EnsureRegistered()
    {
        if (!_isRegistered)
        {
            lock (_lock)
            {
                if (!_isRegistered)
                {
                    GlobalFontSettings.FontResolver = new ThaiFontResolver();
                    _isRegistered = true;
                }
            }
        }
    }
}
