import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน Environment Variables",
    );
  }

  if (
    url.includes("your-project.supabase.co") ||
    serviceRoleKey === "your-service-role-key"
  ) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Supabase จริง กรุณาใส่ SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY จาก Supabase",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
