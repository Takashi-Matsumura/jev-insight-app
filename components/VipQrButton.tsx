"use client";

import { Crown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { issueVipTicket } from "@/app/responses/actions";
import { alfaSlab } from "@/lib/fonts";
import { QR_MARGIN, qrModules } from "@/lib/qr";
import { eventDayLabel, ticketNumber } from "@/lib/survey";

type Issued = { url: string; id: number; eventDay: string };

// VIP 用 QR。押すたびにアンケートなしのチケットを 1 枚発行し、その URL を QR で全画面に出す。
// 来場者証を持たない方や特別なお客様に、担当者の判断でコーヒーをお渡しするときに使う
export function VipQrButton() {
  const router = useRouter();
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const issue = () => {
    setError(null);
    startTransition(async () => {
      const result = await issueVipTicket();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // いま開いているホスト（本番では公開用の URL）でチケットの URL を作る
      const url = new URL(`/survey/ticket/${result.token}`, window.location.origin).href;
      setIssued({ url, id: result.id, eventDay: result.eventDay });
    });
  };

  const close = () => {
    setIssued(null);
    // 一覧に発行したチケットを出す
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={issue}
        disabled={pending}
        className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gold bg-espresso py-3 font-semibold text-gold disabled:opacity-60"
      >
        <Crown className="size-5" aria-hidden />
        {pending ? "発行中…" : "VIP用QRを表示（アンケートなし）"}
      </button>
      <p className="mb-4 text-center text-xs text-zinc-500">押すたびにコーヒー引換チケットを 1 枚発行します</p>
      {error && (
        <p role="alert" className="-mt-2 mb-4 text-center text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {issued && <VipQr issued={issued} onClose={close} />}
    </>
  );
}

function VipQr({ issued, onClose }: { issued: Issued; onClose: () => void }) {
  const { size, path } = qrModules(issued.url);
  const box = size + QR_MARGIN * 2;

  return (
    // アンケートの QR（白地）と取り違えないよう、カフェのチケットと同じ濃い地にゴールドで出す。
    // QR そのものは読み取りやすいよう、白地に黒のまま
    <div role="dialog" aria-modal="true" aria-label="VIP用のQRコード" className={`${alfaSlab.variable} fixed inset-0 z-50 flex flex-col bg-espresso text-crema [color-scheme:light]`}>
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
            aria-label={issued.url}
            className="relative aspect-square w-full bg-white"
          >
            <path d={path} fill="#000" />
          </svg>
        </div>

        <p className="flex flex-col items-center gap-0.5">
          <span className="font-slab text-3xl tracking-wider text-gold">No.{ticketNumber(issued.id)}</span>
          <span className="text-xs text-crema/70">{eventDayLabel(issued.eventDay)} 当日限り · 1 杯分</span>
        </p>
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
