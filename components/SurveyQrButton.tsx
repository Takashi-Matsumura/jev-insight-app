"use client";

import { QrCode, X } from "lucide-react";
import qrcode from "qrcode-generator";
import { useState } from "react";

// QR のまわりに必要な余白（セル数）
const MARGIN = 4;

function qrModules(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { size, path };
}

// アンケートの入口（/survey）の QR を全画面で出す。担当者の端末を来場者に向けて読み取ってもらう
export function SurveyQrButton() {
  const [url, setUrl] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        // いま開いているホスト（本番では公開用の URL）でアンケートの URL を作る
        onClick={() => setUrl(new URL("/survey", window.location.origin).href)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-4 text-lg font-semibold text-white dark:bg-white dark:text-zinc-900"
      >
        <QrCode className="size-5" aria-hidden />
        アンケートのQRを表示
      </button>

      {url && <SurveyQr url={url} onClose={() => setUrl(null)} />}
    </>
  );
}

function SurveyQr({ url, onClose }: { url: string; onClose: () => void }) {
  const { size, path } = qrModules(url);

  return (
    // 読み取りやすいよう、ダークモードでも白地に黒で出す
    <div role="dialog" aria-modal="true" aria-label="アンケートのQRコード" className="fixed inset-0 z-50 flex flex-col bg-white text-zinc-900">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="text-2xl font-bold">来場者アンケート</h2>
        <p>
          スマートフォンのカメラで読み取って、
          <br />
          アンケートにお答えください
        </p>
        <svg
          viewBox={`${-MARGIN} ${-MARGIN} ${size + MARGIN * 2} ${size + MARGIN * 2}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={url}
          className="aspect-square min-h-0 w-full max-w-sm"
        >
          <path d={path} fill="#000" />
        </svg>
        <p className="break-all font-mono text-xs text-zinc-500">{url}</p>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 font-semibold text-white"
        >
          <X className="size-5" aria-hidden />
          閉じる
        </button>
      </div>
    </div>
  );
}
