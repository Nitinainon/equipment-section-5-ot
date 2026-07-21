import { NextResponse } from "next/server";
import { fetchDisplaySettings } from "@/lib/settings-service";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const settings = await fetchDisplaySettings(supabase);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 },
    );
  }
}
