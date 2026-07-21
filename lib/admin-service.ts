import type { SupabaseClient } from "@supabase/supabase-js";
import { getDatabaseErrorMessage, isSchemaOutdatedError } from "./supabase-error";
import type { Member, MemberPayload, WeeklyHoliday, WeeklyHolidayPayload } from "./types";

type RawWeeklyHoliday = Omit<WeeklyHoliday, "member"> & {
  members: Member | Member[] | null;
};

const memberSelect =
  "id, employee_no, employee_code, name, nickname, chinese_name, sick_leave_remaining, personal_leave_remaining, vacation_leave_remaining, color, is_active, created_at, updated_at";
const legacyMemberSelect =
  "id, employee_no, name, nickname, chinese_name, color, is_active, created_at, updated_at";

export async function fetchAdminMembers(supabase: SupabaseClient) {
  let { data, error } = await supabase
    .from("members")
    .select(memberSelect)
    .order("employee_no", { ascending: true });

  if (error && isSchemaOutdatedError(error)) {
    const legacyResult = await supabase
      .from("members")
      .select(legacyMemberSelect)
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
    throw new Error(getDatabaseErrorMessage(error, "ไม่สามารถดึงข้อมูลสมาชิกได้"));
  }
  return (data ?? []) as Member[];
}

export async function createMember(
  supabase: SupabaseClient,
  payload: Partial<MemberPayload>,
) {
  const validPayload = validateMemberPayload(payload);
  let { data, error } = await supabase
    .from("members")
    .insert({
      employee_no: validPayload.employeeNo,
      employee_code: validPayload.employeeCode,
      name: validPayload.name,
      nickname: validPayload.nickname,
      chinese_name: validPayload.chineseName,
      sick_leave_remaining: validPayload.sickLeaveRemaining,
      personal_leave_remaining: validPayload.personalLeaveRemaining,
      vacation_leave_remaining: validPayload.vacationLeaveRemaining,
      color: validPayload.color,
      is_active: validPayload.isActive,
    })
    .select("id")
    .single();

  if (error && isSchemaOutdatedError(error)) {
    if (validPayload.employeeCode) {
      throw new Error("ยังบันทึกรหัสพนักงานไม่ได้ กรุณารัน supabase/schema.sql ใน Supabase SQL Editor ก่อน");
    }

    const legacyResult = await supabase
      .from("members")
      .insert({
        employee_no: validPayload.employeeNo,
        name: validPayload.name,
        nickname: validPayload.nickname,
        chinese_name: validPayload.chineseName,
        color: validPayload.color,
        is_active: validPayload.isActive,
      })
      .select("id")
      .single();
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    if (error.message.includes("duplicate")) {
      throw new Error("เลขลำดับหรือรหัสพนักงานนี้มีอยู่แล้ว");
    }
    throw new Error("ไม่สามารถเพิ่มสมาชิกได้");
  }

  return data;
}

