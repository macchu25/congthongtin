type Entry = { count: number; reset: number };
const globalLimit = globalThis as typeof globalThis & { rateLimits?: Map<string, Entry> };
const buckets = globalLimit.rateLimits ?? new Map<string, Entry>();
globalLimit.rateLimits = buckets;
export function rateLimit(key: string, limit = 8, windowMs = 15 * 60_000) {
  const now = Date.now(); let entry = buckets.get(key);
  if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; buckets.set(key, entry); }
  entry.count++;
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  return { allowed: entry.count <= limit, retryAfter: Math.max(1, Math.ceil((entry.reset - now) / 1000)) };
}
