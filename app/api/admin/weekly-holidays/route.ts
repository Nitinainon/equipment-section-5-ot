import { NextRequest, NextResponse } from "next/server";
import { assertAdminCode } from "@/lib/admin";
import {
  createWeeklyHoliday,
  fetchWeeklyHolidays,
} from "@/lib/admin-service";
import { assertMutationRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { WeeklyHolidayPayload } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    assertAdminCode(request);
    const supabase = getSupabaseAdmin();
    const holidays = await fetchWeeklyHolidays(supabase, true);
    return NextResponse.json({ holidays });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminCode(request);
    assertMutationRateLimit(request);
    const payload = (await request.json()) as Partial<WeeklyHolidayPayload>;
    const supabase = getSupabaseAdmin();
    await createWeeklyHoliday(supabase, payload);
    return NextResponse.json({ message: "เพิ่มวันหยุดประจำสัปดาห์เรียบร้อยแล้ว" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}
