import { signalLabel } from "@/lib/topics";
import { TopicBadge } from "./TopicBadge";

export type InsightItem = {
  id: number;
  text: string;
  relevance: number;
  topic: string;
  signal: string;
  severity: number;
  budgetSignal: number;
  timelineSignal: number;
  decisionMakerSignal: number;
};

const FLAG_THRESHOLD = 0.5;

// 深刻度（1〜5）に応じた数値の色
function severityColor(v: number) {
  if (v >= 4) return "text-rose-600";
  if (v >= 3) return "text-amber-600";
  return "text-zinc-500";
}

export function InsightCard({ item }: { item: InsightItem }) {
  const flags = [
    item.budgetSignal >= FLAG_THRESHOLD && "予算",
    item.timelineSignal >= FLAG_THRESHOLD && "時期",
    item.decisionMakerSignal >= FLAG_THRESHOLD && "決裁",
  ].filter(Boolean);

  return (
    <li className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
        <TopicBadge topic={item.topic} />
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{signalLabel(item.signal)}</span>
        {flags.map((f) => (
          <span key={f as string} className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
            {f}
          </span>
        ))}
      </div>
      <p className="text-[15px] leading-relaxed">{item.text}</p>
      <div className="mt-2 flex items-baseline gap-4 font-mono tabular-nums">
        <span className="text-xs text-zinc-500">
          課題スコア <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{item.relevance.toFixed(2)}</span>
        </span>
        <span className="text-xs text-zinc-500">
          深刻度{" "}
          <span className={`text-base font-bold ${severityColor(item.severity)}`}>{item.severity.toFixed(2)}</span>
          <span className="text-zinc-400"> / 5</span>
        </span>
      </div>
    </li>
  );
}

// 課題とみなさなかった発言（保存しない。画面上で判定結果だけ見せる）
export function DiscardedLine({ text, relevance, reason }: { text: string; relevance: number; reason: string }) {
  const label =
    reason === "probe_echo"
      ? "質問の読み上げ"
      : reason === "not_visitor"
        ? "来場者の話ではない"
        : reason === "too_short"
          ? "短すぎる"
          : "課題ではない";
  return (
    <li className="flex items-baseline gap-2 px-1 text-sm text-zinc-400">
      <span className="min-w-0 flex-1 line-through decoration-zinc-300">{text}</span>
      <span className="shrink-0 font-mono text-xs tabular-nums">
        {reason === "not_relevant" ? `${relevance.toFixed(2)} ` : ""}
        {label}
      </span>
    </li>
  );
}

export function PendingLine({ text, label }: { text: string; label: string }) {
  return (
    <li className="flex items-baseline gap-2 px-1 text-sm text-zinc-500">
      <span className="min-w-0 flex-1">{text}</span>
      <span className="shrink-0 animate-pulse text-xs">{label}</span>
    </li>
  );
}
