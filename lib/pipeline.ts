import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Session, Utterance } from "./db/schema";
import { summarize } from "./gemma";
import { systemOne } from "./jev";
import { LEAD_QUESTIONS, leadGrade, PROBE_QUESTIONS, SETTING, UTTERANCE_QUESTIONS } from "./jev-questions";
import { looksLikeProbe } from "./probes";
import { splitSentences, transcribe } from "./whisper";

const RELEVANCE_THRESHOLD = Number(process.env.RELEVANCE_THRESHOLD ?? 0.5);
// 句点が出ないまま長くなった文字起こしは、そこで1発話として扱う
const MAX_PENDING_CHARS = 150;

export class SessionStateError extends Error {}

export async function getSession(id: string) {
  return getDb().query.sessions.findFirst({ where: eq(schema.sessions.id, id) });
}

export async function listUtterances(sessionId: string) {
  return getDb()
    .select()
    .from(schema.utterances)
    .where(eq(schema.utterances.sessionId, sessionId))
    .orderBy(asc(schema.utterances.id));
}

function findingsState(items: Utterance[]) {
  const mentioned = (key: "budgetSignal" | "timelineSignal" | "decisionMakerSignal") =>
    items.some((u) => u[key] >= RELEVANCE_THRESHOLD);
  return {
    setting: SETTING,
    findings: items.map((u) => ({ text: u.text, topic: u.topic, signal: u.signal })),
    already_mentioned: {
      budget: mentioned("budgetSignal"),
      timeline: mentioned("timelineSignal"),
      decision_maker: mentioned("decisionMakerSignal"),
    },
  };
}

export type SentenceResult = {
  text: string;
  kept: Utterance | null;
  relevance: number;
  reason: "kept" | "not_relevant" | "not_visitor" | "probe_echo" | "too_short";
};

const MIN_CHARS = 4;

// 発話ごとに Jev で判定し、来場者の課題に関係するものだけを保存する。捨てた発話は保存しない。
async function classifyAndStore(session: Session, sentences: string[]): Promise<SentenceResult[]> {
  if (sentences.length === 0) return [];

  const recent = await getDb()
    .select({ text: schema.utterances.text })
    .from(schema.utterances)
    .where(eq(schema.utterances.sessionId, session.id))
    .orderBy(desc(schema.utterances.id))
    .limit(2);
  const history = [...recent.reverse().map((r) => r.text), ...sentences];
  const offset = history.length - sentences.length;

  const judged = await Promise.all(
    sentences.map(async (text, i) => {
      // 短すぎる断片と、画面の「次に聞いてみる」を読み上げた声は Jev に送らずに捨てる
      if (text.replace(/[\s、。！？!?,.・…]/g, "").length < MIN_CHARS) return { text, reason: "too_short" as const };
      if (looksLikeProbe(text)) return { text, reason: "probe_echo" as const };
      const a = await systemOne(
        {
          setting: SETTING,
          context_before: history.slice(Math.max(0, offset + i - 2), offset + i),
          utterance: text,
        },
        UTTERANCE_QUESTIONS,
      );
      const reason =
        a.is_business_relevant.noul < RELEVANCE_THRESHOLD
          ? ("not_relevant" as const)
          : a.is_visitor_situation.noul < RELEVANCE_THRESHOLD
            ? ("not_visitor" as const)
            : ("kept" as const);
      return { text, reason, a };
    }),
  );

  const toInsert = judged.flatMap((j) =>
    j.reason === "kept" && j.a
      ? [
          {
            sessionId: session.id,
            text: j.text,
            relevance: j.a.is_business_relevant.noul,
            topic: j.a.topic.choice,
            signal: j.a.signal.choice,
            // score は 0〜4 で返るので 1〜5 に合わせる
            severity: j.a.severity.score + 1,
            budgetSignal: j.a.budget_signal.noul,
            timelineSignal: j.a.timeline_signal.noul,
            decisionMakerSignal: j.a.decision_maker_signal.noul,
          },
        ]
      : [],
  );
  const inserted = toInsert.length ? await getDb().insert(schema.utterances).values(toInsert).returning() : [];

  let k = 0;
  return judged.map((j) => ({
    text: j.text,
    kept: j.reason === "kept" ? (inserted[k++] ?? null) : null,
    relevance: j.a?.is_business_relevant.noul ?? 0,
    reason: j.reason,
  }));
}

// 次に聞くべきことと、課題の具体度（商談見込みスコア）を1回の Jev 呼び出しで更新する
async function updateInsights(sessionId: string) {
  const items = await listUtterances(sessionId);
  if (items.length === 0) return null;
  const a = await systemOne(findingsState(items), { ...PROBE_QUESTIONS, ...LEAD_QUESTIONS });
  const next = { nextProbe: a.next_probe.choice, leadScore: a.lead.score };
  await getDb().update(schema.sessions).set(next).where(eq(schema.sessions.id, sessionId));
  return next;
}

export async function processChunk(
  sessionId: string,
  audio: Blob,
  filename: string,
  onTranscript?: (t: { sentences: string[]; pending: string }) => void,
) {
  const session = await getSession(sessionId);
  if (!session) throw new SessionStateError("会話が見つかりません");
  if (session.status !== "recording") throw new SessionStateError("この会話はすでに終了しています");

  const text = await transcribe(audio, filename);
  let { sentences, rest } = splitSentences(session.pendingText + text);
  if (rest.length > MAX_PENDING_CHARS) {
    sentences = [...sentences, rest];
    rest = "";
  }
  onTranscript?.({ sentences, pending: rest });

  const results = await classifyAndStore(session, sentences);
  await getDb()
    .update(schema.sessions)
    .set({ pendingText: rest })
    .where(eq(schema.sessions.id, sessionId));

  const insights = results.some((r) => r.kept)
    ? await updateInsights(sessionId)
    : { nextProbe: session.nextProbe, leadScore: session.leadScore };
  return { results, pending: rest, ...insights };
}

// 会話終了: 残りの文字起こしを処理し、Jev で商談見込み、gemma4 で課題まとめを作る。
// gemma4 が失敗しても会話は終了扱いにし、まとめだけ後から作り直せるようにする。
export async function finalizeSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new SessionStateError("会話が見つかりません");

  if (session.pendingText) {
    await classifyAndStore(session, [session.pendingText]);
  }
  const items = await listUtterances(sessionId);

  let leadScore = 0;
  let summary = session.summary ?? null;
  let summaryError: string | null = null;
  if (items.length > 0) {
    const [lead, sum] = await Promise.allSettled([
      systemOne(findingsState(items), LEAD_QUESTIONS),
      summarize(session, items),
    ]);
    if (lead.status === "rejected") throw lead.reason;
    leadScore = lead.value.lead.score;
    if (sum.status === "fulfilled") summary = sum.value;
    else summaryError = String(sum.reason);
  }

  await getDb()
    .update(schema.sessions)
    .set({
      status: "finalized",
      pendingText: "",
      leadScore,
      leadGrade: leadGrade(leadScore),
      summary,
      finalizedAt: new Date(),
    })
    .where(eq(schema.sessions.id, sessionId));

  return { summaryError };
}
