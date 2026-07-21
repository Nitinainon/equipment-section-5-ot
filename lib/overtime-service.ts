import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateOtBreakdown,
  elapsedMinutesBetween,
  getMonthRange,
  normalizeTime,
} from "./date";
import { getDatabaseErrorMessage, isSchemaOutdatedError } from "./supabase-error";
import type { Member, MonthSummary, OvertimeAbsenceType, OvertimeEntry, OvertimePayload } from "./types";

type RawOvertimeEntry = Omit<OvertimeEntry, "member"> & {
  members: Member | Member[] | null;
};

const absenceTypes = new Set<OvertimeAbsenceType>([
  "sixth_day_off",
  "personal_leave",
  "sick_leave",
  "vacation_leave",
]);

const memberSelect =
  "id, employee_no, employee_code, name, nickname, chinese_name, sick_leave_remaining, personal_leave_remaining, vacation_leave_remaining, color, is_active, created_at";
const legacyMemberSelect =
  "id, employee_no, name, nickname, chinese_name, color, is_active, created_at";
const overtimeSelect = `id, member_id, ot_date, entry_type, absence_type, day_type, start_time, end_time, total_minutes, ot_1x_minutes, ot_1_5x_minutes, ot_3x_minutes, weighted_minutes, created_at, updated_at, members(${memberSelect})`;
const legacyOvertimeSelect = `id, member_id, ot_date, entry_type, day_type, start_time, end_time, total_minutes, ot_1x_minutes, ot_1_5x_minutes, ot_3x_minutes, weighted_minutes, created_at, updated_at, members(${memberSelect})`;
const veryLegacyOvertimeSelect = `id, member_id, ot_date, start_time, end_time, total_minutes, created_at, updated_at, members(${legacyMemberSelect})`;

export function validateOvertimePayload(
  payload: Partial<OvertimePayload>,
) {
  const memberId = payload.memberId?.trim();
  const otDate = payload.otDate?.trim();
  const entryType = payload.entryType ?? "ot";
  const absenceType = normalizeAbsenceType(payload.absenceType);
  const dayType = payload.dayType ?? "regular";
  const startTime = payload.startTime?.trim();
  const endTime = payload.endTime?.trim();

  if (!memberId) throw new Error("กรุณาเลือกชื่อสมาชิก");
  if (!otDate) throw new Error("กรุณาเลือกวันที่");
  if (entryType !== "ot" && entryType !== "absent") {
    throw new Error("ประเภทข้อมูลไม่ถูกต้อง");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(otDate)) {
    throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
  }

  if (entryType === "absent") {
    return {
      memberId,
      otDate,
      entryType,
      absenceType,
      startTime: null,
      endTime: null,
      dayType: "regular" as const,
      totalMinutes: 0,
      ot1xMinutes: 0,
      ot15xMinutes: 0,
      ot3xMinutes: 0,
      weightedMinutes: 0,
    };
  }

  if (dayType === "holiday" && !startTime && !endTime) {
    return {
      memberId,
      otDate,
      entryType,
      absenceType: null,
      startTime: null,
      endTime: null,
      dayType: "holiday" as const,
      totalMinutes: 0,
      ot1xMinutes: 0,
      ot15xMinutes: 0,
      ot3xMinutes: 0,
      weightedMinutes: 0,
    };
  }

  if (!startTime) throw new Error("กรุณากรอกเวลาเริ่มต้น");
  if (!endTime) throw new Error("กรุณากรอกเวลาสิ้นสุด");
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error("รูปแบบเวลาไม่ถูกต้อง");
  }

  if (elapsedMinutesBetween(startTime, endTime) <= 0) {
    throw new Error("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
  }
  const breakdown = calculateOtBreakdown(startTime, endTime, dayType === "holiday");
  if (breakdown.totalMinutes <= 0) {
    throw new Error("ช่วงเวลานี้ยังไม่มีชั่วโมง OT ที่นับได้ ระบบเริ่มนับ OT หลัง 18:00");
  }

  return {
    memberId,
    otDate,
    entryType,
    absenceType: null,
    startTime,
    endTime,
    dayType: breakdown.dayType,
    totalMinutes: breakdown.totalMinutes,
    ot1xMinutes: breakdown.ot1xMinutes,
    ot15xMinutes: breakdown.ot15xMinutes,
    ot3xMinutes: breakdown.ot3xMinutes,
    weightedMinutes: breakdown.weightedMinutes,
  };
}

