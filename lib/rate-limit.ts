import "server-only";
import { headers } from "next/headers";

// 来場者アンケートの操作の回数を、送ってきた IP アドレスごとに数える。
// 会場の Wi-Fi や携帯の回線では大勢が同じ IP アドレスに見えるので、人には届かず、スクリプトだけが超える回数にする。
// アプリは 1 つのコンテナ（1 プロセス）で動くので、数はメモリに置く（再起動すると数え直しになるが、困らない）

function counter(windowMs: number) {
  const windows = new Map<string, { start: number; count: number }>();
  return (key: string) => {
    const now = Date.now();
    let w = windows.get(key);
    if (!w || now - w.start >= windowMs) {
      // 期限の切れた窓が溜まりすぎないよう、ときどき掃除する
      if (windows.size > 10_000) for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
      w = { start: now, count: 0 };
      windows.set(key, w);
    }
    return ++w.count;
  };
}

// Cloudflare が付ける接続元の IP アドレス（来場者が書き換えても Cloudflare が上書きする）。
// 無いとき（手元の開発など）は数えない。全員を 1 つにまとめて数えると、本物の来場者を止めてしまうため
export async function clientIp() {
  return (await headers()).get("cf-connecting-ip");
}

// QR の確認・回答・お渡し済みにする：同じ IP アドレスから 10 秒に 30 回まで
const SURVEY_ACTIONS_PER_10S = 30;
const surveyActions = counter(10_000);

export function allowSurveyAction(ip: string | null) {
  return ip === null || surveyActions(ip) <= SURVEY_ACTIONS_PER_10S;
}

// 新しいチケットの発行は止めずに、同じ IP アドレスから 10 分に 30 枚を超えたらログに残す。
// 長い時間で止めると、会場の Wi-Fi で人気が出たときに本物の来場者を長く止めてしまうため
const TICKETS_ALERT_PER_10M = 30;
const newTickets = counter(10 * 60_000);

export function recordNewTicket(ip: string | null) {
  if (ip === null) return;
  const n = newTickets(ip);
  if (n % TICKETS_ALERT_PER_10M === 0) console.warn(`[survey] 同じ IP アドレスから 10 分間に ${n} 枚のチケットを発行しました: ${ip}`);
}
