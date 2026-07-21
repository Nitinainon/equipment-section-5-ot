import { NextRequest, NextResponse } from "next/server";
import { assertAdminCode } from "@/lib/admin";
import { createMember, fetchAdminMembers } from "@/lib/admin-service";
import { assertMutationRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { MemberPayload } from "@/lib/types";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    assertAdminCode(request);
    const supabase = getSupabaseAdmin();
    const members = await fetchAdminMembers(supabase);
    return NextResponse.json({ members });
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
    const payload = (await request.json()) as Partial<MemberPayload>;
    const supabase = getSupabaseAdmin();
    await createMember(supabase, payload);
    return NextResponse.json({ message: "เพิ่มสมาชิกเรียบร้อยแล้ว" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 },
    );
  }
}
