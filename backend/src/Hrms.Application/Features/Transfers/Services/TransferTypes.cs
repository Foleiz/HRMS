namespace Hrms.Application.Features.Transfers.Services;

/// <summary>
/// ประเภทการปรับเปลี่ยนของคำสั่งโยกย้าย — ระบบจัดให้อัตโนมัติจากการเทียบ ปัจจุบัน ↔ ปลายทาง
/// เก็บในคอลัมน์ transfer_type เป็นรหัสคั่นด้วยจุลภาค เช่น "DEPARTMENT_TRANSFER,PROMOTION"
/// </summary>
public static class TransferTypes
{
    public const string DepartmentTransfer = "DEPARTMENT_TRANSFER"; // ย้ายแผนก/ฝ่าย
    public const string Promotion = "PROMOTION";                     // ระดับตำแหน่งสูงขึ้น
    public const string PositionChange = "POSITION_CHANGE";          // เปลี่ยนตำแหน่ง ระดับเท่าเดิม
    public const string Demotion = "DEMOTION";                       // ระดับตำแหน่งต่ำลง

    private static readonly string[] Order = { DepartmentTransfer, Promotion, PositionChange, Demotion };

    /// <summary>แยกรหัสที่เก็บไว้เป็นรายการ (รองรับค่าแบบเดิม TRANSFER_AND_PROMOTION / PROMOTION_AND_SUPERVISOR)</summary>
    public static List<string> Split(string? stored)
    {
        var result = new List<string>();
        if (string.IsNullOrWhiteSpace(stored)) return result;
        foreach (var raw in stored.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            switch (raw.ToUpperInvariant())
            {
                case "TRANSFER_AND_PROMOTION":
                    result.Add(DepartmentTransfer);
                    result.Add(Promotion);
                    break;
                case "PROMOTION_AND_SUPERVISOR":
                    result.Add(Promotion);
                    break;
                default:
                    result.Add(raw.ToUpperInvariant());
                    break;
            }
        }
        return result.Distinct().OrderBy(SortKey).ToList();
    }

    private static int SortKey(string code)
    {
        var i = Array.IndexOf(Order, code);
        return i < 0 ? 99 : i;
    }

    public static string Join(IEnumerable<string> codes) => string.Join(",", codes);

    public static string Display(string code) => code switch
    {
        DepartmentTransfer => "ย้ายแผนก",
        Promotion => "เลื่อนตำแหน่ง",
        PositionChange => "เปลี่ยนตำแหน่ง",
        Demotion => "ลดตำแหน่ง",
        _ => code
    };

    /// <summary>
    /// จัดประเภทจากการเปลี่ยนแปลง: แผนกต่าง → ย้ายแผนก; ตำแหน่งต่าง → เทียบลำดับระดับ (LevelRank)
    /// สูงขึ้น = เลื่อน, ต่ำลง = ลด, เท่าเดิม/ไม่ทราบระดับ = เปลี่ยนตำแหน่ง
    /// </summary>
    public static List<string> Classify(
        long? fromDepartmentId, long? toDepartmentId,
        long? fromPositionId, long? toPositionId,
        int? fromLevelRank, int? toLevelRank)
    {
        var codes = new List<string>();
        if (fromDepartmentId != toDepartmentId) codes.Add(DepartmentTransfer);
        if (fromPositionId != toPositionId)
        {
            if (fromLevelRank.HasValue && toLevelRank.HasValue && toLevelRank > fromLevelRank) codes.Add(Promotion);
            else if (fromLevelRank.HasValue && toLevelRank.HasValue && toLevelRank < fromLevelRank) codes.Add(Demotion);
            else codes.Add(PositionChange);
        }
        return codes;
    }
}
