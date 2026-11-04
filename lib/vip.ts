import "server-only";
import { timingSafeEqual } from "node:crypto";

// 共通の VIP カード。担当者が持ち歩くカードの QR は /survey/vip?key=<VIP_CARD_KEY> で、
// 読み取るたびにアンケートなしのコーヒー引換チケットを 1 枚受け取れる（同じ端末で 1 日 VIP_TICKETS_PER_DAY 枚まで）。
// key はカードを作り直すための合言葉。カードの写真が出回ったら、値を変えて刷り直せば古いカードは使えなくなる。
// 設定が無いときは VIP カードを使えない（閉じる側に倒す）

export const VIP_CARD_PATH = "/survey/vip";

// VIP カードで受け取れるチケットは、同じ端末につき 1 日（日本時間）この枚数まで
export const VIP_TICKETS_PER_DAY = 5;

// 端末を見分ける Cookie（中身は crypto.randomUUID() の値）。発行したチケットの badgeCode を
// 「vip:<この値>:<発行ごとの値>」にして、その日に何枚受け取ったかを数える。
// Cookie を消したりプライベートブラウズにしたりすれば数え直しになるが、会場で繰り返し押される分は止められる
export const VIP_DEVICE_COOKIE = "vip_device";
export const VIP_DEVICE_MAX_AGE = 60 * 60 * 24 * 30;

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
