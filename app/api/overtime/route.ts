import { NextRequest, NextResponse } from "next/server";
import { createOvertime, fetchOvertimeByMonth } from "@/lib/overtime-service";
import { assertMutationRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { OvertimePayload } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const month =
      request.nextUrl.searchParams.get("month") ??
      new Date().toISOString().slice(0, 7);
    const memberId = request.nextUrl.searchParams.get("memberId") ?? undefined;
    const supabase = getSupabaseAdmin();
    const data = await fetchOvertimeByMonth(supabase, month, memberId);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    assertMutationRateLimit(request);
    const payload = (await request.json()) as Partial<OvertimePayload>;
    const supabase = getSupabaseAdmin();
    await createOvertime(supabase, payload);

    return NextResponse.json({
      message:
        payload.entryType === "absent"
          ? "บันทึกข้อมูลไม่มาทำงานเรียบร้อยแล้ว"
          : "บันทึกข้อมูล OT เรียบร้อยแล้ว",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}
