export type Member = {
  id: string;
  employee_no: number;
  employee_code: string | null;
  name: string;
  nickname: string | null;
  chinese_name: string | null;
  sick_leave_remaining: number;
  personal_leave_remaining: number;
  vacation_leave_remaining: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

export type WeeklyHoliday = {
  id: string;
  member_id: string;
  weekday: number;
  created_at: string;
  updated_at: string;
  member: Member;
};

export type OvertimeEntryType = "ot" | "absent";
export type OvertimeDayType = "regular" | "holiday";
export type OvertimeAbsenceType = "sixth_day_off" | "personal_leave" | "sick_leave" | "vacation_leave";

export type OvertimeEntry = {
  id: string;
  member_id: string;
  ot_date: string;
  entry_type: OvertimeEntryType;
  absence_type: OvertimeAbsenceType | null;
  day_type: OvertimeDayType;
  start_time: string | null;
  end_time: string | null;
  total_minutes: number;
  ot_1x_minutes: number;
  ot_1_5x_minutes: number;
  ot_3x_minutes: number;
  weighted_minutes: number;
  created_at: string;
  updated_at: string;
  member: Member;
};

export type MemberHours = {
  member_id: string;
  employee_no: number;
  name: string;
  employee_code?: string | null;
  nickname?: string | null;
  chinese_name?: string | null;
  color: string;
  total_minutes: number;
  ot_1x_minutes: number;
  ot_1_5x_minutes: number;
  ot_3x_minutes: number;
};

export type MonthSummary = {
  month_label: string;
  ot_days: number;
  total_entries: number;
  active_members: number;
  total_minutes: number;
  total_ot_1x_minutes: number;
  total_ot_1_5x_minutes: number;
  total_ot_3x_minutes: number;
  by_member: MemberHours[];
};

export type OvertimePayload = {
  memberId: string;
  otDate: string;
  entryType: OvertimeEntryType;
  absenceType?: OvertimeAbsenceType;
  dayType?: OvertimeDayType;
  startTime?: string;
  endTime?: string;
};

export type MemberPayload = {
  employeeNo: number;
  employeeCode: string;
  name: string;
  nickname: string;
  chineseName: string;
  sickLeaveRemaining: number;
  personalLeaveRemaining: number;
  vacationLeaveRemaining: number;
  color: string;
  isActive: boolean;
};

export type WeeklyHolidayPayload = {
  memberId: string;
  weekday: number;
};

export type DisplaySettings = {
  showEmployeeCode: boolean;
};
