import { eq } from "drizzle-orm";
import { CircleCheck, Coffee } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getDb, schema } from "@/lib/db";
import { ticketNumber } from "@/lib/survey";
import { TicketActions } from "./TicketActions";

const TOKEN_PATTERN = /^[0-9a-f-]{36}$/;

// コーヒー引換チケット。URL を知っていれば誰でも開けるので、氏名や回答は出さない
export default async function TicketPage(props: PageProps<"/survey/ticket/[token]">) {
  await connection();
  const { token } = await props.params;
  if (!TOKEN_PATTERN.test(token)) notFound();
  const [ticket] = await getDb()
    .select({ id: schema.surveyResponses.id, redeemedAt: schema.surveyResponses.redeemedAt })
    .from(schema.surveyResponses)
    .where(eq(schema.surveyResponses.token, token));
  if (!ticket) notFound();

  const redeemed = ticket.redeemedAt !== null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 pb-10">
      <p className="mt-4 text-center text-sm text-zinc-500">ご回答ありがとうございました</p>

      <section
        className={`flex flex-col items-center gap-3 rounded-2xl p-6 text-center ${
          redeemed
            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-900"
            : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        }`}
      >
        {redeemed ? (
          <CircleCheck className="size-16" strokeWidth={1.5} aria-hidden />
        ) : (
          <Coffee className="size-16" strokeWidth={1.5} aria-hidden />
        )}
        <h1 className="text-2xl font-bold">コーヒー引換チケット</h1>
        <p className="font-mono text-5xl font-bold tracking-wider">No. {ticketNumber(ticket.id)}</p>
        {redeemed && (
          <p className="font-semibold">
            お渡し済み（
            {ticket.redeemedAt?.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}
            ）
          </p>
        )}
      </section>

      <TicketActions token={token} redeemed={redeemed} />
    </main>
  );
}
