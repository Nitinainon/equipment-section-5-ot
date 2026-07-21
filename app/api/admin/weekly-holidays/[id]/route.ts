import { NextRequest, NextResponse } from "next/server";
import { assertAdminCode } from "@/lib/admin";
import { deleteWeeklyHoliday } from "@/lib/admin-service";
import { assertMutationRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    assertAdminCode(request);
    assertMutationRateLimit(request);
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    await deleteWeeklyHoliday(supabase, id);
    return NextResponse.json({ message: "ลบวันหยุดประจำสัปดาห์เรียบร้อยแล้ว" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}
