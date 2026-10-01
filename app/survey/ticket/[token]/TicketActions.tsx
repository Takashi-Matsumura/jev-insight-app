"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { TICKET_STORAGE_KEY } from "@/lib/survey";
import { redeemTicket } from "../../actions";

const HOLD_MS = 1500;

function subscribeClock(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}
function readClock() {
  return new Date().toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export function TicketActions({ token, redeemed }: { token: string; redeemed: boolean }) {
  const router = useRouter();
  // 動く時計を出して、スクリーンショットではないことが分かるようにする
  const now = useSyncExternalStore(subscribeClock, readClock, () => "");
  const [holding, setHolding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // アンケートを開き直したときに、このチケットへ戻れるようにする
    try {
      localStorage.setItem(TICKET_STORAGE_KEY, token);
    } catch {}
    // 画面を表に戻したときに、お渡し済みかどうかを取り直す
    const reload = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", reload);
    window.addEventListener("pageshow", reload);
    return () => {
      document.removeEventListener("visibilitychange", reload);
      window.removeEventListener("pageshow", reload);
    };
  }, [token, router]);

  const redeem = () => {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const result = await redeemTicket(token);
      if (result.error) setError(result.error);
    });
  };

  const cancelHold = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  const startHold = () => {
    cancelHold();
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      redeem();
    }, HOLD_MS);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-center justify-center gap-1 font-mono text-lg tabular-nums text-zinc-500">
        <Clock className="size-4" aria-hidden />
        {now}
      </p>

      {redeemed ? (
        <p className="text-center text-sm text-zinc-500">このチケットは使用済みです。ご来場ありがとうございました。</p>
      ) : (
        <>
          <p className="text-balance text-center leading-relaxed">
            コーヒーの受け取り場所で、この画面をスタッフにお見せください。
            <br />
            <span className="text-sm text-zinc-500">下のボタンはスタッフが操作します。ご自身では押さないでください。</span>
          </p>

          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
            <p className="text-center text-xs font-semibold text-zinc-500">スタッフ用</p>
            {confirming ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-zinc-300 py-3 font-semibold dark:border-zinc-700">
                  やめる
                </button>
                <button type="button" onClick={redeem} className="flex-1 rounded-xl bg-zinc-900 py-3 font-semibold text-white dark:bg-white dark:text-zinc-900">
                  お渡し済みにする
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending}
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onContextMenu={(e) => e.preventDefault()}
                // キーボードや読み上げソフトでは長押しができないので、確認を挟んで実行する
                onClick={(e) => {
                  if (e.detail === 0) setConfirming(true);
                }}
                className="relative touch-none select-none overflow-hidden rounded-xl border border-zinc-300 py-4 font-semibold [-webkit-touch-callout:none] disabled:opacity-50 dark:border-zinc-700"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-emerald-200 dark:bg-emerald-800"
                  style={{ width: holding ? "100%" : "0%", transition: holding ? `width ${HOLD_MS}ms linear` : "none" }}
                />
                <span className="relative">{pending ? "更新中…" : "長押しでお渡し済みにする"}</span>
              </button>
            )}
            {error && (
              <p role="alert" className="text-center text-sm text-rose-600">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
