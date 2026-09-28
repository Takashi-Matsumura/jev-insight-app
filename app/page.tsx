import { desc } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { TopicBadge } from "@/components/TopicBadge";
import { getDb, schema } from "@/lib/db";
import { displayCompany, TOPIC_KEYS, TOPICS, type Topic } from "@/lib/topics";

const GRADE_ORDER = { A: 0, B: 1, C: 2 } as const;

export default async function Home(props: PageProps<"/">) {
  await connection();
  const { topic } = await props.searchParams;
  const filter = TOPIC_KEYS.includes(topic as Topic) ? (topic as Topic) : null;

  const db = getDb();
  const sessions = await db.select().from(schema.sessions).orderBy(desc(schema.sessions.createdAt));
  const topicRows = await db
    .selectDistinct({ sessionId: schema.utterances.sessionId, topic: schema.utterances.topic })
    .from(schema.utterances);
  const topicsBySession = new Map<string, Topic[]>();
  for (const r of topicRows) {
    topicsBySession.set(r.sessionId, [...(topicsBySession.get(r.sessionId) ?? []), r.topic as Topic]);
  }

  const rows = sessions
    .filter((s) => !filter || topicsBySession.get(s.id)?.includes(filter))
    .sort((a, b) => (GRADE_ORDER[a.leadGrade ?? "C"] ?? 3) - (GRADE_ORDER[b.leadGrade ?? "C"] ?? 3));

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">ブース課題メモ</h1>
        <a href="/api/export" className="text-sm text-zinc-500 underline">
          CSV出力
        </a>
      </header>

      <Link
        href="/sessions/new"
        className="mb-4 block rounded-xl bg-zinc-900 py-4 text-center text-lg font-semibold text-white dark:bg-white dark:text-zinc-900"
      >
        ＋ 新しい来場者
      </Link>

      <nav className="mb-3 flex flex-wrap gap-2 text-sm">
        <FilterLink href="/" active={!filter} label="すべて" />
        {TOPIC_KEYS.map((t) => (
          <FilterLink key={t} href={`/?topic=${t}`} active={filter === t} label={TOPICS[t].label} />
        ))}
      </nav>

      <ul className="flex flex-col gap-2">
        {rows.map((s) => (
          <li key={s.id}>
            <Link
              href={s.status === "finalized" ? `/leads/${s.id}` : `/sessions/${s.id}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <span className="w-8 text-center text-2xl font-bold">
                {s.leadGrade ?? (s.status === "recording" ? "…" : "-")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{displayCompany(s.company)}</span>
                <span className="block truncate text-sm text-zinc-500">
                  {[s.visitorName, s.department, s.position].filter(Boolean).join(" / ")}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {topicsBySession.get(s.id)?.map((t) => <TopicBadge key={t} topic={t} />)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-zinc-400">
                {s.createdAt.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="py-8 text-center text-zinc-500">まだ記録がありません</li>}
      </ul>
    </main>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 ${active ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
    >
      {label}
    </Link>
  );
}
