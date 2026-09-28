import { signalLabel } from "@/lib/topics";
import { TopicBadge } from "./TopicBadge";

export type InsightItem = {
  id: number;
  text: string;
  topic: string;
  signal: string;
  severity: number;
  budgetSignal: number;
  timelineSignal: number;
  decisionMakerSignal: number;
};

const FLAG_THRESHOLD = 0.5;

export function InsightCard({ item }: { item: InsightItem }) {
  const level = Math.round(item.severity);
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
        <span className="ml-auto text-amber-500" aria-label={`深刻度 ${level} / 5`}>
          {"●".repeat(level)}
          <span className="text-zinc-300 dark:text-zinc-700">{"●".repeat(5 - level)}</span>
        </span>
      </div>
      <p className="text-[15px] leading-relaxed">{item.text}</p>
    </li>
  );
}
