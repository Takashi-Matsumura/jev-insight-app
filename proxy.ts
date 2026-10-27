import type { NextRequest } from "next/server";
import { count } from "@/lib/metrics";

// リクエスト数を、画面の種類ごとに 1 分単位で数える（lib/metrics.ts）。
// アンケートの画面は前もって作ってある静的なページで、ページの中では数えられないため、ここで数える。
// 認証や書き換えはしない（スタッフ用の操作の確認は、それぞれの Server Action と API で行う）
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const group = path.startsWith("/survey/ticket/")
    ? "ticket"
    : path === "/survey"
      ? "survey"
      : /^\/api\/sessions\/[^/]+\/chunks$/.test(path)
        ? "chunks"
        : "staff";
  count(`req:${group}${req.method === "GET" || req.method === "HEAD" ? "" : ":post"}`);
}

export const config = {
  // 静的ファイル（JS・CSS・画像・ロゴ・マニフェストなど、拡張子の付いたもの）は数えない
  matcher: ["/((?!_next/static|_next/image|.*\\.[^/]+$).*)"],
};
