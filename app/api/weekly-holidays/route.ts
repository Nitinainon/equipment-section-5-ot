import { NextResponse } from "next/server";
import { fetchWeeklyHolidays } from "@/lib/admin-service";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const holidays = await fetchWeeklyHolidays(supabase);
    return NextResponse.json({ holidays });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 },
    );
  }
}
