import "server-only";
import { timingSafeEqual } from "node:crypto";

// 共通の VIP カード。担当者が持ち歩くカードの QR は /survey/vip?key=<VIP_CARD_KEY> で、
// 読み取るたびにアンケートなしのコーヒー引換チケットを 1 枚受け取れる（何度でも）。
// key はカードを作り直すための合言葉。カードの写真が出回ったら、値を変えて刷り直せば古いカードは使えなくなる。
// 設定が無いときは VIP カードを使えない（閉じる側に倒す）

export const VIP_CARD_PATH = "/survey/vip";

function cardKey() {
  return process.env.VIP_CARD_KEY?.trim() ?? "";
}

export function checkVipKey(key: unknown): boolean {
  const expected = cardKey();
  if (!expected || typeof key !== "string") return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// 担当者の画面でカードの QR を出すためのパス。設定が無ければ null
export function vipCardPath(): string | null {
  const key = cardKey();
  return key ? `${VIP_CARD_PATH}?key=${encodeURIComponent(key)}` : null;
}
