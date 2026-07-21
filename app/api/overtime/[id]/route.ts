import { NextRequest, NextResponse } from "next/server";
import { deleteOvertime, updateOvertime } from "@/lib/overtime-service";
import { assertMutationRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { OvertimePayload } from "@/lib/types";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    assertMutationRateLimit(request);
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<OvertimePayload>;
    const supabase = getSupabaseAdmin();
    await updateOvertime(supabase, id, payload);

    return NextResponse.json({
      message:
        payload.entryType === "absent"
          ? "แก้ไขข้อมูลไม่มาทำงานเรียบร้อยแล้ว"
          : "แก้ไขข้อมูล OT เรียบร้อยแล้ว",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    assertMutationRateLimit(request);
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const deleted = await deleteOvertime(supabase, id);

    return NextResponse.json({
      message:
        deleted?.entry_type === "absent"
          ? "ลบข้อมูลไม่มาทำงานเรียบร้อยแล้ว"
          : "ลบข้อมูล OT เรียบร้อยแล้ว",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}
