import { desc } from "drizzle-orm";
import { csvResponse } from "@/lib/csv";
import { getDb, schema } from "@/lib/db";
import { answerText, QUESTIONS, ticketNumber } from "@/lib/survey";

// 来場者アンケートの回答の CSV（Excel で開けるよう BOM 付き UTF-8）
export async function GET() {
  const rows = await getDb().select().from(schema.surveyResponses).orderBy(desc(schema.surveyResponses.createdAt));
  const time = (d: Date | null) => d?.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) ?? "";

  const header = ["日時", "チケット番号", "来場者QR", "会社", "氏名", ...QUESTIONS.map((q) => q.label), "コーヒーお渡し日時"];
  const lines = rows.map((r) => [
    time(r.createdAt),
    ticketNumber(r.id),
    r.badgeCode,
    r.company,
    r.visitorName,
    ...QUESTIONS.map((q) => answerText(q, r.answers)),
    time(r.redeemedAt),
  ]);

  return csvResponse([header, ...lines], "booth-survey.csv");
}
