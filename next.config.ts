import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// 外部のサイトからは何も読み込まない。Next.js のインラインスクリプトがあるので script-src は 'unsafe-inline' を許す
// （nonce を使うとすべてのページが動的レンダリングになるため、使わない）。開発時だけ React が eval を使う
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Docker（docker-compose.yml）で server.js だけを動かすため
  output: "standalone",
  // 使っている技術を応答で知らせない
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // 古いブラウザ向けに、ほかのサイトへの埋め込みを X-Frame-Options でも禁止する
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // チケットの URL にはトークンが入るので、ほかのサイトへはオリジンだけを渡す
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // カメラ（QR の読み取り）とマイク（録音）は自分のサイトでだけ使う
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
