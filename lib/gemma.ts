import "server-only";
import { z } from "zod";
import type { Session, Utterance } from "./db/schema";
import { summarySchema, visitorReportSchema, type Summary, type VisitorReport } from "./gemma-schema";
import { signalLabel, TOPICS, topicLabel } from "./topics";

// 常駐中の llama-server（gemma-4-12b、OpenAI 互換 API）で課題をまとめる

const GEMMA_URL = process.env.GEMMA_URL ?? "http://127.0.0.1:8080";

const TOPIC_GUIDE = Object.entries(TOPICS)
  .map(([key, t]) => `  - ${key}（${t.label}）: ${t.description}`)
  .join("\n");

const LEAD_PROMPT = `あなたは展示会ブースの営業支援アシスタントです。
来場者との会話から抜き出した発言（課題に関係するものだけ）と、各発言の分類結果が渡されます。
これをもとに、後日のアポイント・商談に使える「来場者の課題まとめ」を日本語で作成してください。

ルール:
- 発言に書かれていないことを推測で事実として書かない。分からないことは unknowns に入れる。
- issues は課題ごとに1件。似た発言はまとめる。evidence には根拠となった発言をそのまま引用する。
- severity は 1（軽い）〜5（深刻・緊急）。
- topic と recommended_offerings は、次の定義に従って選ぶ:
${TOPIC_GUIDE}
- next_actions は営業担当が次にやるべき具体的な行動。
- appointment_pitch は、アポイント依頼メールの冒頭に使える2〜3文。`;

const VISITOR_PROMPT = `あなたは企業の業務改善に詳しいコンサルタントです。
展示会ブースで来場者が話した内容（課題に関係する発言だけ）が渡されます。
来場者本人に画面で見せる「今日のお話のまとめ」を、日本語の丁寧語（です・ます調）で作成してください。
このまとめは会話の締めくくりではなく、このあとブース担当者がおすすめのソリューション展示へご案内するための導入です。

目的: 来場者が自分では言葉にできていなかった課題に気づき、「なるほど」と思えること。

ルール:
- 相手は来場者本人。「御社」「皆さま」と呼びかける。営業・商談・見込み・アポイントといった出展者側の言葉は使わない。
- headline: 今日のお話を一言で表す、核心を突いた1文（40字程度）。
- issues: 2〜4件。
  - kind="stated": 来場者がはっきり口にした課題を、より的確な言葉で言い換えたもの。
  - kind="underlying": 発言どうしのつながりから見える、背景にある原因や、放っておくと広がる影響。
    本人がまだ言葉にしていないが、発言から無理なく導けるものに限る。必ず1件以上入れる。
  - insight は2〜3文。なぜそう言えるかを発言に結び付けて説明する。
  - your_words には根拠となった発言をそのまま引用する。
- recommendations: 1〜3件。category は次の定義から選ぶ:
${TOPIC_GUIDE}
  - title は改善の方向性（例:「業務の属人化をなくす仕組みづくり」）。製品名は出さない。
  - why はその改善が課題にどう効くか。first_step は明日からでもできる最初の一歩。
- message: このあとのご案内につなげる一言（1〜2文）。整理した課題に触れ、「関連する展示をご覧いただきながら、解決の方向性を一緒に考えましょう」のように案内へ誘う。お別れやお礼の言葉で終わらせない。
- 発言にない事実（数字・固有名詞など）を作らない。`;

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

function conversationContent(session: Session, items: Utterance[]) {
  return JSON.stringify(
    {
      来場者: { 会社: session.company, 部署: session.department, 役職: session.position },
      発言: items.map((u) => ({
        発言: u.text,
        領域: topicLabel(u.topic),
        種類: signalLabel(u.signal),
        深刻度: Math.round(u.severity * 10) / 10,
      })),
    },
    null,
    2,
  );
}

async function generate<T>(schema: z.ZodType<T>, name: string, system: string, user: string): Promise<T> {
  const res = await fetch(`${GEMMA_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      // thinking を有効にすると1分近くかかるため無効にする
      chat_template_kwargs: { enable_thinking: false },
      response_format: {
        type: "json_schema",
        json_schema: { name, strict: true, schema: z.toJSONSchema(schema) },
      },
    }),
    signal: AbortSignal.timeout(150_000),
  });
  if (!res.ok) throw new Error(`gemma ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const { choices } = completionSchema.parse(await res.json());
  return schema.parse(JSON.parse(choices[0].message.content));
}

// ブース担当者向け（リードデータとして保存）
export function summarize(session: Session, items: Utterance[]): Promise<Summary> {
  return generate(summarySchema, "lead_summary", LEAD_PROMPT, conversationContent(session, items));
}

// 来場者向け（会話終了後の画面に表示）
export function writeVisitorReport(session: Session, items: Utterance[]): Promise<VisitorReport> {
  return generate(visitorReportSchema, "visitor_report", VISITOR_PROMPT, conversationContent(session, items));
}

const QUESTION_PROMPT = `あなたは展示会ブースで来場者の課題を聞き出すのが上手な担当者です。
来場者がこれまでに話した内容（課題に関係する発言）と、次に確かめたい「ねらい」が渡されます。
ブース担当者が来場者にそのまま投げかけられる問いかけを1つ作ってください。

ルール:
- 日本語の丁寧語で、60字以内の1文。答えやすい具体的な聞き方にする。
- 来場者の発言の言葉を1つ以上取り入れ、「ちゃんと聞いてくれている」と感じる問いにする。
- はい／いいえで終わらない、話が広がる聞き方にする。
- avoid にある問いかけと同じ内容・似た言い回し・同じ書き出しは使わない。
- 発言が複数あるときは、avoid の問いかけでまだ触れていない発言を優先して取り上げる。
- ねらいから外れない。ねらいが「予算」なら予算、「時期」なら時期を聞く。
- 製品やサービスの売り込みはしない。`;

const questionSchema = z.object({ question: z.string() });

// 「別の問いかけ」: 会話の内容とねらいに合わせた問いかけを作る
export async function generateQuestion(
  session: Session,
  items: Utterance[],
  aim: string,
  avoid: string[],
): Promise<string> {
  const user = JSON.stringify(
    {
      発言: items.map((u) => u.text),
      ねらい: aim,
      avoid,
    },
    null,
    2,
  );
  const { question } = await generate(questionSchema, "question", QUESTION_PROMPT, user);
  return question.trim();
}
