export function getDatabaseErrorMessage(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  if (error?.code === "PGRST204" || error?.message?.includes("column")) {
    return "โครงสร้างตาราง Supabase ยังไม่ล่าสุด กรุณารันไฟล์ supabase/schema.sql ซ้ำใน SQL Editor";
  }

  if (error?.code === "PGRST205" || error?.message?.includes("schema cache")) {
    return "ยังไม่พบตารางใน Supabase กรุณารันไฟล์ supabase/schema.sql และ supabase/seed.sql ใน SQL Editor";
  }

  return fallback;
}

export function isSchemaOutdatedError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("schema cache") ||
    error?.message?.includes("column")
  );
}
