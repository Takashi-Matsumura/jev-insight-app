import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { InsightCard } from "@/components/InsightCard";
import { Recorder } from "@/components/Recorder";
import { RegenerateButton } from "@/components/RegenerateButton";
import { TopicBadge } from "@/components/TopicBadge";
import type { Summary } from "@/lib/gemma-schema";
import { getSession, listUtterances } from "@/lib/pipeline";
import type { ProbeKey } from "@/lib/probes";
import { displayCompany } from "@/lib/topics";

export default async function SessionPage(props: PageProps<"/sessions/[id]">) {
  await connection();
  const { id } = await props.params;
  const session = await getSession(id);
  if (!session) notFound();
  const items = await listUtterances(id);

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <Link href="/" className="text-sm text-zinc-500">
        ← 一覧へ
      </Link>
      <header className="mb-2 mt-2">
        <h1 className="text-xl font-bold">{displayCompany(session.company)}</h1>
        <p className="text-sm text-zinc-500">
          {[session.visitorName, session.department, session.position].filter(Boolean).join(" / ")}
        </p>
        {session.badgeCode && (
          <p className="mt-1 break-all font-mono text-xs text-zinc-400">QR: {session.badgeCode}</p>
        )}
      </header>

      {session.status === "recording" ? (
        <Recorder sessionId={id} initialItems={items} initialProbe={session.nextProbe as ProbeKey | null}
          initialLeadScore={session.leadScore}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
            <span className="text-4xl font-bold">{session.leadGrade}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              商談見込み（Jev 判定 {session.leadScore?.toFixed(2)} / 3）
            </span>
            <span className="ml-auto">
              <RegenerateButton sessionId={id} />
            </span>
          </section>

          {session.summary ? (
            <SummaryView summary={session.summary} />
          ) : (
            <p className="text-sm text-zinc-500">
              {items.length ? "まとめを作成できませんでした。作り直してください。" : "課題に関係する発言はありませんでした。"}
            </p>
          )}

          {items.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">抜き出した発言</h2>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <InsightCard key={item.id} item={item} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function SummaryView({ summary }: { summary: Summary }) {
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
