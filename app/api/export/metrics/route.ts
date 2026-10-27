import { asc } from "drizzle-orm";
import { csvResponse } from "@/lib/csv";
import { getDb, schema } from "@/lib/db";
import { flushMetrics } from "@/lib/metrics-store";

// 1 分ごとのアクセス数と処理時間の CSV（全期間）。当日の負荷をあとから分析するために使う
export async function GET() {
  flushMetrics();
  const { metrics } = schema;
  const rows = await getDb().select().from(metrics).orderBy(asc(metrics.minute), asc(metrics.key));
  const time = (minute: number) => new Date(minute * 1000).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const header = ["時刻（1分の始まり）", "種類", "件数", "失敗", "平均（ms）", "最大（ms）", "同時（最大）"];
  const lines = rows.map((r) => [
    time(r.minute),
    r.key,
    String(r.count),
    String(r.errors),
    r.count ? String(Math.round(r.totalMs / r.count)) : "",
    String(Math.round(r.maxMs)),
    String(r.maxInflight),
  ]);
  return csvResponse([header, ...lines], "load-metrics.csv");
}
