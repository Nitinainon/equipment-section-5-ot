import { NextResponse } from "next/server";
import { fetchMembers } from "@/lib/overtime-service";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const members = await fetchMembers(supabase);
    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 },
    );
  }
}
