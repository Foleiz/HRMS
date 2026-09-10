namespace Hrms.Application.Common.Models;

/// <summary>
/// รูปแบบการส่ง Response กลับมาตรฐานของระบบ HRMS ทั้งหมด
/// เพื่อให้ทั้ง Dev 1, Dev 2 และหน้าบ้าน Next.js คาดหวัง Format เดียวกันเสมอ
/// </summary>
/// <typeparam name="T">ประเภทข้อมูลที่ต้องการส่งกลับ</typeparam>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }

    public static ApiResponse<T> Ok(T data, string message = "สำเร็จ")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    public static ApiResponse<T> Fail(string message, List<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Errors = errors ?? new List<string>()
        };
    }
}
