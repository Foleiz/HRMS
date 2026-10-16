export interface Shift {
  id: number;
  shiftCode: string;
  shiftName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isCrossDay: boolean;
  breakMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
  /** สีในปฏิทินจัดกะ (#RRGGBB) — null = สีเริ่มต้น */
  color?: string | null;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  workHours: number;
  netWorkHours: number;
}

export interface CreateShiftRequest {
  shiftCode: string;
  shiftName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isCrossDay?: boolean;
  breakMinutes: number;
  status: string;
  color?: string | null;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
}

export interface UpdateShiftRequest {
  shiftName: string;
  startTime: string;
  endTime: string;
  isCrossDay?: boolean;
  breakMinutes: number;
  status: string;
  color?: string | null;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
}
