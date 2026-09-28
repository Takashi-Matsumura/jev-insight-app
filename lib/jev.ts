import "server-only";
import { z } from "zod";

// TypeSafe AI Jev (System One) の REST クライアント。
// 仕様: https://docs.typesafe.ai/api.md

const ENDPOINT = process.env.TYPESAFE_API_URL ?? "https://api.typesafe.ai/v1/systemone";
const MODEL = process.env.TYPESAFE_MODEL ?? "jev-latest";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
};

export type ChoiceQuestion<K extends string = string> = {
  type: "choice";
  instructions: string;
  criteria: Record<K, string>;
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type NoulAnswer = { type: "noul"; noul: number };
export type ChoiceAnswer<K extends string = string> = {
  type: "choice";
  choice: K;
  probabilities: Record<K, number>;
  confidence: number;
};
export type ScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

type AnswerFor<Q> = Q extends NoulQuestion
  ? NoulAnswer
  : Q extends ChoiceQuestion<infer K>
    ? ChoiceAnswer<K>
    : Q extends ScoreQuestion
      ? ScoreAnswer
      : never;

export type Answers<Q extends Record<string, Question>> = { [K in keyof Q]: AnswerFor<Q[K]> };

const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), noul: z.number() }),
  z.object({
    type: z.literal("choice"),
    choice: z.string(),
    probabilities: z.record(z.string(), z.number()),
    confidence: z.number(),
  }),
  z.object({
    type: z.literal("score"),
    score: z.number(),
    legend: z.record(z.string(), z.string()),
    probabilities: z.record(z.string(), z.number()),
    confidence: z.number(),
  }),
]);

const responseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), answerSchema),
});

export class JevError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function systemOne<Q extends Record<string, Question>>(
  state: string | object,
  questions: Q,
): Promise<Answers<Q>> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new JevError("TYPESAFE_API_KEY が設定されていません");

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state, model: MODEL, questions }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if ((res.status === 429 || res.status === 529) && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    if (!res.ok) {
      throw new JevError(`Jev API ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
    }

    const parsed = responseSchema.parse(await res.json());
    for (const key of Object.keys(questions)) {
      if (!(key in parsed.answers)) throw new JevError(`Jev の応答に ${key} がありません`);
    }
    return parsed.answers as Answers<Q>;
  }
}