export async function validateOvertimePayloadWithHoliday(
  supabase: SupabaseClient,
  payload: Partial<OvertimePayload>,
) {
  const memberId = payload.memberId?.trim();
  const otDate = payload.otDate?.trim();
  let isHoliday = false;

  if (memberId && otDate && /^\d{4}-\d{2}-\d{2}$/.test(otDate)) {
    isHoliday = await isMemberWeeklyHoliday(supabase, memberId, otDate);
  }

  return validateOvertimePayload({ ...payload, dayType: isHoliday ? "holiday" : "regular" });
}

function normalizeAbsenceType(value: unknown): OvertimeAbsenceType {
  const absenceType = typeof value === "string" && value ? value : "sixth_day_off";
  if (!absenceTypes.has(absenceType as OvertimeAbsenceType)) {
    throw new Error("ประเภทการลาไม่ถูกต้อง");
  }

  return absenceType as OvertimeAbsenceType;
}

async function isMemberWeeklyHoliday(
  supabase: SupabaseClient,
  memberId: string,
  dateIso: string,
) {
  const weekday = weekdayFromIsoDate(dateIso);
  const { data, error } = await supabase
    .from("weekly_holidays")
    .select("id")
    .eq("member_id", memberId)
    .eq("weekday", weekday)
    .limit(1);

  if (error) {
    throw new Error("ไม่สามารถตรวจสอบวันหยุดประจำสัปดาห์ได้");
  }

  return Boolean(data?.length);
}

export async function assertNoOverlap(
  supabase: SupabaseClient,
  payload: ReturnType<typeof validateOvertimePayload>,
  excludeId?: string,
) {
  let query = supabase
    .from("overtime_entries")
    .select("id, entry_type")
    .eq("member_id", payload.memberId)
    .eq("ot_date", payload.otDate)
    .limit(1);

  if (payload.entryType === "ot" && payload.startTime && payload.endTime) {
    query = query.or(
      `entry_type.eq.absent,and(entry_type.eq.ot,start_time.lt.${payload.endTime},end_time.gt.${payload.startTime})`,
    );
  }

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error("ไม่สามารถตรวจสอบข้อมูลซ้ำได้");
  if (data && data.length > 0) {
    throw new Error(
      payload.entryType === "absent"
        ? "มีข้อมูลของสมาชิกคนนี้ในวันดังกล่าวแล้ว"
        : "มีข้อมูล OT ของสมาชิกคนนี้ในช่วงเวลาดังกล่าวแล้ว",
    );
  }
}

export async function fetchMembers(supabase: SupabaseClient) {
  let { data, error } = await supabase
    .from("members")
    .select(memberSelect)
    .eq("is_active", true)
    .order("employee_no", { ascending: true });

  if (error && isSchemaOutdatedError(error)) {
    const legacyResult = await supabase
      .from("members")
      .select(legacyMemberSelect)
      .eq("is_active", true)
      .order("employee_no", { ascending: true });
    data =
      legacyResult.data?.map((member) => ({
        ...member,
        employee_code: "",
        sick_leave_remaining: 30,
        personal_leave_remaining: 3,
        vacation_leave_remaining: 0,
      })) ?? null;
    error = legacyResult.error;
  }

  if (error) {
    throw new Error(getDatabaseErrorMessage(error, "ไม่สามารถดึงรายชื่อสมาชิกได้"));
  }
  return (data ?? []) as Member[];
}

