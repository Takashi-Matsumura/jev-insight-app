import type { MetadataRoute } from "next";

// 担当者がスマホのホーム画面に置いて使う。アイコンは public/icons/ にある
// 当日はアンケート回答（リード獲得）が先で、課題メモはその後なので、アンケート回答の画面から開く
// （このファイルとアイコンは、前段の認証の外に出す必要がある。README の「公開」を参照）
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ブース課題メモ",
    short_name: "課題メモ",
    description: "展示会ブースでの会話から来場者の課題を見つける",
    lang: "ja",
    start_url: "/responses",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#18181b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
