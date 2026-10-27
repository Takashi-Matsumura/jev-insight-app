"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkBadgeCode, parseBadge } from "@/lib/badge";
import { getDb, schema } from "@/lib/db";
import { measure } from "@/lib/metrics";
import { allowSurveyAction, clientIp, recordNewTicket } from "@/lib/rate-limit";
import { ALREADY_ANSWERED_PARAM, allowReanswer, eventDay, eventDayLabel, parseAnswers } from "@/lib/survey";

// /survey 配下は来場者に公開する（前段の認証を通さない）。
// ここには来場者が実行してよい操作だけを置き、DB の行そのものは返さない。

const { surveyResponses } = schema;

export type SurveyState = { error?: string };

const BUSY = "混み合っています。少し待ってからもう一度お試しください";

async function checkBadge(raw: unknown) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return checkBadgeCode(typeof raw === "string" ? raw : "", host);
}

// 今日すでに回答した来場者証のチケットへの URL。チケットの画面に「回答済みです」と出すための印を付ける
async function answeredTicketPath(badgeCode: string, day: string) {
  const [row] = await getDb()
    .select({ token: surveyResponses.token })
    .from(surveyResponses)
    .where(and(eq(surveyResponses.badgeCode, badgeCode), eq(surveyResponses.eventDay, day)));
  return row ? `/survey/ticket/${row.token}?${ALREADY_ANSWERED_PARAM}=1` : null;
}

// QR を読んだ直後に呼ぶ。今日回答済みの来場者証なら、設問を出さずにチケットへ進める（前の日の回答は問わない）
export async function findTicket(badgeCode: string): Promise<SurveyState> {
  return measure("survey:find", () => runFindTicket(badgeCode));
}

async function runFindTicket(badgeCode: string): Promise<SurveyState> {
  if (!allowSurveyAction(await clientIp())) return { error: BUSY };
  const badge = await checkBadge(badgeCode);
  if (!badge.ok) return { error: badge.error };
  if (allowReanswer()) return {};
  const path = await answeredTicketPath(badge.code, eventDay());
  if (path) redirect(path);
  return {};
}

export async function submitSurvey(_prev: SurveyState, formData: FormData): Promise<SurveyState> {
  return measure("survey:submit", () => runSubmitSurvey(formData));
}

async function runSubmitSurvey(formData: FormData): Promise<SurveyState> {
  const ip = await clientIp();
  if (!allowSurveyAction(ip)) return { error: BUSY };
  const badge = await checkBadge(formData.get("badgeCode"));
  if (!badge.ok) return { error: badge.error };
  const parsed = parseAnswers(formData);
  if (!parsed.ok) return { error: parsed.error };
  if (formData.get("consent") !== "on") return { error: "ご利用への同意を確認してください" };

  const { company, name } = parseBadge(badge.code);
  const day = eventDay();
  const sameBadgeToday = and(eq(surveyResponses.badgeCode, badge.code), eq(surveyResponses.eventDay, day));
  // テストモードではその日の前の回答を消してから入れ直す（来場者証と開催日の組は一意なので、残したままでは入らない）
  if (allowReanswer()) await getDb().delete(surveyResponses).where(sameBadgeToday);
  // 来場者証 1 枚につき 1 日 1 枚。同じ日に同じ来場者証で送り直された場合は、その日の最初の回答とチケットをそのまま使う
  const [created] = await getDb()
    .insert(surveyResponses)
    .values({
      token: crypto.randomUUID(),
      badgeCode: badge.code,
      eventDay: day,
      company: company.slice(0, 200),
      visitorName: name.slice(0, 100),
      answers: parsed.answers,
      consentAt: new Date(),
    })
    .onConflictDoNothing({ target: [surveyResponses.badgeCode, surveyResponses.eventDay] })
    .returning({ token: surveyResponses.token });

  if (created) recordNewTicket(ip);
  const path = created ? `/survey/ticket/${created.token}` : await answeredTicketPath(badge.code, day);
  if (!path) return { error: "送信できませんでした。もう一度お試しください。" };
  redirect(path);
}

// コーヒーを渡したときに、担当者が来場者の画面で実行する。すでにお渡し済みなら何もしない。
// チケットは回答した日だけ使える（前の日のチケットは、その日のアンケートに答え直してもらう）
export async function redeemTicket(token: string): Promise<SurveyState> {
  return measure("survey:redeem", () => runRedeemTicket(token));
}

async function runRedeemTicket(token: string): Promise<SurveyState> {
  if (!allowSurveyAction(await clientIp())) return { error: BUSY };
  if (typeof token !== "string") return { error: "チケットが見つかりません" };
  const db = getDb();
  await db
    .update(surveyResponses)
    .set({ redeemedAt: new Date() })
    .where(and(eq(surveyResponses.token, token), eq(surveyResponses.eventDay, eventDay()), isNull(surveyResponses.redeemedAt)));
  const [row] = await db
    .select({ eventDay: surveyResponses.eventDay, redeemedAt: surveyResponses.redeemedAt })
    .from(surveyResponses)
    .where(eq(surveyResponses.token, token));
  if (!row) return { error: "チケットが見つかりません" };
  if (!row.redeemedAt) {
    refresh();
    return { error: `${eventDayLabel(row.eventDay)}のチケットのため、本日は使えません` };
  }
  refresh();
  return {};
}
