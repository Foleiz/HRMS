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
  bankCode: string;
  bankName: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreateBankInput {
  bankCode: string;
  bankName: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBankInput {
  bankName: string;
  status: 'ACTIVE' | 'INACTIVE';
}
