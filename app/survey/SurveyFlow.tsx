"use client";

import { CircleCheck, Coffee, RefreshCw, Ticket } from "lucide-react";
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

// コーヒーのコースターのような丸いボタン。内側の点線はゴールド
const CIRCLE_BUTTON =
  "relative flex aspect-square w-60 flex-col items-center justify-center gap-3 rounded-full p-6 text-center shadow-xl transition-transform active:scale-95";
const CIRCLE_DASH = <span aria-hidden className="absolute inset-3 rounded-full border-2 border-dashed border-gold/70" />;

// 来場者証の QR を読んでから、設問に進む（QR が読めないと回答できない）
export function SurveyFlow() {
  const [state, action, pending] = useActionState<SurveyState, FormData>(submitSurvey, {});
  const [scanning, setScanning] = useState(false);
  const [badgeCode, setBadgeCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [, startSubmit] = useTransition();
  const [consent, setConsent] = useState(false);
  // この端末で回答済みなら、丸ボタンをチケットへの入口に切り替える（ページを閉じても戻れるように）
  const savedTicket = useSyncExternalStore(noopSubscribe, readTicket, () => null);
  const showSavedTicket = savedTicket !== null && !badgeCode && !checking;

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
      // 回答済みの来場者証なら、ここでチケット画面へ移動する
      const result = await findTicket(badge.code);
      if (result.error) setScanError(result.error);
      else setBadgeCode(badge.code);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-3">
        {showSavedTicket ? (
          <Link href={`/survey/ticket/${savedTicket}`} className={`${CIRCLE_BUTTON} bg-espresso text-crema shadow-roast/30`}>
            {CIRCLE_DASH}
            <Ticket className="size-20 text-gold" strokeWidth={1.5} aria-hidden />
            <span className="font-semibold leading-snug">
              コーヒー引換
              <br />
              チケットを表示する
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setScanning(true)}
            disabled={checking}
            aria-label={badgeCode ? "QRコードを読み直す" : "来場者証のQRを読み取る"}
            className={`${CIRCLE_BUTTON} disabled:opacity-60 ${
              badgeCode ? "bg-paper text-roast shadow-roast/15 ring-4 ring-occ" : "bg-espresso text-crema shadow-roast/30"
            }`}
          >
            {CIRCLE_DASH}
            {badgeCode ? (
              <>
                <CircleCheck className="size-16 text-occ" strokeWidth={1.5} aria-hidden />
                <span className="font-semibold">読み取りました</span>
                <span className="flex items-center gap-1 text-sm opacity-80">
                  <RefreshCw className="size-4" aria-hidden />
                  読み直す
                </span>
              </>
            ) : (
              <>
                <QrIcon className="size-20 text-gold" aria-hidden />
                <span className="font-semibold leading-snug">
                  {checking ? (
                    "確認中…"
                  ) : (
                    <>
                      来場者証の
                      <br />
                      QRを読み取る
                    </>
                  )}
                </span>
              </>
            )}
          </button>
        )}
        {scanError && (
          <p role="alert" className="text-center text-sm font-semibold text-rose-700">
            {scanError}
          </p>
        )}
        {!badgeCode &&
          (showSavedTicket ? (
            <p className="text-balance text-center text-sm leading-relaxed text-roast/80">
              この端末では回答済みです。チケットはいつでもここから表示できます。
              <br />
              <button type="button" onClick={() => setScanning(true)} className="mt-2 font-semibold text-occ underline underline-offset-4">
                別の来場者証で回答する
              </button>
            </p>
          ) : (
            <p className="text-balance text-center text-sm leading-relaxed text-roast/80">
              はじめに、お持ちの来場者証のQRコードを読み取ってください。
              <br />
              読み取れないときは、ブースのスタッフにお声がけください。
            </p>
          ))}
      </section>

      {badgeCode && (
        <form
          // form の action に渡すと、エラーで戻ったときに入力が消える。自分で送って回答を残す
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            startSubmit(() => action(data));
          }}
          className="flex animate-[fadein_0.4s_ease-out] flex-col gap-4"
        >
          <input type="hidden" name="badgeCode" value={badgeCode} />

          {QUESTIONS.map((q, i) => (
            <QuestionField key={q.id} question={q} number={i + 1} />
          ))}

          <label className="flex items-start gap-3 rounded-2xl bg-gold/15 p-4 text-sm text-roast">
            <input
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-occ"
            />
            <span>{CONSENT_TEXT}</span>
          </label>

          {state.error && (
            <p role="alert" className="text-sm font-semibold text-rose-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !consent}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-occ py-4 text-lg font-bold text-white shadow-lg shadow-occ/30 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-roast/15 disabled:text-roast/40 disabled:shadow-none"
          >
            <Coffee className="size-5" aria-hidden />
            {pending ? "送信中…" : "回答してチケットを受け取る"}
          </button>
        </form>
      )}

      {scanning && (
        <QrScanner
          onDetect={handleDetect}
          onClose={() => setScanning(false)}
          hint="お持ちの来場者証のQRコードを枠に合わせてください"
        />
      )}
    </div>
  );
}

function QuestionField({ question: q, number }: { question: Question; number: number }) {
  const legend = (
    <span className="flex items-start gap-2">
      <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-espresso font-slab text-xs text-gold">
        {number}
      </span>
      <span>
        {q.label}
        {!q.required && <span className="ml-1 text-xs font-normal text-roast/60">（任意）</span>}
      </span>
    </span>
  );
  const card = "rounded-2xl bg-paper p-4 shadow-sm ring-1 ring-roast/10";

  if (q.kind === "text") {
    return (
      <label className={`${card} flex flex-col gap-3 font-semibold`}>
        {legend}
        <textarea
          name={q.id}
          rows={4}
          maxLength={q.maxLength}
          required={q.required}
          className="w-full rounded-xl border border-roast/20 bg-white px-3 py-3 text-base font-normal outline-none focus:border-occ focus:ring-2 focus:ring-occ/20"
        />
      </label>
    );
  }

  return (
    <fieldset className={`${card} flex flex-col gap-2`}>
      <legend className="float-left mb-2 w-full font-semibold">{legend}</legend>
      {q.choices.map((c) => (
        <label
          key={c.value}
          className="flex items-center gap-3 rounded-xl border border-roast/15 bg-white p-3 transition-colors has-checked:border-occ has-checked:bg-occ/10 has-checked:font-semibold"
        >
          <input
            type={q.kind === "single" ? "radio" : "checkbox"}
            name={q.id}
            value={c.value}
            // 複数選択の「1つ以上」はブラウザでは検証できないので、サーバ側で確かめる
            required={q.kind === "single" && q.required}
            className="size-5 shrink-0 accent-occ"
          />
          <span>{c.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
