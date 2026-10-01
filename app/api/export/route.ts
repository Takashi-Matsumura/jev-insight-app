import { desc } from "drizzle-orm";
import { csvResponse } from "@/lib/csv";
import { getDb, schema } from "@/lib/db";
import { TOPICS, topicLabel } from "@/lib/topics";

// 後日のアポ取り用の CSV（Excel で開けるよう BOM 付き UTF-8）
export async function GET() {
  const rows = await getDb().select().from(schema.sessions).orderBy(desc(schema.sessions.createdAt));

  const header = [
    "日時", "来場者QR", "会社", "氏名", "部署", "役職", "メール", "担当", "見込み",
    "課題", "提案領域", "次のアクション", "アポ依頼文", "メモ",
  ];
  const lines = rows.map((s) => [
    s.createdAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    s.badgeCode, s.company, s.visitorName, s.department, s.position, s.email, s.staffName,
    s.leadGrade ?? "",
    s.summary?.issues.map((i) => `【${topicLabel(i.topic)}】${i.title}: ${i.detail}`).join("\n") ?? "",
    s.summary?.recommended_offerings.map((t) => TOPICS[t].label).join("・") ?? "",
    s.summary?.next_actions.join("\n") ?? "",
    s.summary?.appointment_pitch ?? "",
    s.memo,
  ]);

  return csvResponse([header, ...lines], "booth-leads.csv");
}