export async function fetchOvertimeByMonth(
  supabase: SupabaseClient,
  month: string,
  memberId?: string,
) {
  const range = getMonthRange(month);
  let query = supabase
    .from("overtime_entries")
    .select(overtimeSelect)
    .gte("ot_date", range.start)
    .lte("ot_date", range.end)
    .order("ot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (memberId) {
    query = query.eq("member_id", memberId);
  }

  const result = await query;
  let data: unknown[] | null = result.data;
  let error = result.error;
  if (error && isSchemaOutdatedError(error)) {
    let legacyQuery = supabase
      .from("overtime_entries")
      .select(legacyOvertimeSelect)
      .gte("ot_date", range.start)
      .lte("ot_date", range.end)
      .order("ot_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (memberId) {
      legacyQuery = legacyQuery.eq("member_id", memberId);
    }

    const legacyResult = await legacyQuery;
    data = legacyResult.data?.map((entry) => ({ ...entry, entry_type: "ot" })) ?? null;
    error = legacyResult.error;

    if (error && isSchemaOutdatedError(error)) {
      let veryLegacyQuery = supabase
        .from("overtime_entries")
        .select(veryLegacyOvertimeSelect)
        .gte("ot_date", range.start)
        .lte("ot_date", range.end)
        .order("ot_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (memberId) {
        veryLegacyQuery = veryLegacyQuery.eq("member_id", memberId);
      }

      const veryLegacyResult = await veryLegacyQuery;
      data =
        veryLegacyResult.data?.map((entry) => {
          const row = entry as unknown as {
            members: Record<string, unknown> | Record<string, unknown>[] | null;
          };
          const members = row.members;

          return {
            ...entry,
            entry_type: "ot",
            members: Array.isArray(members)
              ? members.map((member) => ({
                  ...member,
                  employee_code: "",
                  sick_leave_remaining: 30,
                  personal_leave_remaining: 3,
                  vacation_leave_remaining: 0,
                }))
              : members
                ? {
                    ...members,
                    employee_code: "",
                    sick_leave_remaining: 30,
                    personal_leave_remaining: 3,
                    vacation_leave_remaining: 0,
                  }
                : members,
          };
        }) ?? null;
      error = veryLegacyResult.error;
    }
  }
  if (error) {
    throw new Error(getDatabaseErrorMessage(error, "ไม่สามารถดึงข้อมูล OT ได้"));
  }

  const weeklyHolidayKeys = await fetchWeeklyHolidayKeys(supabase);
  const entries = ((data ?? []) as RawOvertimeEntry[]).map((entry) => {
    const startTime = entry.start_time ? normalizeTime(entry.start_time) : null;
    const endTime = entry.end_time ? normalizeTime(entry.end_time) : null;
    const entryType = entry.entry_type ?? "ot";
    const isAbsent = entryType === "absent";
    const isHoliday = weeklyHolidayKeys.has(`${entry.member_id}:${weekdayFromIsoDate(entry.ot_date)}`);
    const computedBreakdown =
      isAbsent || !startTime || !endTime
        ? {
            dayType: "regular" as const,
            totalMinutes: 0,
            ot1xMinutes: 0,
            ot15xMinutes: 0,
            ot3xMinutes: 0,
            weightedMinutes: 0,
          }
        : calculateOtBreakdown(startTime, endTime, isHoliday);

    return {
      ...entry,
      start_time: startTime,
      end_time: endTime,
      entry_type: entryType,
      absence_type: isAbsent ? entry.absence_type ?? "sixth_day_off" : null,
      day_type: entry.day_type ?? computedBreakdown.dayType,
      total_minutes: isAbsent ? 0 : entry.total_minutes ?? computedBreakdown.totalMinutes,
      ot_1x_minutes: entry.ot_1x_minutes ?? computedBreakdown.ot1xMinutes,
      ot_1_5x_minutes: entry.ot_1_5x_minutes ?? computedBreakdown.ot15xMinutes,
      ot_3x_minutes: entry.ot_3x_minutes ?? computedBreakdown.ot3xMinutes,
      weighted_minutes: Number(entry.weighted_minutes ?? computedBreakdown.weightedMinutes),
      member: Array.isArray(entry.members) ? entry.members[0] : entry.members,
    };
  }) as OvertimeEntry[];

  return {
    entries,
    summary: buildMonthSummary(entries, range.label),
  };
}

export async function createOvertime(
  supabase: SupabaseClient,
  payload: Partial<OvertimePayload>,
) {
  const validPayload = validateOvertimePayload(payload);
  await assertNoOverlap(supabase, validPayload);

  const { data, error } = await supabase
    .from("overtime_entries")
    .insert({
      member_id: validPayload.memberId,
      ot_date: validPayload.otDate,
      entry_type: validPayload.entryType,
      absence_type: validPayload.absenceType,
      day_type: validPayload.dayType,
      start_time: validPayload.startTime,
      end_time: validPayload.endTime,
      total_minutes: validPayload.totalMinutes,
      ot_1x_minutes: validPayload.ot1xMinutes,
      ot_1_5x_minutes: validPayload.ot15xMinutes,
      ot_3x_minutes: validPayload.ot3xMinutes,
      weighted_minutes: validPayload.weightedMinutes,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("overlap")) {
      throw new Error(
        validPayload.entryType === "absent"
          ? "มีข้อมูลของสมาชิกคนนี้ในวันดังกล่าวแล้ว"
          : "มีข้อมูล OT ของสมาชิกคนนี้ในช่วงเวลาดังกล่าวแล้ว",
      );
    }
    throw new Error(getDatabaseErrorMessage(error, "ไม่สามารถบันทึกข้อมูลได้"));
  }

  return data;
}

