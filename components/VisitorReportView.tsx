import { Lightbulb } from "lucide-react";
import type { VisitorReport } from "@/lib/gemma-schema";
import { TOPICS } from "@/lib/topics";
import { TopicShare } from "./TopicShare";

type Item = { topic: string; relevance: number; severity: number };

// 来場者本人に見せる「今日のお話のまとめ」
export function VisitorReportView({ report, items }: { report: VisitorReport; items: Item[] }) {
  // 本人が気づいていないかもしれない課題を先に見せる
  const issues = [...report.issues].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "underlying" ? -1 : 1));

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-zinc-900 p-5 text-white dark:bg-zinc-100 dark:text-zinc-900">
        <p className="mb-2 text-xs font-semibold tracking-wider opacity-60">今日のお話をひとことで</p>
        <p className="text-xl font-bold leading-relaxed">{report.headline}</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">お話から見えてきた課題</h2>
        <ol className="flex flex-col gap-3">
          {issues.map((issue, i) => {
            const underlying = issue.kind === "underlying";
            return (
              <li
                key={i}
                className={`rounded-2xl border p-4 ${underlying ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40" : "border-zinc-200 dark:border-zinc-800"}`}
              >
                <p
                  className={`mb-1 flex items-center gap-1 text-xs font-semibold ${underlying ? "text-amber-700 dark:text-amber-300" : "text-zinc-500"}`}
                >
                  {underlying && <Lightbulb className="size-4" aria-hidden />}
                  {underlying ? "背景にある、見えにくい課題" : "お話しいただいた課題"}
                </p>
                <p className="text-lg font-bold leading-snug">{issue.title}</p>
                <p className="mt-2 leading-relaxed">{issue.insight}</p>
                {issue.your_words.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    {issue.your_words.map((w, j) => (
                      <blockquote key={j} className="border-l-2 border-zinc-300 pl-2 text-sm text-zinc-500">
                        「{w}」
                      </blockquote>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">お話のテーマ</h2>
        <TopicShare items={items} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">おすすめの業務改善</h2>
        <ol className="flex flex-col gap-3">
          {report.recommendations.map((r, i) => (
            <li key={i} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOPICS[r.category].color}`}>
                {TOPICS[r.category].label}
              </span>
              <p className="mt-2 text-lg font-bold leading-snug">{r.title}</p>
              <p className="mt-1 leading-relaxed">{r.why}</p>
              <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                <p className="text-xs font-semibold">最初の一歩</p>
                <p className="text-sm leading-relaxed">{r.first_step}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-center leading-relaxed text-zinc-600 dark:text-zinc-400">{report.message}</p>
    </div>
  );
}
