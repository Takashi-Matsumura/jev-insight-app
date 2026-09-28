import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Session, Utterance } from "./db/schema";
import { summarize } from "./gemma";
import { systemOne } from "./jev";
import { LEAD_QUESTIONS, leadGrade, PROBE_QUESTIONS, SETTING, UTTERANCE_QUESTIONS } from "./jev-questions";
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

// 発話ごとに Jev で判定し、課題に関係するものだけを保存する。捨てた発話は保存しない。
async function classifyAndStore(session: Session, sentences: string[]) {
  if (sentences.length === 0) return { kept: [] as Utterance[], discarded: 0 };

  const recent = await getDb()
    .select({ text: schema.utterances.text })
    .from(schema.utterances)
    .where(eq(schema.utterances.sessionId, session.id))
    .orderBy(desc(schema.utterances.id))
    .limit(2);
  const history = [...recent.reverse().map((r) => r.text), ...sentences];
  const offset = history.length - sentences.length;

  const results = await Promise.all(
    sentences.map((utterance, i) =>
      systemOne(
        {
          setting: SETTING,
          context_before: history.slice(Math.max(0, offset + i - 2), offset + i),
          utterance,
        },
        UTTERANCE_QUESTIONS,
      ).then((a) => ({ utterance, a })),
    ),
  );

  const rows = results
    .filter(({ a }) => a.is_business_relevant.noul >= RELEVANCE_THRESHOLD)
    .map(({ utterance, a }) => ({
      sessionId: session.id,
      text: utterance,
      relevance: a.is_business_relevant.noul,
      topic: a.topic.choice,
      signal: a.signal.choice,
      // score は 0〜4 で返るので 1〜5 に合わせる
      severity: a.severity.score + 1,
      budgetSignal: a.budget_signal.noul,
      timelineSignal: a.timeline_signal.noul,
      decisionMakerSignal: a.decision_maker_signal.noul,
    }));

  const kept = rows.length ? await getDb().insert(schema.utterances).values(rows).returning() : [];
  return { kept, discarded: sentences.length - rows.length };
}

async function updateProbe(sessionId: string) {
  const items = await listUtterances(sessionId);
  if (items.length === 0) return null;
  const { next_probe } = await systemOne(findingsState(items), PROBE_QUESTIONS);
  await getDb()
    .update(schema.sessions)
    .set({ nextProbe: next_probe.choice })
    .where(eq(schema.sessions.id, sessionId));
  return next_probe.choice;
}

export async function processChunk(sessionId: string, audio: Blob, filename: string) {
  const session = await getSession(sessionId);
  if (!session) throw new SessionStateError("会話が見つかりません");
  if (session.status !== "recording") throw new SessionStateError("この会話はすでに終了しています");

  const text = await transcribe(audio, filename);
  let { sentences, rest } = splitSentences(session.pendingText + text);
  if (rest.length > MAX_PENDING_CHARS) {
    sentences = [...sentences, rest];
    rest = "";
  }

  const { kept, discarded } = await classifyAndStore(session, sentences);
  await getDb()
    .update(schema.sessions)
    .set({ pendingText: rest })
    .where(eq(schema.sessions.id, sessionId));

  const nextProbe = kept.length ? await updateProbe(sessionId) : session.nextProbe;
  return { kept, discarded, nextProbe };
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
