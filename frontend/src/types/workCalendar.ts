export interface WorkWeekDay {
  id: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayNameThai: string;
  dayNameEnglish: string;
  isWorkingDay: boolean;
}

export interface UpdateWorkWeekItem {
  dayOfWeek: number;
  isWorkingDay: boolean;
}

export interface UpdateWorkWeekRequest {
  days: UpdateWorkWeekItem[];
}

export interface Holiday {
  id: number;
  holidayDate: string; // YYYY-MM-DD
  holidayName: string;
  companyId: number;
  holidayType: string; // 'PUBLIC', 'COMPANY_SPECIAL', 'SUBSTITUTE'
  holidayTypeThai: string;
}

export interface CreateHolidayRequest {
  holidayDate: string; // YYYY-MM-DD
  holidayName: string;
  companyId?: number;
  holidayType: string;
}

export interface UpdateHolidayRequest {
  holidayDate: string;
  holidayName: string;
  holidayType: string;
}
