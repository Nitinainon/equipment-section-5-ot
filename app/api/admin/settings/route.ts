import { NextRequest, NextResponse } from "next/server";
import { assertAdminCode } from "@/lib/admin";
import { assertMutationRateLimit } from "@/lib/rate-limit";
import { fetchDisplaySettings, updateDisplaySettings } from "@/lib/settings-service";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DisplaySettings } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    assertAdminCode(request);
    const supabase = getSupabaseAdmin();
    const settings = await fetchDisplaySettings(supabase);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 401 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertAdminCode(request);
    assertMutationRateLimit(request);
    const payload = (await request.json()) as Partial<DisplaySettings>;
    const supabase = getSupabaseAdmin();
    const settings = await updateDisplaySettings(supabase, payload);
    return NextResponse.json({ settings, message: "บันทึกการตั้งค่าเรียบร้อยแล้ว" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}
