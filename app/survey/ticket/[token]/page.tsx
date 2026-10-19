import { eq } from "drizzle-orm";
import { CircleCheck } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getDb, schema } from "@/lib/db";
import { ALREADY_ANSWERED_PARAM, CAFE_LOGO, ticketNumber } from "@/lib/survey";
import { TicketActions } from "./TicketActions";

const TOKEN_PATTERN = /^[0-9a-f-]{36}$/;

// コーヒー引換チケット。URL を知っていれば誰でも開けるので、氏名や回答は出さない
export default async function TicketPage(props: PageProps<"/survey/ticket/[token]">) {
  await connection();
  const { token } = await props.params;
  const alreadyAnswered = (await props.searchParams)[ALREADY_ANSWERED_PARAM] === "1";
  if (!TOKEN_PATTERN.test(token)) notFound();
  const [ticket] = await getDb()
    .select({ id: schema.surveyResponses.id, redeemedAt: schema.surveyResponses.redeemedAt })
    .from(schema.surveyResponses)
    .where(eq(schema.surveyResponses.token, token));
  if (!ticket) notFound();

  const redeemed = ticket.redeemedAt !== null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 pb-6">
      {alreadyAnswered ? (
        // 回答済みのバッジを読み直したときは、今答えたのではないと分かるようにする
        <p role="status" className="mt-4 text-balance text-center text-sm text-roast">
          <span className="block font-semibold">このバッジは回答済みです</span>
          <span className="block text-roast/80">最初にお答えいただいたときのチケットを表示しています</span>
        </p>
      ) : (
        <p className="mt-4 text-center text-sm font-semibold text-roast">ご回答ありがとうございました</p>
      )}

      {/* 紙のチケットに見立てる。左右の切り欠きは背景と同じ色の丸 */}
      <section className="relative overflow-hidden rounded-2xl bg-paper text-center shadow-xl shadow-roast/20 ring-1 ring-roast/10">
        <div className="flex flex-col items-center gap-0.5 bg-espresso px-5 py-4 text-crema">
          <span className="font-slab text-xs tracking-[0.3em] text-gold">COFFEE TICKET</span>
          <h1 className="text-xl font-bold tracking-wide">コーヒー引換チケット</h1>
        </div>

        <div className={`flex flex-col items-center gap-3 px-5 py-6 ${redeemed ? "opacity-50" : ""}`}>
          <Image {...CAFE_LOGO} alt="OCCカフェ" unoptimized className="h-auto w-24" />
          <p className="text-xs font-semibold tracking-widest text-roast/70">引換番号</p>
          <p className="font-slab text-6xl tracking-wider text-espresso">No.{ticketNumber(ticket.id)}</p>
        </div>

        <div aria-hidden className="relative mx-5 border-t-2 border-dashed border-roast/25">
          <span className="absolute -left-8 -top-3 size-6 rounded-full bg-crema" />
          <span className="absolute -right-8 -top-3 size-6 rounded-full bg-crema" />
        </div>
        <p className="py-3 font-slab text-xs tracking-[0.3em] text-roast/60">ONE CUP · OCC CAFE</p>

        {redeemed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="-rotate-12 rounded-xl border-4 border-occ bg-paper/85 px-5 py-2 text-occ shadow-sm">
              <span className="flex items-center gap-1 text-2xl font-bold">
                <CircleCheck className="size-6" strokeWidth={2.5} aria-hidden />
                お渡し済み
              </span>
              <span className="block font-mono text-lg font-bold">
                {ticket.redeemedAt?.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}
              </span>
            </p>
          </div>
        )}
      </section>

      <TicketActions token={token} redeemed={redeemed} />
    </main>
  );
}
