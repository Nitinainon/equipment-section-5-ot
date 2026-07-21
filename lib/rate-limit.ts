import type { NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_MUTATIONS_PER_WINDOW = 20;

export function assertMutationRateLimit(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "anonymous";
  const key = `ot-mutation:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (current.count >= MAX_MUTATIONS_PER_WINDOW) {
    throw new Error("มีการส่งข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองอีกครั้ง");
  }

  current.count += 1;
}
