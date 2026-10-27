import { and, asc, gte, lt, sql } from "drizzle-orm";
import { Download } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { LogoutTitle } from "@/components/LogoutTitle";
import { NavLink } from "@/components/NavLink";
import { getDb, schema } from "@/lib/db";
import { flushMetrics } from "@/lib/metrics-store";
import { eventDay, eventDayLabel } from "@/lib/survey";

const { metrics } = schema;

// 表とグラフに出す順。ここに無い種類は表の最後に出す
const LABELS: Record<string, string> = {
  "req:survey": "アンケートの画面",
  "req:survey:post": "アンケートの操作（QR の確認・送信）",
  "req:ticket": "チケットの画面",
  "req:ticket:post": "チケットの操作（お渡し済み）",
  "survey:find": "QR の確認",
  "survey:submit": "アンケートの送信",
  "survey:redeem": "お渡し済みにする",
  "req:chunks:post": "録音の断片の受け取り",
  chunk: "録音の断片の処理（全体）",
  whisper: "文字起こし（whisper）",
  jev: "発話の判定（Jev）",
  "gemma:lead_summary": "担当者向けまとめ（gemma）",
  "gemma:visitor_report": "来場者向けまとめ（gemma）",
  "gemma:question": "別の問いかけ（gemma）",
  finalize: "会話の終了（まとめ作成の全体）",
  "req:staff": "担当者用の画面",
  "req:staff:post": "担当者用の操作",
};

// グラフにする指標。件数は「1 分あたりの件数」、時間は「その 1 分でいちばん遅かったもの」
const CHARTS = [
  { key: "req:survey", value: "count", title: "アンケートの画面の表示（件/分）" },
  { key: "survey:submit", value: "count", title: "アンケートの送信（件/分）" },
  { key: "survey:submit", value: "maxMs", title: "アンケートの送信にかかった時間（最大・ミリ秒）" },
  { key: "chunk", value: "maxInflight", title: "同時に処理していた録音の断片（最大）" },
  { key: "whisper", value: "maxMs", title: "文字起こしにかかった時間（最大・ミリ秒）" },
  { key: "jev", value: "maxMs", title: "Jev の判定にかかった時間（最大・ミリ秒）" },
  { key: "finalize", value: "maxMs", title: "会話の終了にかかった時間（最大・ミリ秒）" },
] as const;

type Row = typeof metrics.$inferSelect;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function clock(minute: number) {
  return new Date(minute * 1000).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
}

const number = (n: number) => Math.round(n).toLocaleString("ja-JP");

