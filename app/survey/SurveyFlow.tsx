"use client";

import { ChevronRight, CircleCheck, RefreshCw, Ticket } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useSyncExternalStore, useTransition } from "react";
import { QrIcon } from "@/components/QrIcon";
import { QrScanner } from "@/components/QrScanner";
import { checkBadgeCode } from "@/lib/badge";
import { CONSENT_TEXT, QUESTIONS, TICKET_STORAGE_KEY, type Question } from "@/lib/survey";
import { findTicket, submitSurvey, type SurveyState } from "./actions";

const noopSubscribe = () => () => {};
function readTicket() {
  try {
    return localStorage.getItem(TICKET_STORAGE_KEY);
  } catch {
    return null;
  }
}

// 来場者バッジの QR を読んでから、設問に進む（QR が読めないと回答できない）
export function SurveyFlow() {
  const [state, action, pending] = useActionState<SurveyState, FormData>(submitSurvey, {});
  const [scanning, setScanning] = useState(false);
  const [badgeCode, setBadgeCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [, startSubmit] = useTransition();
  const [consent, setConsent] = useState(false);
  // この端末で回答済みなら、チケットに戻れるようにする
  const savedTicket = useSyncExternalStore(noopSubscribe, readTicket, () => null);

  const handleDetect = (value: string) => {
    setScanning(false);
    const badge = checkBadgeCode(value, window.location.host);
    if (!badge.ok) {
      setBadgeCode("");
      setScanError(badge.error);
      return;
    }
    setScanError(null);
    startCheck(async () => {
      // 回答済みのバッジなら、ここでチケット画面へ移動する
      const result = await findTicket(badge.code);
      if (result.error) setScanError(result.error);
      else setBadgeCode(badge.code);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {savedTicket && !badgeCode && (
        <Link
          href={`/survey/ticket/${savedTicket}`}
          className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
        >
          <Ticket className="size-6 shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="block font-semibold">回答済みです</span>
            <span className="block text-sm opacity-80">コーヒー引換チケットを表示する</span>
          </span>
          <ChevronRight className="size-5 shrink-0" aria-hidden />
        </Link>
      )}

      <section className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setScanning(true)}
          disabled={checking}
          aria-label={badgeCode ? "QRコードを読み直す" : "来場者バッジのQRを読み取る"}
          className={`flex aspect-square w-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-4 text-center transition-colors disabled:opacity-50 ${
            badgeCode
              ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-100"
              : "border-zinc-400 text-zinc-700 active:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:active:bg-zinc-900"
          }`}
        >
          {badgeCode ? (
            <>
              <CircleCheck className="size-16" strokeWidth={1.5} aria-hidden />
              <span className="font-semibold">読み取りました</span>
              <span className="flex items-center gap-1 text-sm opacity-80">
                <RefreshCw className="size-4" aria-hidden />
                読み直す
              </span>
            </>
          ) : (
            <>
              <QrIcon className="size-20" aria-hidden />
              <span className="font-semibold leading-snug">
                {checking ? (
                  "確認中…"
                ) : (
                  <>
                    来場者バッジの
                    <br />
                    QRを読み取る
                  </>
                )}
              </span>
            </>
          )}
        </button>
        {scanError && (
          <p role="alert" className="text-center text-sm text-rose-600">
            {scanError}
          </p>
        )}
        {!badgeCode && (
          <p className="text-center text-sm text-zinc-500">
            はじめに、お持ちの来場者バッジのQRコードを読み取ってください。
            <br />
            読み取れないときは、ブースのスタッフにお声がけください。
          </p>
        )}
      </section>

      {badgeCode && (
        <form
          // form の action に渡すと、エラーで戻ったときに入力が消える。自分で送って回答を残す
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            startSubmit(() => action(data));
          }}
          className="flex animate-[fadein_0.4s_ease-out] flex-col gap-6"
        >
          <input type="hidden" name="badgeCode" value={badgeCode} />

          {QUESTIONS.map((q, i) => (
            <QuestionField key={q.id} question={q} number={i + 1} />
          ))}

          <label className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <input
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-5 shrink-0"
            />
            <span>{CONSENT_TEXT}</span>
          </label>

          {state.error && (
            <p role="alert" className="text-sm text-rose-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !consent}
            className="rounded-xl bg-zinc-900 py-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-white dark:text-zinc-900 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            {pending ? "送信中…" : "回答してチケットを受け取る"}
          </button>
        </form>
      )}

      {scanning && (
        <QrScanner
          onDetect={handleDetect}
          onClose={() => setScanning(false)}
          hint="お持ちの来場者バッジのQRコードを枠に合わせてください"
        />
      )}
    </div>
  );
}

function QuestionField({ question: q, number }: { question: Question; number: number }) {
  const legend = (
    <>
      <span className="mr-1 text-zinc-500">Q{number}.</span>
      {q.label}
      {!q.required && <span className="ml-1 text-xs font-normal text-zinc-500">（任意）</span>}
    </>
  );

  if (q.kind === "text") {
    return (
      <label className="flex flex-col gap-2 font-semibold">
        <span>{legend}</span>
        <textarea
          name={q.id}
          rows={4}
          maxLength={q.maxLength}
          required={q.required}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base font-normal dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      {q.choices.map((c) => (
        <label
          key={c.value}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 has-checked:border-zinc-900 has-checked:bg-zinc-100 dark:border-zinc-800 dark:has-checked:border-white dark:has-checked:bg-zinc-900"
        >
          <input
            type={q.kind === "single" ? "radio" : "checkbox"}
            name={q.id}
            value={c.value}
            // 複数選択の「1つ以上」はブラウザでは検証できないので、サーバ側で確かめる
            required={q.kind === "single" && q.required}
            className="size-5 shrink-0"
          />
          <span>{c.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
