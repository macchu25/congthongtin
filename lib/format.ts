export function isoDay(date = new Date()) { return date.toISOString().slice(0, 10); }
export function dateDaysAgo(days: number) { const d = new Date(); d.setUTCDate(d.getUTCDate() - days); return d; }
