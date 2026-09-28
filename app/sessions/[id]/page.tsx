import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Recorder } from "@/components/Recorder";
import { RegenerateButton } from "@/components/RegenerateButton";
import { VisitorReportView } from "@/components/VisitorReportView";
import { getSession, listUtterances } from "@/lib/pipeline";
import type { ProbeKey } from "@/lib/probes";
import { displayCompany } from "@/lib/topics";

export default async function SessionPage(props: PageProps<"/sessions/[id]">) {
  await connection();
  const { id } = await props.params;
  const session = await getSession(id);
  if (!session) notFound();
  const items = await listUtterances(id);

  if (session.status === "recording") {
    return (
      <main className="mx-auto w-full max-w-2xl p-4">
        <Link href="/" className="text-sm text-zinc-500">
          ← 一覧へ
        </Link>
        <header className="mb-2 mt-2">
          <h1 className="text-xl font-bold">{displayCompany(session.company)}</h1>
          <p className="text-sm text-zinc-500">{session.visitorName}</p>
        </header>
        <Recorder
          sessionId={id}
          initialItems={items}
          initialProbe={session.nextProbe as ProbeKey | null}
          initialLeadScore={session.leadScore}
        />
      </main>
    );
  }

  // 会話終了後は来場者本人に見せる画面。担当者向けの情報（見込み等）は /leads/[id] にだけ出す
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-10">
      <header className="mb-6 mt-4">
        <p className="text-sm text-zinc-500">{session.company}</p>
        {session.visitorName && <p className="text-xl font-bold">{session.visitorName} 様</p>}
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          本日はブースにお立ち寄りいただき、ありがとうございました。お話をもとに、課題を整理しました。
        </p>
      </header>

      {session.visitorReport ? (
        <VisitorReportView report={session.visitorReport} items={items} />
      ) : (
        <div className="flex flex-col items-start gap-2 rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
          <p>
            {items.length
              ? "まとめを作成できませんでした。"
              : "今回のお話からは、課題として整理できる内容が見つかりませんでした。"}
          </p>
          {items.length > 0 && <RegenerateButton sessionId={id} />}
        </div>
      )}

      <footer className="mt-10 flex flex-col items-center gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Link
          href="/sessions/new"
          className="w-full rounded-xl bg-zinc-900 py-3 text-center font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          次の来場者へ
        </Link>
        <Link href={`/leads/${id}`} className="text-xs text-zinc-400">
          担当者用
        </Link>
      </footer>
    </main>
  );
}
