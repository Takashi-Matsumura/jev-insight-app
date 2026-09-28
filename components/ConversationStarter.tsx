"use client";

import { MessageCircleQuestion, RefreshCw } from "lucide-react";
import { useState } from "react";
import { OPENING_QUESTIONS, TOPIC_EXAMPLES } from "@/lib/starters";
import { TOPIC_KEYS, TOPICS, type Topic } from "@/lib/topics";

// 最初の課題が見つかるまで表示する、話しはじめのきっかけ。
// 端末を渡された来場者が「何を話せばいいか」迷わないようにする
export function ConversationStarter() {
  const [index, setIndex] = useState(0);
  const [topic, setTopic] = useState<Topic | null>(null);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-50">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
          <MessageCircleQuestion className="size-4" aria-hidden />
          まずは、こんなことからお話しください
        </p>
        <p key={index} className="animate-[fadein_0.4s_ease-out] text-lg font-bold leading-relaxed">
          {OPENING_QUESTIONS[index]}
        </p>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % OPENING_QUESTIONS.length)}
          className="mt-2 inline-flex items-center gap-1 text-sm text-sky-700 dark:text-sky-300"
        >
          <RefreshCw className="size-4" aria-hidden />
          別の質問
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs text-sky-800/80 dark:text-sky-200/80">
          気になるテーマをタップすると、よくあるお悩みの例が出ます
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPIC_KEYS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic((cur) => (cur === t ? null : t))}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                topic === t
                  ? "bg-sky-700 text-white dark:bg-sky-300 dark:text-sky-950"
                  : "bg-white text-sky-900 ring-1 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-100 dark:ring-sky-800"
              }`}
            >
              {TOPICS[t].label}
            </button>
          ))}
        </div>
        {topic && (
          <ul key={topic} className="mt-3 flex animate-[fadein_0.3s_ease-out] flex-col gap-2">
            {TOPIC_EXAMPLES[topic].map((ex) => (
              <li
                key={ex}
                className="rounded-xl bg-white px-3 py-2 text-[15px] leading-relaxed dark:bg-sky-900/40"
              >
                {ex}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