// 当日の負荷の記録（担当者用）。1 分ごとのアクセス数と処理時間を、日ごとに見る
export default async function MetricsPage(props: PageProps<"/metrics">) {
  await connection();
  // 直近 10 秒の分も見えるよう、開くたびに書き出す
  flushMetrics();
  const requested = (await props.searchParams).day;
  const day = typeof requested === "string" && DAY_PATTERN.test(requested) ? requested : eventDay();
  const start = Date.parse(`${day}T00:00:00+09:00`) / 1000;

  const db = getDb();
  const rows = await db
    .select()
    .from(metrics)
    .where(and(gte(metrics.minute, start), lt(metrics.minute, start + 86_400)))
    .orderBy(asc(metrics.minute));
  const days = (
    await db
      .selectDistinct({ day: sql<string>`date(${metrics.minute}, 'unixepoch', '+9 hours')` })
      .from(metrics)
      .orderBy(sql`1`)
  ).map((d) => d.day);

  const byKey = new Map<string, Row[]>();
  for (const r of rows) byKey.set(r.key, [...(byKey.get(r.key) ?? []), r]);
  const keys = [...byKey.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  const first = rows[0]?.minute;
  const last = rows.at(-1)?.minute;

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <LogoutTitle>負荷の記録</LogoutTitle>
        <a href="/api/export/metrics" className="inline-flex items-center gap-1 text-sm text-zinc-500">
          <Download className="size-4" aria-hidden />
          CSV出力
        </a>
      </header>
      <nav className="mb-4 flex justify-between">
        <NavLink href="/responses">アンケート回答へ</NavLink>
      </nav>

      <p className="mb-2 text-sm text-zinc-500">
        1 分ごとに、アクセスの件数と処理にかかった時間を記録しています（10 秒ごとに保存）。IP アドレスや回答の中身は記録しません。
      </p>
      {days.length > 0 && (
        <nav className="mb-4 flex flex-wrap gap-2 text-sm">
          {days.map((d) => (
            <Link
              key={d}
              href={`/metrics?day=${d}`}
              aria-current={d === day ? "page" : undefined}
              className={`rounded-full px-3 py-1 ${d === day ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
            >
              {eventDayLabel(d)}
            </Link>
          ))}
        </nav>
      )}

      {first == null || last == null ? (
        <p className="py-8 text-center text-zinc-500">{eventDayLabel(day)}の記録はまだありません</p>
      ) : (
        <>
          <section className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-1 pr-2 font-normal">種類</th>
                  <th className="px-2 py-1 text-right font-normal">合計</th>
                  <th className="px-2 py-1 text-right font-normal">最多（件/分）</th>
                  <th className="px-2 py-1 text-right font-normal">同時（最大）</th>
                  <th className="px-2 py-1 text-right font-normal">平均（ms）</th>
                  <th className="px-2 py-1 text-right font-normal">最大（ms）</th>
                  <th className="py-1 pl-2 text-right font-normal">失敗</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {keys.map((key) => {
                  const list = byKey.get(key)!;
                  const total = list.reduce((n, r) => n + r.count, 0);
                  const timed = !key.startsWith("req:");
                  const peak = list.reduce((a, r) => (r.count > a.count ? r : a));
                  const errors = list.reduce((n, r) => n + r.errors, 0);
                  return (
                    <tr key={key} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="py-1.5 pr-2">{LABELS[key] ?? key}</td>
                      <td className="px-2 text-right">{number(total)}</td>
                      <td className="px-2 text-right">
                        {number(peak.count)}
                        <span className="ml-1 text-xs text-zinc-400">{clock(peak.minute)}</span>
                      </td>
                      <td className="px-2 text-right">{timed ? number(Math.max(...list.map((r) => r.maxInflight))) : "—"}</td>
                      <td className="px-2 text-right">{timed && total ? number(list.reduce((n, r) => n + r.totalMs, 0) / total) : "—"}</td>
                      <td className="px-2 text-right">{timed ? number(Math.max(...list.map((r) => r.maxMs))) : "—"}</td>
                      <td className={`pl-2 text-right ${errors ? "font-semibold text-rose-700 dark:text-rose-400" : ""}`}>{number(errors)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="flex flex-col gap-6">
            {CHARTS.filter((c) => byKey.has(c.key)).map((c) => (
              <MinuteChart key={`${c.key}-${c.value}`} title={c.title} rows={byKey.get(c.key)!} value={c.value} first={first} last={last} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function order(key: string) {
  const i = Object.keys(LABELS).indexOf(key);
  return i === -1 ? Infinity : i;
}

// 1 分ごとの棒グラフ。記録の無い 1 分は 0 として並べる。棒にカーソルを合わせると時刻と値が出る
function MinuteChart({
  title,
  rows,
  value,
  first,
  last,
}: {
  title: string;
  rows: Row[];
  value: "count" | "maxMs" | "maxInflight";
  first: number;
  last: number;
}) {
  const byMinute = new Map(rows.map((r) => [r.minute, r[value]]));
  const minutes = Array.from({ length: (last - first) / 60 + 1 }, (_, i) => first + i * 60);
  const max = Math.max(1, ...minutes.map((m) => byMinute.get(m) ?? 0));
  const peak = minutes.reduce((a, m) => ((byMinute.get(m) ?? 0) > (byMinute.get(a) ?? 0) ? m : a));
  const H = 100;
  const W = minutes.length;

  return (
    <figure>
      <figcaption className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{title}</span>
        <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
          最大 {number(byMinute.get(peak) ?? 0)}（{clock(peak)}）
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title}。最大 ${number(byMinute.get(peak) ?? 0)}（${clock(peak)}）`}
        className="h-28 w-full border-b border-zinc-300 dark:border-zinc-700"
      >
        {minutes.map((m, i) => {
          const v = byMinute.get(m) ?? 0;
          const h = (v / max) * (H - 4);
          return (
            <g key={m}>
              {/* カーソルを合わせやすいよう、棒より広い透明の当たり判定を置く */}
              <rect x={i} y={0} width={1} height={H} fill="transparent">
                <title>{`${clock(m)}　${number(v)}`}</title>
              </rect>
              {v > 0 && (
                <rect
                  x={i + 0.1}
                  y={H - h}
                  width={0.8}
                  height={h}
                  className="pointer-events-none fill-[#2a78d6] dark:fill-[#3987e5]"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-zinc-500 tabular-nums">
        <span>{clock(first)}</span>
        <span>{clock(last)}</span>
      </div>
    </figure>
  );
}
