// 来場者バッジのQRコードから会社名・氏名を読み取る。
// vCard / MECARD 形式なら取り出し、それ以外（来場者IDだけ等）は空で返す。

export type BadgeInfo = { company: string; name: string };

export function parseBadge(raw: string): BadgeInfo {
  const text = raw.trim();

  if (/^BEGIN:VCARD/i.test(text)) {
    const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    const get = (key: string) =>
      lines.find((l) => l.toUpperCase().startsWith(key + ":") || l.toUpperCase().startsWith(key + ";"))
        ?.replace(/^[^:]*:/, "")
        .trim() ?? "";
    const n = get("N").split(";").filter(Boolean).slice(0, 2).join(" ");
    return { company: get("ORG").split(";")[0] ?? "", name: get("FN") || n };
  }

  if (/^MECARD:/i.test(text)) {
    const get = (key: string) => text.match(new RegExp(`[:;]${key}:([^;]*)`, "i"))?.[1]?.trim() ?? "";
    return { company: get("ORG"), name: get("N").replace(/,/g, " ") };
  }

  return { company: "", name: "" };
}

export const BADGE_CODE_MAX = 4096;

export type BadgeCheck = { ok: true; code: string } | { ok: false; error: string };

// アンケートで読み取った QR が来場者バッジとして使えるかを確かめる。
// バッジの形式は主催者によって違うので、明らかに違うもの（このアプリ自身の URL など）だけを弾く。
export function checkBadgeCode(raw: string, selfHost: string): BadgeCheck {
  const code = raw.trim();
  if (!code) return { ok: false, error: "QRコードを読み取れませんでした。もう一度お試しください。" };
  if (code.length > BADGE_CODE_MAX) return { ok: false, error: "このQRコードは来場者バッジのものではないようです。" };
  if (URL.canParse(code) && new URL(code).host === selfHost) {
    return { ok: false, error: "これはアンケートのQRコードです。来場者バッジのQRコードを読み取ってください。" };
  }
  return { ok: true, code };
}
