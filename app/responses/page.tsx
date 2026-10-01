import { desc, ne } from "drizzle-orm";
import { ChevronDown, CircleCheck, Download } from "lucide-react";
import { connection } from "next/server";
import { LogoutTitle } from "@/components/LogoutTitle";
import { NavLink } from "@/components/NavLink";
import { StaffTabs } from "@/components/StaffTabs";
import { SurveyAnswers } from "@/components/SurveyAnswers";
import { SurveyQrButton } from "@/components/SurveyQrButton";
import { getDb, schema } from "@/lib/db";
import { ticketNumber } from "@/lib/survey";
import { displayCompany } from "@/lib/topics";

// 来場者アンケートの回答一覧（担当者用）
export default async function ResponsesPage() {
  await connection();
  const db = getDb();
  const responses = await db.select().from(schema.surveyResponses).orderBy(desc(schema.surveyResponses.createdAt));
  // 同じ来場者バッジの課題メモがあれば、行からたどれるようにする
  const sessions = await db
    .select({ id: schema.sessions.id, badgeCode: schema.sessions.badgeCode })
    .from(schema.sessions)
    .where(ne(schema.sessions.badgeCode, ""))
    .orderBy(desc(schema.sessions.createdAt));
  const sessionByBadge = new Map<string, string>();
  for (const s of sessions) if (!sessionByBadge.has(s.badgeCode)) sessionByBadge.set(s.badgeCode, s.id);

  const redeemedCount = responses.filter((r) => r.redeemedAt).length;

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <LogoutTitle>アンケート回答</LogoutTitle>
        <a href="/api/export/survey" className="inline-flex items-center gap-1 text-sm text-zinc-500">
          <Download className="size-4" aria-hidden />
          CSV出力
        </a>
      </header>

      <StaffTabs current="survey" />

      <SurveyQrButton />

      <p className="mb-3 text-sm text-zinc-500">
        回答 {responses.length} 件 / コーヒーお渡し済み {redeemedCount} 件
      </p>

      <ul className="flex flex-col gap-2">
        {responses.map((r) => {
          const sessionId = sessionByBadge.get(r.badgeCode);
          return (
            <li key={r.id} id={`r-${r.id}`} className="scroll-mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                  <span className="w-12 shrink-0 text-center font-mono text-lg font-bold">{ticketNumber(r.id)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{displayCompany(r.company)}</span>
                    <span className="block truncate text-sm text-zinc-500">{r.visitorName}</span>
                    {r.redeemedAt && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        <CircleCheck className="size-3.5" aria-hidden />
                        お渡し済み
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {r.createdAt.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="flex flex-col gap-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
                  <SurveyAnswers answers={r.answers} />
                  <p className="break-all font-mono text-xs text-zinc-400">QR: {r.badgeCode}</p>
                  {sessionId && (
                    <NavLink href={`/leads/${sessionId}`} forward>
                      この来場者の課題メモ
                    </NavLink>
                  )}
                </div>
              </details>
            </li>
          );
        })}
        {responses.length === 0 && <li className="py-8 text-center text-zinc-500">まだ回答がありません</li>}
      </ul>
    </main>
  );
}
