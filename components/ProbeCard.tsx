"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { PROBES, type ProbeKey } from "@/lib/probes";

// 「次に聞いてみる」。定型の質問が会話に合わないときは「別の問いかけ」で、
// Jev が選んだ別の観点を gemma4 が会話に合わせた問いかけにする
export function ProbeCard({ sessionId, probe }: { sessionId: string; probe: ProbeKey }) {
  const [generated, setGenerated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const question = generated ?? PROBES[probe].question;

  const regenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: question }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setGenerated(body.question);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-sky-50 p-3 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">
          次に聞いてみる
          {generated && <span className="ml-2 font-normal opacity-70">会話の内容から生成</span>}
        </p>
        <button
          type="button"
          onClick={regenerate}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200 disabled:opacity-60 dark:bg-sky-900/60 dark:text-sky-100 dark:ring-sky-800"
        >
          {loading ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
          {loading ? "考え中…" : "別の問いかけ"}
        </button>
      </div>
      <p
        key={question}
        className={`mt-1 animate-[fadein_0.4s_ease-out] text-base font-medium ${loading ? "opacity-50" : ""}`}
      >
        {question}
      </p>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
