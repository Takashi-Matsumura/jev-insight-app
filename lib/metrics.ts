import "server-only";

// 当日にアクセスがどれだけ集中したかを、あとから見るための計測。
// 1 件ずつは残さず、1 分ごと・種類ごとに件数と処理時間をメモリで数え、instrumentation.ts が 10 秒ごとに DB へ足し込む。
// proxy.ts からも呼ぶので、ここでは DB に触らない。IP アドレスや来場者証などの中身は数えない

type Bucket = { count: number; errors: number; totalMs: number; maxMs: number; maxInflight: number };
export type MetricRow = Bucket & { minute: number; key: string };

type Store = { buckets: Map<string, MetricRow>; inflight: Map<string, number> };

// proxy とページで読み込まれるモジュールが分かれても、同じプロセスなら同じ入れ物を使う
const g = globalThis as unknown as { __insightMetrics?: Store };
function store() {
  return (g.__insightMetrics ??= { buckets: new Map(), inflight: new Map() });
}

function bucket(key: string) {
  const minute = Math.floor(Date.now() / 60_000) * 60;
  const id = `${minute} ${key}`;
  const buckets = store().buckets;
  let b = buckets.get(id);
  if (!b) buckets.set(id, (b = { minute, key, count: 0, errors: 0, totalMs: 0, maxMs: 0, maxInflight: 0 }));
  return b;
}

// 件数だけを数える（proxy でのリクエスト数）
export function count(key: string) {
  bucket(key).count++;
}

// redirect() や notFound() は例外で知らせるので、失敗に数えない
function isNextControlFlow(e: unknown) {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

// 処理時間と、同時に動いていた数の最大を測る
export async function measure<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const inflight = store().inflight;
  const running = (inflight.get(key) ?? 0) + 1;
  inflight.set(key, running);
  const started = bucket(key);
  started.maxInflight = Math.max(started.maxInflight, running);
  const start = performance.now();
  let failed = false;
  try {
    return await fn();
  } catch (e) {
    failed = !isNextControlFlow(e);
    throw e;
  } finally {
    inflight.set(key, (inflight.get(key) ?? 1) - 1);
    const ms = performance.now() - start;
    const b = bucket(key);
    b.count++;
    if (failed) b.errors++;
    b.totalMs += ms;
    b.maxMs = Math.max(b.maxMs, ms);
  }
}

// DB に書く分を取り出して、入れ物を空にする
export function takeMetrics(): MetricRow[] {
  const s = store();
  const rows = [...s.buckets.values()];
  s.buckets = new Map();
  return rows;
}
