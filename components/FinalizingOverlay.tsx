"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "これまでの会話を振り返っています",
  "お話の中から課題を拾い上げています",
  "発言どうしのつながりを読み解いています",
  "背景にある課題を言語化しています",
  "おすすめの業務改善を選んでいます",
  "まとめを仕上げています",
];
const STEP_MS = 8000;

// 「終了」後、まとめができるまで（30〜60秒）固まって見えないよう、進み具合を言葉で見せる
export function FinalizingOverlay({ count }: { count: number }) {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      setSeconds(Math.floor(elapsed / 1000));
      // 最後の文言で止め、それ以上は進めない
      setStep(Math.min(STEPS.length - 1, Math.floor(elapsed / STEP_MS)));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background/95 p-8 backdrop-blur"
    >
      <div className="relative size-24">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-sky-600 dark:border-t-sky-400" />
        <div className="absolute inset-3 animate-pulse rounded-full bg-sky-100 dark:bg-sky-950" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p key={step} className="animate-[fadein_0.5s_ease-out] text-lg font-bold">
          {STEPS[step]}…
        </p>
        <p className="text-sm text-zinc-500">
          {count > 0 ? `${count}件の発言をもとに、あなたの課題をまとめています` : "お話の内容を整理しています"}
        </p>
      </div>

      <ol className="flex gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <li
            key={i}
            className={`h-1.5 w-6 rounded-full transition-colors duration-500 ${i <= step ? "bg-sky-600 dark:bg-sky-400" : "bg-zinc-200 dark:bg-zinc-800"}`}
          />
        ))}
      </ol>

      <p className="font-mono text-xs tabular-nums text-zinc-400">{seconds}秒</p>
    </div>
  );
}
