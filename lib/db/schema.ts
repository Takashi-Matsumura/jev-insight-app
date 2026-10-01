import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Summary, VisitorReport } from "../gemma-schema";
import type { SurveyAnswers } from "../survey";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  visitorName: text("visitor_name").notNull().default(""),
  // 来場者バッジのQRコードの中身（主催者の来場者データと突き合わせるためのキー）
  badgeCode: text("badge_code").notNull().default(""),
  department: text("department").notNull().default(""),
  position: text("position").notNull().default(""),
  email: text("email").notNull().default(""),
  staffName: text("staff_name").notNull().default(""),
  memo: text("memo").notNull().default(""),
  consentAt: integer("consent_at", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["recording", "finalized"] }).notNull().default("recording"),
  // 前のチャンクで文末まで届かなかった文字起こし
  pendingText: text("pending_text").notNull().default(""),
  nextProbe: text("next_probe"),
  // 「別の問いかけ」で生成して画面に出した質問（読み上げの除外と、観点の重複を避けるために使う）
  askedQuestions: text("asked_questions", { mode: "json" })
    .$type<{ question: string; slot: string }[]>()
    .notNull()
    .default([]),
  leadScore: real("lead_score"),
  leadGrade: text("lead_grade", { enum: ["A", "B", "C"] }),
  // ブース担当者向けのリードデータ（来場者には見せない）
  summary: text("summary", { mode: "json" }).$type<Summary>(),
  // 来場者向けのまとめ（会話終了後の画面に表示）
  visitorReport: text("visitor_report", { mode: "json" }).$type<VisitorReport>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  finalizedAt: integer("finalized_at", { mode: "timestamp" }),
});

// Jev が「課題に関係あり」と判定した発話だけを保存する
export const utterances = sqliteTable("utterances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  relevance: real("relevance").notNull(),
  topic: text("topic").notNull(),
  signal: text("signal").notNull(),
  severity: real("severity").notNull(),
  budgetSignal: real("budget_signal").notNull(),
  timelineSignal: real("timeline_signal").notNull(),
  decisionMakerSignal: real("decision_maker_signal").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [index("utterances_session_id_idx").on(t.sessionId)]);

// 来場者が自分のスマホで答えるアンケート。1 バッジにつき 1 行で、コーヒー引換チケットを兼ねる
export const surveyResponses = sqliteTable("survey_responses", {
  // チケット番号として画面に出す
  id: integer("id").primaryKey({ autoIncrement: true }),
  // チケット画面の URL に使う、推測できない値
  token: text("token").notNull().unique(),
  badgeCode: text("badge_code").notNull().unique(),
  company: text("company").notNull().default(""),
  visitorName: text("visitor_name").notNull().default(""),
  answers: text("answers", { mode: "json" }).$type<SurveyAnswers>().notNull(),
  consentAt: integer("consent_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  // コーヒーを渡した時刻。未使用なら null
  redeemedAt: integer("redeemed_at", { mode: "timestamp" }),
});

export type Session = typeof sessions.$inferSelect;
export type Utterance = typeof utterances.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
