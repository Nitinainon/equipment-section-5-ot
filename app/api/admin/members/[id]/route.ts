import { NextRequest, NextResponse } from "next/server";
import { assertAdminCode } from "@/lib/admin";
import { updateMember } from "@/lib/admin-service";
import { assertMutationRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { MemberPayload } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    assertAdminCode(request);
    assertMutationRateLimit(request);
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<MemberPayload>;
    const supabase = getSupabaseAdmin();
    await updateMember(supabase, id, payload);
    return NextResponse.json({ message: "แก้ไขสมาชิกเรียบร้อยแล้ว" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}
