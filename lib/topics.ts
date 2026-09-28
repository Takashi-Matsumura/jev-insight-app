// サーバ・クライアント共通の定数（ラベルと表示色）

export const TOPICS = {
  ai: {
    label: "AI",
    color: "bg-violet-100 text-violet-800",
    description: "生成AI・機械学習・チャットボット・業務の自動判定など AI の活用に関する話",
  },
  dx: {
    label: "DX",
    color: "bg-sky-100 text-sky-800",
    description: "紙やExcel・手作業の業務のデジタル化、業務プロセス改善、システム刷新、データ活用",
  },
  security: {
    label: "セキュリティ",
    color: "bg-rose-100 text-rose-800",
    description: "情報漏えい、サイバー攻撃、ランサムウェア、アクセス管理、セキュリティ教育・監査",
  },
  hr_development: {
    label: "人材開発",
    color: "bg-amber-100 text-amber-800",
    description: "人材育成、研修、採用、スキル不足、人手不足、離職、組織づくり、リスキリング",
  },
  infrastructure: {
    label: "インフラ",
    color: "bg-emerald-100 text-emerald-800",
    description: "サーバ、ネットワーク、クラウド移行、PC・端末管理、老朽化した設備や基盤の運用",
  },
  other_business: {
    label: "その他",
    color: "bg-zinc-200 text-zinc-800",
    description: "上のどれにも当てはまらない、事業・業務上の課題や要望",
  },
} as const;

export type Topic = keyof typeof TOPICS;
export const TOPIC_KEYS = Object.keys(TOPICS) as Topic[];

export const SIGNALS = {
  pain_point: "困りごと",
  current_state: "現状",
  plan_or_desire: "計画・要望",
  constraint: "制約",
  decision_process: "決裁・体制",
  timeline: "時期",
} as const;

export type Signal = keyof typeof SIGNALS;

export function topicLabel(topic: string | null | undefined) {
  return TOPICS[topic as Topic]?.label ?? topic ?? "-";
}

export function signalLabel(signal: string | null | undefined) {
  return SIGNALS[signal as Signal] ?? signal ?? "-";
}

export function displayCompany(company: string) {
  return company || "会社名未入力（QRのみ）";
}