export async function updateMember(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<MemberPayload>,
) {
  const validPayload = validateMemberPayload(payload);
  let { data, error } = await supabase
    .from("members")
    .update({
      employee_no: validPayload.employeeNo,
      employee_code: validPayload.employeeCode,
      name: validPayload.name,
      nickname: validPayload.nickname,
      chinese_name: validPayload.chineseName,
      sick_leave_remaining: validPayload.sickLeaveRemaining,
      personal_leave_remaining: validPayload.personalLeaveRemaining,
      vacation_leave_remaining: validPayload.vacationLeaveRemaining,
      color: validPayload.color,
      is_active: validPayload.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .single();

  if (error && isSchemaOutdatedError(error)) {
    if (validPayload.employeeCode) {
      throw new Error("ยังบันทึกรหัสพนักงานไม่ได้ กรุณารัน supabase/schema.sql ใน Supabase SQL Editor ก่อน");
    }

    const legacyResult = await supabase
      .from("members")
      .update({
        employee_no: validPayload.employeeNo,
        name: validPayload.name,
        nickname: validPayload.nickname,
        chinese_name: validPayload.chineseName,
        color: validPayload.color,
        is_active: validPayload.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single();
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    if (error.message.includes("duplicate")) {
      throw new Error("เลขลำดับหรือรหัสพนักงานนี้มีอยู่แล้ว");
    }
    throw new Error("ไม่สามารถแก้ไขสมาชิกได้");
  }

  return data;
}

export async function fetchWeeklyHolidays(
  supabase: SupabaseClient,
  includeInactive = false,
) {
  const relatedMemberSelect = includeInactive
    ? `members(${memberSelect})`
    : `members!inner(${memberSelect})`;
  const query = supabase
    .from("weekly_holidays")
    .select(
      `id, member_id, weekday, created_at, updated_at, ${relatedMemberSelect}`,
    )
    .order("weekday", { ascending: true });

  const result = await (includeInactive
    ? query
    : query.eq("members.is_active", true));
  let data: unknown[] | null = result.data;
  let error = result.error;

  if (error && isSchemaOutdatedError(error)) {
    const legacyRelatedMemberSelect = includeInactive
      ? `members(${legacyMemberSelect})`
      : `members!inner(${legacyMemberSelect})`;
    const legacyQuery = supabase
      .from("weekly_holidays")
      .select(`id, member_id, weekday, created_at, updated_at, ${legacyRelatedMemberSelect}`)
      .order("weekday", { ascending: true });
    const legacyResult = await (includeInactive
      ? legacyQuery
      : legacyQuery.eq("members.is_active", true));
    data =
      legacyResult.data?.map((holiday) => {
        const row = holiday as unknown as {
          members: Record<string, unknown> | Record<string, unknown>[] | null;
        };
        const members = row.members;

        return {
          ...holiday,
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
    error = legacyResult.error;
  }
  if (error) {
    throw new Error(
      getDatabaseErrorMessage(error, "ไม่สามารถดึงข้อมูลวันหยุดประจำสัปดาห์ได้"),
    );
  }

  return ((data ?? []) as RawWeeklyHoliday[])
    .map((holiday) => ({
      ...holiday,
      member: Array.isArray(holiday.members) ? holiday.members[0] : holiday.members,
    }))
    .filter((holiday) => holiday.member) as WeeklyHoliday[];
}

export async function createWeeklyHoliday(
  supabase: SupabaseClient,
  payload: Partial<WeeklyHolidayPayload>,
) {
  const validPayload = validateWeeklyHolidayPayload(payload);
  const { data, error } = await supabase
    .from("weekly_holidays")
    .insert({
      member_id: validPayload.memberId,
      weekday: validPayload.weekday,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("duplicate")) {
      throw new Error("สมาชิกคนนี้มีวันหยุดประจำสัปดาห์วันนี้อยู่แล้ว");
    }
    throw new Error("ไม่สามารถเพิ่มวันหยุดประจำสัปดาห์ได้");
  }

  return data;
}

export async function deleteWeeklyHoliday(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("weekly_holidays").delete().eq("id", id);
  if (error) throw new Error("ไม่สามารถลบวันหยุดประจำสัปดาห์ได้");
}

function validateMemberPayload(payload: Partial<MemberPayload>) {
  const employeeNo = Number(payload.employeeNo);
  const employeeCode = payload.employeeCode?.trim().toUpperCase() ?? "";
  const name = payload.name?.trim().toUpperCase();
  const nickname = payload.nickname?.trim() ?? "";
  const chineseName = payload.chineseName?.trim() ?? "";
  const sickLeaveRemaining = parseLeaveDays(payload.sickLeaveRemaining);
  const personalLeaveRemaining = parseLeaveDays(payload.personalLeaveRemaining);
  const vacationLeaveRemaining = parseLeaveDays(payload.vacationLeaveRemaining);
  const color = payload.color?.trim();
  const isActive = Boolean(payload.isActive);

  if (!Number.isInteger(employeeNo) || employeeNo < 1) {
    throw new Error("กรุณากรอกเลขลำดับสมาชิกให้ถูกต้อง");
  }
  if (!name) throw new Error("กรุณากรอกชื่อสมาชิก");
  if (!/^#[0-9a-fA-F]{6}$/.test(color ?? "")) {
    throw new Error("กรุณาเลือกสีสมาชิกให้ถูกต้อง");
  }

  return {
    employeeNo,
    employeeCode,
    name,
    nickname,
    chineseName,
    sickLeaveRemaining,
    personalLeaveRemaining,
    vacationLeaveRemaining,
    color: color as string,
    isActive,
  };
}

function parseLeaveDays(value: unknown) {
  const days = Number(value ?? 0);
  if (!Number.isFinite(days) || days < 0) {
    throw new Error("กรุณากรอกจำนวนวันลาคงเหลือให้ถูกต้อง");
  }

  return Math.round(days * 100) / 100;
}

function validateWeeklyHolidayPayload(payload: Partial<WeeklyHolidayPayload>) {
  const memberId = payload.memberId?.trim();
  const weekday = Number(payload.weekday);

  if (!memberId) throw new Error("กรุณาเลือกสมาชิก");
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("กรุณาเลือกวันหยุดให้ถูกต้อง");
  }

  return { memberId, weekday };
}
