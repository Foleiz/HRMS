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
  /** วันทำงานประจำสัปดาห์ (1=จันทร์ .. 7/0=อาทิตย์) เช่น [1, 2, 3, 4, 5] */
  workDays?: number[];
}

export interface CreateShiftRequest {
  shiftCode?: string;
  shiftName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isCrossDay?: boolean;
  breakMinutes: number;
  status: string;
  color?: string | null;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  workDays?: number[];
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
  workDays?: number[];
}
