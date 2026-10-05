// 来場者アンケートの設問（サーバ・クライアント共通）。
// フォーム・検証・CSV の列・担当者向けの表示は、すべてこの定義から作る。
// DB には選択肢の value を保存するので、公開後は label だけを変え、value は変えないこと。

import { TOPIC_KEYS, TOPICS } from "./topics";

type Choice = { value: string; label: string };

export type Question =
  | { kind: "single" | "multi"; id: string; label: string; required: boolean; choices: readonly Choice[] }
  | { kind: "text"; id: string; label: string; required: boolean; maxLength: number };

export type SurveyAnswers = Record<string, string | string[]>;

export const QUESTIONS: readonly Question[] = [
  {
    kind: "single",
    id: "purpose",
    label: "本日のご来場の目的を教えてください",
    required: true,
    choices: [
      { value: "research", label: "情報収集" },
      { value: "considering", label: "導入を検討している製品・サービスがある" },
      { value: "existing", label: "既存のお取引についての相談" },
      { value: "partner", label: "協業・パートナー探し" },
      { value: "other", label: "その他" },
    ],
  },
  {
    kind: "multi",
    id: "topics",
    label: "関心のあるテーマをお選びください（複数可）",
    required: true,
    choices: TOPIC_KEYS.map((t) => ({ value: t, label: TOPICS[t].label })),
  },
  {
    kind: "single",
    id: "timeline",
    label: "導入や見直しの時期はお決まりですか",
    required: true,
    choices: [
      { value: "3m", label: "3か月以内" },
      { value: "6m", label: "半年以内" },
      { value: "12m", label: "1年以内" },
      { value: "undecided", label: "時期は未定" },
      { value: "none", label: "予定はない" },
    ],
  },
  {
    kind: "single",
    id: "contact",
    label: "後日のご連絡について",
    required: true,
    choices: [
      { value: "call", label: "担当者から連絡がほしい" },
      { value: "material", label: "資料だけほしい" },
      { value: "no", label: "希望しない" },
    ],
  },
  {
    kind: "text",
    id: "comment",
    label: "いまお困りのこと、聞いてみたいことがあればお書きください",
    required: false,
    maxLength: 500,
  },
];

// TODO: 社名とプライバシーポリシーの案内が決まったら差し替える
export const CONSENT_TEXT = "ご回答の内容と来場者バッジの情報を、当社からのご案内のために利用することに同意します";

// 回答済みの端末がチケットに戻れるよう、チケットの token を localStorage に覚えておくキー
export const TICKET_STORAGE_KEY = "survey.ticket";

// 社内テスト用: 1 にすると、同じ来場者バッジで何度でも答え直せる（前の回答とチケットは消える）。
// 当日は設定しない（既定は 1 バッジ 1 枚）
export function allowReanswer() {
  return process.env.SURVEY_ALLOW_REANSWER === "1";
}

export function ticketNumber(id: number) {
  return String(id).padStart(3, "0");
}

// 回答を表示用の文字列にする（複数選択は「・」でつなぐ）
export function answerText(q: Question, answers: SurveyAnswers): string {
  const a = answers[q.id];
  if (a == null) return "";
  if (q.kind === "text") return String(a);
  const label = (v: string) => q.choices.find((c) => c.value === v)?.label ?? v;
  return (Array.isArray(a) ? a : [a]).map(label).join("・");
}

type Parsed = { ok: true; answers: SurveyAnswers } | { ok: false; error: string };

// 送信されたフォームから回答を取り出す。選択肢にない値は受け付けない
export function parseAnswers(formData: FormData): Parsed {
  const answers: SurveyAnswers = {};
  for (const q of QUESTIONS) {
    const values = formData.getAll(q.id).filter((v): v is string => typeof v === "string");
    const missing = { ok: false, error: `「${q.label}」にお答えください` } as const;

    if (q.kind === "text") {
      const text = (values[0] ?? "").trim();
      if (q.required && !text) return missing;
      if (text.length > q.maxLength) return { ok: false, error: `「${q.label}」は${q.maxLength}文字以内でお書きください` };
      answers[q.id] = text;
      continue;
    }

    const allowed = new Set(q.choices.map((c) => c.value));
    const picked = [...new Set(values)].filter((v) => allowed.has(v));
    if (q.required && picked.length === 0) return missing;
    answers[q.id] = q.kind === "multi" ? picked : (picked[0] ?? "");
  }
  return { ok: true, answers };
}
