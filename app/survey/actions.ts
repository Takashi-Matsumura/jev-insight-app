"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkBadgeCode, parseBadge } from "@/lib/badge";
import { getDb, schema } from "@/lib/db";
import { ALREADY_ANSWERED_PARAM, allowReanswer, parseAnswers } from "@/lib/survey";

// /survey 配下は来場者に公開する（前段の認証を通さない）。
// ここには来場者が実行してよい操作だけを置き、DB の行そのものは返さない。

const { surveyResponses } = schema;

export type SurveyState = { error?: string };

async function checkBadge(raw: unknown) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return checkBadgeCode(typeof raw === "string" ? raw : "", host);
}

// 回答済みの来場者証のチケットへの URL。チケットの画面に「回答済みです」と出すための印を付ける
async function answeredTicketPath(badgeCode: string) {
  const [row] = await getDb()
    .select({ token: surveyResponses.token })
    .from(surveyResponses)
    .where(eq(surveyResponses.badgeCode, badgeCode));
  return row ? `/survey/ticket/${row.token}?${ALREADY_ANSWERED_PARAM}=1` : null;
}

// QR を読んだ直後に呼ぶ。回答済みの来場者証なら、設問を出さずにチケットへ進める
export async function findTicket(badgeCode: string): Promise<SurveyState> {
  const badge = await checkBadge(badgeCode);
  if (!badge.ok) return { error: badge.error };
  if (allowReanswer()) return {};
  const path = await answeredTicketPath(badge.code);
  if (path) redirect(path);
  return {};
}

export async function submitSurvey(_prev: SurveyState, formData: FormData): Promise<SurveyState> {
  const badge = await checkBadge(formData.get("badgeCode"));
  if (!badge.ok) return { error: badge.error };
  const parsed = parseAnswers(formData);
  if (!parsed.ok) return { error: parsed.error };
  if (formData.get("consent") !== "on") return { error: "ご利用への同意を確認してください" };

  const { company, name } = parseBadge(badge.code);
  // テストモードでは前の回答を消してから入れ直す（badge_code は一意なので、残したままでは入らない）
  if (allowReanswer()) await getDb().delete(surveyResponses).where(eq(surveyResponses.badgeCode, badge.code));
  // 来場者証 1 枚につきチケット 1 枚。同じ来場者証で送り直された場合は、最初の回答とチケットをそのまま使う
  const [created] = await getDb()
    .insert(surveyResponses)
    .values({
      token: crypto.randomUUID(),
      badgeCode: badge.code,
      company: company.slice(0, 200),
      visitorName: name.slice(0, 100),
      answers: parsed.answers,
      consentAt: new Date(),
    })
    .onConflictDoNothing({ target: surveyResponses.badgeCode })
    .returning({ token: surveyResponses.token });

  const path = created ? `/survey/ticket/${created.token}` : await answeredTicketPath(badge.code);
  if (!path) return { error: "送信できませんでした。もう一度お試しください。" };
  redirect(path);
}

// コーヒーを渡したときに、担当者が来場者の画面で実行する。すでにお渡し済みなら何もしない
export async function redeemTicket(token: string): Promise<SurveyState> {
  if (typeof token !== "string") return { error: "チケットが見つかりません" };
  const db = getDb();
  await db
    .update(surveyResponses)
    .set({ redeemedAt: new Date() })
    .where(and(eq(surveyResponses.token, token), isNull(surveyResponses.redeemedAt)));
  const [row] = await db.select({ id: surveyResponses.id }).from(surveyResponses).where(eq(surveyResponses.token, token));
  if (!row) return { error: "チケットが見つかりません" };
  refresh();
  return {};
}