export async function updateOvertime(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<OvertimePayload>,
) {
  const validPayload = validateOvertimePayload(payload);
  await assertNoOverlap(supabase, validPayload, id);

  const { data, error } = await supabase
    .from("overtime_entries")
    .update({
      member_id: validPayload.memberId,
      ot_date: validPayload.otDate,
      entry_type: validPayload.entryType,
      absence_type: validPayload.absenceType,
      day_type: validPayload.dayType,
      start_time: validPayload.startTime,
      end_time: validPayload.endTime,
      total_minutes: validPayload.totalMinutes,
      ot_1x_minutes: validPayload.ot1xMinutes,
      ot_1_5x_minutes: validPayload.ot15xMinutes,
      ot_3x_minutes: validPayload.ot3xMinutes,
      weighted_minutes: validPayload.weightedMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("overlap")) {
      throw new Error(
        validPayload.entryType === "absent"
          ? "มีข้อมูลของสมาชิกคนนี้ในวันดังกล่าวแล้ว"
          : "มีข้อมูล OT ของสมาชิกคนนี้ในช่วงเวลาดังกล่าวแล้ว",
      );
    }
    throw new Error(getDatabaseErrorMessage(error, "ไม่สามารถแก้ไขข้อมูลได้"));
  }

  return data;
}

export async function deleteOvertime(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("overtime_entries")
    .delete()
    .eq("id", id)
    .select("entry_type")
    .single();
  if (error) throw new Error("ไม่สามารถลบข้อมูลได้");
  return data;
}

async function fetchWeeklyHolidayKeys(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("weekly_holidays").select("member_id, weekday");

  if (error) {
    throw new Error("ไม่สามารถตรวจสอบวันหยุดประจำสัปดาห์ได้");
  }

  return new Set((data ?? []).map((holiday) => `${holiday.member_id}:${holiday.weekday}`));
}

function weekdayFromIsoDate(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function buildMonthSummary(entries: OvertimeEntry[], monthLabel: string): MonthSummary {
  const otEntries = entries.filter((entry) => entry.entry_type === "ot" && entry.total_minutes > 0);
  const days = new Set(otEntries.map((entry) => entry.ot_date));
  const members = new Map<
    string,
    {
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
    }
  >();

  for (const entry of otEntries) {
    const current = members.get(entry.member_id) ?? {
      employee_no: entry.member.employee_no,
      name: entry.member.name,
      employee_code: entry.member.employee_code,
      nickname: entry.member.nickname,
      chinese_name: entry.member.chinese_name,
      color: entry.member.color,
      total_minutes: 0,
      ot_1x_minutes: 0,
      ot_1_5x_minutes: 0,
      ot_3x_minutes: 0,
    };

    current.total_minutes += entry.total_minutes;
    current.ot_1x_minutes += entry.ot_1x_minutes;
    current.ot_1_5x_minutes += entry.ot_1_5x_minutes;
    current.ot_3x_minutes += entry.ot_3x_minutes;
    members.set(entry.member_id, current);
  }

  return {
    month_label: monthLabel,
    ot_days: days.size,
    total_entries: otEntries.length,
    active_members: members.size,
    total_minutes: otEntries.reduce((total, entry) => total + entry.total_minutes, 0),
    total_ot_1x_minutes: otEntries.reduce((total, entry) => total + entry.ot_1x_minutes, 0),
    total_ot_1_5x_minutes: otEntries.reduce((total, entry) => total + entry.ot_1_5x_minutes, 0),
    total_ot_3x_minutes: otEntries.reduce((total, entry) => total + entry.ot_3x_minutes, 0),
    by_member: Array.from(members.entries())
      .map(([member_id, value]) => ({ member_id, ...value }))
      .sort((a, b) => a.employee_no - b.employee_no),
  };
}
