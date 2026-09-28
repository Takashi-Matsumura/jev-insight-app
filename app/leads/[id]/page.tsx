import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { InsightCard } from "@/components/InsightCard";
import { SummaryView } from "@/components/LeadSummary";
import { RegenerateButton } from "@/components/RegenerateButton";
import { getSession, listUtterances } from "@/lib/pipeline";
import { displayCompany } from "@/lib/topics";

// ブース担当者向けのリード詳細（商談見込み・次のアクションなど）。来場者には見せない
export default async function LeadPage(props: PageProps<"/leads/[id]">) {
  await connection();
  const { id } = await props.params;
  const session = await getSession(id);
  if (!session) notFound();
  const items = await listUtterances(id);

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <nav className="flex justify-between text-sm text-zinc-500">
        <Link href="/">← 一覧へ</Link>
        <Link href={`/sessions/${id}`}>{session.status === "recording" ? "会話に戻る" : "来場者向けまとめ"} →</Link>
      </nav>
      <header className="mb-4 mt-2">
        <p className="text-xs font-semibold text-zinc-500">リード（担当者用）</p>
        <h1 className="text-xl font-bold">{displayCompany(session.company)}</h1>
        <p className="text-sm text-zinc-500">
          {[session.visitorName, session.department, session.position, session.staffName && `担当: ${session.staffName}`]
            .filter(Boolean)
            .join(" / ")}
        </p>
        {session.badgeCode && <p className="mt-1 break-all font-mono text-xs text-zinc-400">QR: {session.badgeCode}</p>}
      </header>

      <div className="flex flex-col gap-6">
        {session.status === "finalized" && (
          <section className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
            <span className="text-4xl font-bold">{session.leadGrade}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              商談見込み（Jev {session.leadScore?.toFixed(2)} / 3）
            </span>
            <span className="ml-auto">
              <RegenerateButton sessionId={id} />
            </span>
          </section>
        )}

        {session.summary ? (
          <SummaryView summary={session.summary} />
        ) : (
          <p className="text-sm text-zinc-500">
            {session.status === "recording"
              ? "会話中です。終了するとまとめが作成されます。"
              : items.length
                ? "まとめを作成できませんでした。作り直してください。"
                : "課題に関係する発言はありませんでした。"}
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
    </main>
  );
}
