using Hrms.Application.Common.Exceptions;

namespace Hrms.Application.Common.Utilities;

/// <summary>
/// แปลงไฟล์ที่ส่งมาจากหน้าเว็บ (data URL หรือ base64 ล้วน) เป็น byte[] พร้อม MIME type
/// </summary>
public static class FileDataDecoder
{
    public static (byte[] Bytes, string Mime) Decode(string data, string? fileName)
    {
        var mime = "application/octet-stream";
        var payload = data.Trim();
        if (payload.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var comma = payload.IndexOf(',');
            if (comma > 0)
            {
                var header = payload[5..comma];
                var semi = header.IndexOf(';');
                if (semi > 0) mime = header[..semi];
                payload = payload[(comma + 1)..];
            }
        }

        if (mime == "application/octet-stream" && !string.IsNullOrWhiteSpace(fileName))
        {
            mime = Path.GetExtension(fileName).ToLowerInvariant() switch
            {
                ".pdf" => "application/pdf",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => mime
            };
        }

        try
        {
            return (Convert.FromBase64String(payload), mime);
        }
        catch (FormatException)
        {
            throw new ValidationException("ไฟล์แนบไม่ถูกต้อง");
        }
    }
}
