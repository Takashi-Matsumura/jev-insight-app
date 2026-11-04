"use client";

import { Ticket } from "lucide-react";
import { useState, useTransition } from "react";
import { claimVipTicket } from "../actions";

export function VipClaim({ cardKey }: { cardKey: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const claim = () => {
    setError(null);
    startTransition(async () => {
      // 受け取れたらチケットの画面へ移動する
      const result = await claimVipTicket(cardKey);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="leading-relaxed text-roast/90">
        ご来場ありがとうございます。
        <br />
        {/* 狭い幅では読点で折り返す */}
        <span className="inline-block">アンケートなしで、</span>
        <span className="inline-block">コーヒー引換チケットを</span>
        <span className="inline-block">お受け取りいただけます。</span>
      </p>
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        className="relative flex aspect-square w-60 flex-col items-center justify-center gap-3 rounded-full bg-espresso p-6 text-crema shadow-xl shadow-roast/30 ring-4 ring-gold transition-transform active:scale-95 disabled:opacity-60"
      >
        <span aria-hidden className="absolute inset-3 rounded-full border-2 border-dashed border-gold motion-safe:animate-[heartbeat_1.4s_ease-in-out_infinite]" />
        <Ticket className="size-20 text-gold" strokeWidth={1.5} aria-hidden />
        <span className="font-semibold leading-snug">
          {pending ? (
            "発行中…"
          ) : (
            <>
              コーヒー引換
              <br />
              チケットを受け取る
            </>
          )}
        </span>
      </button>
      {error && (
        <p role="alert" className="text-center text-sm font-semibold text-rose-700">
          {/* 文の途中で折り返さないよう、文ごとに区切る */}
          {error.split(/(?<=。)/).map((sentence) => (
            <span key={sentence} className="inline-block">
              {sentence}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
