import "server-only";

// 別サイトからのフォーム送信などで API を叩かれないよう、同一オリジンからのリクエストだけを受け付ける
export function isSameOrigin(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return !!origin && !!host && new URL(origin).host === host;
}

export function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
