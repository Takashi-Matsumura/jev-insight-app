import { TOPICS, type Topic } from "@/lib/topics";

type Item = { topic: string; relevance: number; severity: number };

// お話の中でどのテーマの比重が大きかったか（Jev の課題スコア × 深刻度で重み付け）。
// 大きさを比べるだけなので1色の横棒にし、テーマ名と割合を直接書く。
export function TopicShare({ items }: { items: Item[] }) {
  const byTopic = new Map<Topic, { weight: number; count: number; severity: number }>();
  for (const u of items) {
    const key = (u.topic in TOPICS ? u.topic : "other_business") as Topic;
    const cur = byTopic.get(key) ?? { weight: 0, count: 0, severity: 0 };
    byTopic.set(key, {
      weight: cur.weight + u.relevance * u.severity,
      count: cur.count + 1,
      severity: cur.severity + u.severity,
    });
  }
  const total = [...byTopic.values()].reduce((a, b) => a + b.weight, 0);
  if (total === 0) return null;
  const rows = [...byTopic.entries()]
    .map(([topic, v]) => ({ topic, share: v.weight / total, count: v.count, avgSeverity: v.severity / v.count }))
    .sort((a, b) => b.share - a.share);

  return (
    <figure className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div
          key={r.topic}
          className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3"
          title={`${TOPICS[r.topic].label}: ${r.count}件の発言・平均深刻度 ${r.avgSeverity.toFixed(2)}`}
        >
          <span className="truncate text-sm">{TOPICS[r.topic].label}</span>
          <span className="h-3 rounded-r bg-zinc-100 dark:bg-zinc-800">
            <span className="block h-full rounded-r bg-sky-600 dark:bg-sky-400" style={{ width: `${r.share * 100}%` }} />
          </span>
          <span className="text-right font-mono text-sm font-semibold tabular-nums">{Math.round(r.share * 100)}%</span>
        </div>
      ))}
      <figcaption className="text-xs text-zinc-500">
        {items.length}件の発言を Jev が分析（課題スコア × 深刻度で重み付け）
      </figcaption>
    </figure>
  );
}
