import type { NextRequest } from "next/server";

const ADMIN_HEADER = "x-admin-code";

export function assertAdminCode(request: NextRequest) {
  const configuredCode = process.env.ADMIN_CODE;
  const providedCode = request.headers.get(ADMIN_HEADER)?.trim();

  if (!configuredCode) {
    throw new Error("ยังไม่ได้ตั้งค่า ADMIN_CODE ใน Environment Variables");
  }

  if (!providedCode || providedCode !== configuredCode) {
    throw new Error("รหัส admin ไม่ถูกต้อง");
  }
}
