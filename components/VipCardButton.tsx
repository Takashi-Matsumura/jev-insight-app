"use client";

import { Crown, X } from "lucide-react";
import { useState } from "react";
import { alfaSlab } from "@/lib/fonts";
import { QR_MARGIN, qrModules } from "@/lib/qr";

// 共通の VIP カードの QR を全画面で出す。来場者証を持たない方や特別なお客様に読み取ってもらうと、
// アンケートなしでコーヒー引換チケットを受け取れる（何度でも使える）。印刷するときは、この画面を保存する
// path: VIP カードのパス（lib/vip.ts）。VIP_CARD_KEY が未設定なら null
export function VipCardButton({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);

  if (!path) {
    return <p className="mb-4 text-center text-xs text-zinc-500">VIPカードは使えません（VIP_CARD_KEY が未設定です）</p>;
  }

  return (
    <>
      <button
        type="button"
        // いま開いているホスト（本番では公開用の URL）で VIP カードの URL を作る
        onClick={() => setUrl(new URL(path, window.location.origin).href)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gold bg-espresso py-3 font-semibold text-gold"
      >
        <Crown className="size-5" aria-hidden />
        VIPカードを表示（アンケートなし）
      </button>

      {url && <VipCard url={url} onClose={() => setUrl(null)} />}
    </>
  );
}

function VipCard({ url, onClose }: { url: string; onClose: () => void }) {
  const { size, path } = qrModules(url);
  const box = size + QR_MARGIN * 2;

  return (
    // アンケートの QR（白地）と取り違えないよう、カフェのチケットと同じ濃い地にゴールドで出す。
    // QR そのものは読み取りやすいよう、白地に黒のまま
    <div
      role="dialog"
      aria-modal="true"
      aria-label="VIPカード"
      className={`${alfaSlab.variable} fixed inset-0 z-50 flex flex-col bg-espresso text-crema [color-scheme:light]`}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <Crown className="size-10 text-gold" strokeWidth={1.5} aria-hidden />
          <span className="font-slab text-xs tracking-[0.4em] text-gold">VIP INVITATION</span>
          <h2 className="text-2xl font-bold tracking-wide">コーヒーのご招待</h2>
        </div>
        <p className="text-balance text-sm leading-relaxed text-crema/85">
          スマートフォンのカメラで読み取ってください。
          <br />
          アンケートなしで、コーヒー引換チケットをお受け取りいただけます。
        </p>

        {/* 紙のチケットに見立てた枠。内側の点線はゴールド */}
        <div className="relative min-h-0 w-full max-w-sm rounded-3xl bg-paper p-4 shadow-2xl ring-4 ring-gold">
          <span aria-hidden className="pointer-events-none absolute inset-2 rounded-2xl border-2 border-dashed border-gold/60" />
          <svg
            viewBox={`${-QR_MARGIN} ${-QR_MARGIN} ${box} ${box}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label={url}
            className="relative aspect-square w-full bg-white"
          >
            <path d={path} fill="#000" />
          </svg>
        </div>

        <p className="font-slab text-xs tracking-[0.3em] text-gold/80">OCC CAFE · VIP CARD</p>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-semibold text-espresso"
        >
          <X className="size-5" aria-hidden />
          閉じる
        </button>
      </div>
    </div>
  );
}
