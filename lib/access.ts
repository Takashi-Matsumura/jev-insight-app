import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { headers } from "next/headers";

// スタッフ用の操作が、前段の認証（Cloudflare Access）を通ったリクエストから呼ばれたかを確かめる。
// Server Actions はどのページの URL からでも呼べるので、認証の外にある /survey 経由でも届いてしまう。
// Access はログイン済みのリクエストに署名付きのトークン（Cf-Access-Jwt-Assertion）を付けるので、それを検証する。
// /survey は Access が素通しにしているため、そこから来たリクエストにはトークンが無い。

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function isStaffRequest(): Promise<boolean> {
  const team = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;
  // 手元の開発では Access が無いので通す。本番で設定が抜けているときは、通さない側に倒す
  if (!team || !aud) return process.env.NODE_ENV !== "production";

  const token = (await headers()).get("cf-access-jwt-assertion");
  if (!token) return false;
  jwks ??= createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`));
  try {
    await jwtVerify(token, jwks, { issuer: `https://${team}`, audience: aud, algorithms: ["RS256"] });
    return true;
  } catch {
    return false;
  }
}
