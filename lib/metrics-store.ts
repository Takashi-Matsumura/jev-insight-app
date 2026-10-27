import "server-only";
import { sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { takeMetrics } from "./metrics";

const { metrics } = schema;

// メモリで数えた分を DB に足し込む。同じ 1 分を何回かに分けて書いても、件数と時間は足し、最大は大きい方を残す
export function flushMetrics() {
  const rows = takeMetrics();
  if (rows.length === 0) return;
  getDb()
    .insert(metrics)
    .values(rows)
    .onConflictDoUpdate({
      target: [metrics.minute, metrics.key],
      set: {
        count: sql`${metrics.count} + excluded.count`,
        errors: sql`${metrics.errors} + excluded.errors`,
        totalMs: sql`${metrics.totalMs} + excluded.total_ms`,
        maxMs: sql`max(${metrics.maxMs}, excluded.max_ms)`,
        maxInflight: sql`max(${metrics.maxInflight}, excluded.max_inflight)`,
      },
    })
    .run();
}
