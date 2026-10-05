/**
 * รูปแบบ Response มาตรฐานที่สอดคล้องกับ ApiResponse<T> ของ .NET Backend
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

/**
 * Interface ข้อมูลธนาคาร (Reference Feature)
 */
export interface Bank {
  id: number;
  /** รหัสธนาคารมาตรฐาน 3 หลัก เช่น 004 */
  bankCode: string;
  bankName: string;
  /** ชื่อย่อ เช่น KBANK */
  shortName?: string | null;
  /** จำนวนหลักเลขบัญชี (null = ไม่ตรวจ) */
  accountDigits?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreateBankInput {
  bankCode: string;
  bankName: string;
  shortName?: string | null;
  accountDigits?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBankInput {
  bankName: string;
  shortName?: string | null;
  accountDigits?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}
