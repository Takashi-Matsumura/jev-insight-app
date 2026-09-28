// 会話中に「まだ聞けていない情報」を埋めるための深掘り質問。
// どれを出すかは Jev が選び、文面はここで固定する（Jev は文章を生成しないため）。

export const PROBES = {
  impact: {
    criterion: "困りごとが業務や売上にどれだけ影響しているか、まだ分かっていない",
    question: "その件で、具体的にどんな影響が出ていますか？（工数・コスト・ミスなど）",
  },
  scale: {
    criterion: "対象となる人数・拠点・システムなどの規模がまだ分かっていない",
    question: "対象になるのは何名くらい・何拠点くらいの規模でしょうか？",
  },
  current_tools: {
    criterion: "今どんな仕組み・ツール・外部業者で対応しているかがまだ分かっていない",
    question: "今はどのような仕組みやツールで対応されていますか？",
  },
  department: {
    criterion: "どの部署・誰が困っているのか（担当部署）がまだ分かっていない",
    question: "主にどちらの部署でお困りの件でしょうか？",
  },
  timeline: {
    criterion: "いつまでに解決・導入したいかという時期がまだ分かっていない",
    question: "いつ頃までに何とかしたい、という目安はありますか？",
  },
  budget: {
    criterion: "予算の有無・規模・予算化の状況がまだ分かっていない",
    question: "この件について、予算化の予定やご検討状況はいかがですか？",
  },
  decision_maker: {
    criterion: "導入を決める人・決裁の流れがまだ分かっていない",
    question: "導入を検討される際は、どなたが最終的に判断されますか？",
  },
  enough: {
    criterion: "課題の内容・規模・時期・予算・決裁者がおおむね分かっており、追加で聞くべきことは少ない",
    question: "後日、詳しいご提案をお持ちしてもよろしいでしょうか？",
  },
} as const;

export type ProbeKey = keyof typeof PROBES;

const normalize = (s: string) => s.replace(/（[^）]*）|\([^)]*\)|[\s、。，．,.!?！？・…「」]/g, "");

function bigrams(s: string) {
  const out = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) out.set(s.slice(i, i + 2), (out.get(s.slice(i, i + 2)) ?? 0) + 1);
  return out;
}

// 文字の2つ組の一致率（Dice 係数）。0〜1
function similarity(a: string, b: string) {
  const x = bigrams(a);
  const y = bigrams(b);
  let common = 0;
  for (const [k, n] of x) common += Math.min(n, y.get(k) ?? 0);
  const total = Math.max(1, a.length - 1) + Math.max(1, b.length - 1);
  return (2 * common) / total;
}

// 画面に出した深掘り質問を、ブース担当者が読み上げた発言かどうか
export function looksLikeProbe(text: string) {
  const t = normalize(text);
  return Object.values(PROBES).some((p) => {
    const q = normalize(p.question);
    return q.includes(t) || similarity(t, q) >= 0.6;
  });
}
