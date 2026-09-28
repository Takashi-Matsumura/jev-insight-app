import { TOPICS, type Topic } from "@/lib/topics";

export function TopicBadge({ topic }: { topic: string }) {
  const t = TOPICS[topic as Topic] ?? TOPICS.other_business;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.color}`}>{t.label}</span>;
}
