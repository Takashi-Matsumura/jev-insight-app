import "server-only";
import { z } from "zod";
import type { Session, Utterance } from "./db/schema";
import { summarySchema, type Summary } from "./gemma-schema";
import { signalLabel, TOPICS, topicLabel } from "./topics";

// 常駐中の llama-server（gemma-4-12b、OpenAI 互換 API）で課題をまとめる

const GEMMA_URL = process.env.GEMMA_URL ?? "http://127.0.0.1:8080";

const SYSTEM_PROMPT = `あなたは展示会ブースの営業支援アシスタントです。
来場者との会話から抜き出した発言（課題に関係するものだけ）と、各発言の分類結果が渡されます。
これをもとに、後日のアポイント・商談に使える「来場者の課題まとめ」を日本語で作成してください。

ルール:
- 発言に書かれていないことを推測で事実として書かない。分からないことは unknowns に入れる。
- issues は課題ごとに1件。似た発言はまとめる。evidence には根拠となった発言をそのまま引用する。
- severity は 1（軽い）〜5（深刻・緊急）。
- recommended_offerings は、自社の提供領域（${Object.values(TOPICS)
  .map((t) => t.label)
  .join("・")}）のうち提案できそうなもの。
- next_actions は営業担当が次にやるべき具体的な行動。
- appointment_pitch は、アポイント依頼メールの冒頭に使える2〜3文。`;

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

export async function summarize(session: Session, items: Utterance[]): Promise<Summary> {
  const findings = items.map((u) => ({
    発言: u.text,
    領域: topicLabel(u.topic),
    種類: signalLabel(u.signal),
    深刻度: Math.round(u.severity * 10) / 10,
  }));
  const userContent = JSON.stringify(
    {
      来場者: {
        会社: session.company,
        部署: session.department,
        役職: session.position,
        メモ: session.memo,
      },
      発言: findings,
    },
    null,
    2,
  );

  const res = await fetch(`${GEMMA_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      // thinking を有効にすると1分近くかかるため無効にする
      chat_template_kwargs: { enable_thinking: false },
      response_format: {
        type: "json_schema",
        json_schema: { name: "summary", strict: true, schema: z.toJSONSchema(summarySchema) },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`gemma ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const { choices } = completionSchema.parse(await res.json());
  return summarySchema.parse(JSON.parse(choices[0].message.content));
}
