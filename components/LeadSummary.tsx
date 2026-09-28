import type { Summary } from "@/lib/gemma-schema";
import { TopicBadge } from "./TopicBadge";

// ブース担当者向けのリードデータ表示
export function SummaryView({ summary }: { summary: Summary }) {
  return (
    <>
      <section>
        <h2 className="mb-1 font-semibold">概要</h2>
        <p className="leading-relaxed">{summary.overview}</p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">課題</h2>
        <ul className="flex flex-col gap-3">
          {summary.issues.map((issue, i) => (
            <li key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-1 flex items-center gap-2">
                <TopicBadge topic={issue.topic} />
                <span className="text-xs text-amber-600">深刻度 {issue.severity}/5</span>
              </div>
              <p className="font-semibold">{issue.title}</p>
              <p className="text-sm leading-relaxed">{issue.detail}</p>
              {issue.evidence.map((e, j) => (
                <blockquote key={j} className="mt-2 border-l-2 border-zinc-300 pl-2 text-xs text-zinc-500">
                  {e}
                </blockquote>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">提案できそうな領域</h2>
        <div className="flex flex-wrap gap-1">
          {summary.recommended_offerings.map((t) => (
            <TopicBadge key={t} topic={t} />
          ))}
        </div>
      </section>

      <ListSection title="まだ分かっていないこと" items={summary.unknowns} />
      <ListSection title="次のアクション" items={summary.next_actions} />

      <section>
        <h2 className="mb-1 font-semibold">アポイント依頼文（冒頭）</h2>
        <p className="rounded-xl bg-zinc-100 p-3 text-sm leading-relaxed dark:bg-zinc-900">{summary.appointment_pitch}</p>
      </section>
    </>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 font-semibold">{title}</h2>
      <ul className="list-disc pl-5 text-sm leading-relaxed">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
