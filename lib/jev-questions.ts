import type { ChoiceQuestion, NoulQuestion, ScoreQuestion } from "./jev";
import { PROBES, type ProbeKey } from "./probes";
import type { Signal, Topic } from "./topics";

// Jev に投げる質問の定義。instructions / criteria は日本語で書く。

export const SETTING =
  "展示会の出展ブースで、出展企業の担当者と来場者（企業・団体の社員）が話している会話の文字起こし。" +
  "出展企業は AI・DX・セキュリティ・人材開発・インフラ などの製品やサービスを提供している。";

const TOPIC_CRITERIA: Record<Topic, string> = {
  ai: "生成AI・機械学習・チャットボット・業務の自動判定など AI の活用に関する話",
  dx: "紙やExcel・手作業の業務のデジタル化、業務プロセス改善、システム刷新、データ活用",
  security: "情報漏えい、サイバー攻撃、ランサムウェア、アクセス管理、セキュリティ教育・監査",
  hr_development: "人材育成、研修、採用、スキル不足、人手不足、組織づくり、リスキリング",
  infrastructure: "サーバ、ネットワーク、クラウド移行、PC・端末管理、老朽化した設備や基盤の運用",
  other_business: "上のどれにも当てはまらない、事業・業務上の課題や要望",
};

const SIGNAL_CRITERIA: Record<Signal, string> = {
  pain_point: "困っていること・うまくいっていないこと・不満",
  current_state: "現在の業務のやり方、使っている仕組み、体制の説明",
  plan_or_desire: "今後やりたいこと、検討していること、欲しいもの",
  constraint: "予算・人員・スキル・社内ルールなどの制約",
  decision_process: "誰が決めるか、承認の流れ、検討体制",
  timeline: "いつまでに・いつ頃といった時期の話",
};

export const UTTERANCE_QUESTIONS = {
  is_business_relevant: {
    type: "noul",
    instructions:
      "『utterance』の発言は、来場者の会社・団体の課題、現状の業務、ニーズ、体制、予算、時期などを知る手がかりになるか？" +
      "context_before は直前の発言で、判断の参考にだけ使う。",
    criteria: {
      true: "業務上の困りごと・現状・要望・予算・時期・決裁・規模などの情報を含む",
      false: "あいさつ、お礼、名刺交換、雑談、天気、展示物の場所案内、相づちだけ、聞き取れない断片",
    },
  },
  is_visitor_situation: {
    type: "noul",
    instructions:
      "『utterance』は、来場者が自分の会社・団体の状況、困りごと、計画、体制を説明している発言か？" +
      "出展者（ブース担当者）が来場者に質問している発言や、質問を読み上げている発言、一般論は false。",
    criteria: {
      true: "来場者が自社の現状・困りごと・予定・体制を述べている",
      false: "相手への質問（〜ですか？〜でしょうか）、聞き返し、出展者側の説明、一般論",
    },
  },
  topic: {
    type: "choice",
    instructions: "『utterance』の発言は、どの領域の話題に最も近いか？",
    criteria: TOPIC_CRITERIA,
  },
  signal: {
    type: "choice",
    instructions: "『utterance』の発言は、課題を理解するうえでどの種類の情報か？",
    criteria: SIGNAL_CRITERIA,
  },
  severity: {
    type: "score",
    instructions: "『utterance』から読み取れる課題は、来場者の会社にとってどれくらい深刻・緊急か？",
    criteria: [
      "課題とは言えない",
      "あれば便利という程度",
      "困っているが急ぎではない",
      "業務に支障が出ており改善したい",
      "今すぐ解決が必要で深刻",
    ],
  },
  budget_signal: {
    type: "noul",
    instructions: "『utterance』に、予算・費用・投資・承認額についての言及があるか？",
    criteria: { true: "予算や費用に触れている", false: "予算や費用には触れていない" },
  },
  timeline_signal: {
    type: "noul",
    instructions: "『utterance』に、導入・解決したい時期や期限についての言及があるか？",
    criteria: { true: "時期や期限に触れている", false: "時期や期限には触れていない" },
  },
  decision_maker_signal: {
    type: "noul",
    instructions: "『utterance』に、決裁者・承認者・検討の担当者についての言及があるか？",
    criteria: { true: "決める人や承認の流れに触れている", false: "決める人や承認には触れていない" },
  },
} satisfies {
  is_business_relevant: NoulQuestion;
  is_visitor_situation: NoulQuestion;
  topic: ChoiceQuestion<Topic>;
  signal: ChoiceQuestion<Signal>;
  severity: ScoreQuestion;
  budget_signal: NoulQuestion;
  timeline_signal: NoulQuestion;
  decision_maker_signal: NoulQuestion;
};

export const PROBE_QUESTIONS = {
  next_probe: {
    type: "choice",
    instructions:
      "これまでに聞き取れた来場者の発言（findings）を踏まえて、課題を具体化し後日の商談につなげるために、" +
      "次に確認すべき最も重要な不足情報はどれか？ already_mentioned が true の項目はすでに話に出ているので、原則として選ばない。",
    criteria: Object.fromEntries(
      Object.entries(PROBES).map(([k, v]) => [k, v.criterion]),
    ) as Record<ProbeKey, string>,
  },
} satisfies { next_probe: ChoiceQuestion<ProbeKey> };

export const LEAD_QUESTIONS = {
  lead: {
    type: "score",
    instructions: "これまでに聞き取れた来場者の発言（findings）から、後日の商談につながる見込みはどの段階か？",
    criteria: [
      "業務上の課題が見えず、商談の見込みはない",
      "情報収集の段階で、課題はまだ漠然としている",
      "具体的な課題があり、解決策を探している",
      "具体的な課題に加えて、時期・予算・決裁者のいずれかが見えている",
    ],
  },
} satisfies { lead: ScoreQuestion };

// lead の score（0〜3）を A/B/C に変換する
export function leadGrade(score: number): "A" | "B" | "C" {
  if (score >= 2.3) return "A";
  if (score >= 1.3) return "B";
  return "C";
}
