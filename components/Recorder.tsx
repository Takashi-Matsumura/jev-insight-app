"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PROBES, type ProbeKey } from "@/lib/probes";
import type { ChunkEvent } from "@/app/api/sessions/[id]/chunks/route";
import { DiscardedLine, InsightCard, PendingLine, type InsightItem } from "./InsightCard";

// 8秒ごとに録音を区切り、それぞれを単体で変換できる音声ファイルとして順番に送信する。
// （MediaRecorder の timeslice で分けた断片は、2つ目以降にヘッダが無く単体では変換できない）
const CHUNK_MS = 8_000;
const MAX_ATTEMPTS = 3;

// 画面に流す1行。文字起こし直後は judging、Jev の判定後に kept / discarded になる
type Entry = { key: string; seq: number } & (
  | { kind: "kept"; item: InsightItem }
  | { kind: "judging" | "failed"; text: string }
  | { kind: "discarded"; text: string; relevance: number; reason: string }
);

// ストリームで返る NDJSON を1行ずつ読む
async function* readEvents(res: Response): AsyncGenerator<ChunkEvent> {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) yield JSON.parse(line) as ChunkEvent;
    }
  }
}

function LeadMeter({ score }: { score: number }) {
  const hint = score >= 2.3 ? "十分に具体的です。終了してまとめられます" : score >= 1.3 ? "課題は見えてきました" : "まだ漠然としています";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs text-zinc-500">課題の具体度</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <span
            className={`block h-full rounded-full ${score >= 2.3 ? "bg-emerald-500" : score >= 1.3 ? "bg-amber-500" : "bg-zinc-400"}`}
            style={{ width: `${Math.min(100, (score / 3) * 100)}%` }}
          />
        </span>
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
          {score.toFixed(2)}
          <span className="font-normal text-zinc-400"> / 3</span>
        </span>
      </div>
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function pickMimeType() {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function recordSegments(
  stream: MediaStream,
  handlers: {
    onChunk: (blob: Blob) => void;
    shouldContinue: () => boolean;
    onStart: (rec: MediaRecorder, timer: ReturnType<typeof setTimeout>) => void;
  },
) {
  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => parts.push(e.data);
  rec.onstop = () => {
    handlers.onChunk(new Blob(parts, { type: rec.mimeType }));
    if (handlers.shouldContinue()) recordSegments(stream, handlers);
  };
  rec.start();
  handlers.onStart(rec, setTimeout(() => rec.state === "recording" && rec.stop(), CHUNK_MS));
}

export function Recorder(props: {
  sessionId: string;
  initialItems: InsightItem[];
  initialProbe: ProbeKey | null;
  initialLeadScore: number | null;
}) {
  const router = useRouter();
  const [feed, setFeed] = useState<Entry[]>(() =>
    props.initialItems.map((item) => ({ key: `i${item.id}`, seq: 0, kind: "kept", item })),
  );
  const [pendingText, setPendingText] = useState("");
  const [probe, setProbe] = useState(props.initialProbe);
  const [leadScore, setLeadScore] = useState(props.initialLeadScore);
  const [recording, setRecording] = useState(false);
  const [started, setStarted] = useState(props.initialItems.length > 0);
  const [queued, setQueued] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const seqRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const upload = useCallback(
    async (blob: Blob, seq: number) => {
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const replace = (entries: Entry[]) => setFeed((prev) => [...prev.filter((e) => e.seq !== seq), ...entries]);

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const form = new FormData();
          form.append("audio", blob, `chunk-${seq}.${ext}`);
          const res = await fetch(`/api/sessions/${props.sessionId}/chunks`, { method: "POST", body: form });
          if (!res.ok || !res.body) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
          for await (const ev of readEvents(res)) {
            if (ev.type === "error") throw new Error(ev.error);
            if (ev.type === "transcript") {
              // 文字起こしが届いた時点で表示し、判定中であることを見せる
              replace(ev.sentences.map((text, i) => ({ key: `${seq}-${i}`, seq, kind: "judging", text })));
              setPendingText(ev.pending);
            } else {
              replace(
                ev.results.map((r, i): Entry =>
                  r.kept
                    ? { key: `${seq}-${i}`, seq, kind: "kept", item: r.kept }
                    : { key: `${seq}-${i}`, seq, kind: "discarded", text: r.text, relevance: r.relevance, reason: r.reason },
                ),
              );
              setPendingText(ev.pending);
              if (ev.nextProbe) setProbe(ev.nextProbe as ProbeKey);
              if (ev.leadScore != null) setLeadScore(ev.leadScore);
            }
          }
          setError(null);
          return;
        } catch (e) {
          if (attempt === MAX_ATTEMPTS) {
            setFeed((prev) => prev.map((x) => (x.seq === seq && x.kind === "judging" ? { ...x, kind: "failed" } : x)));
            setError(`送信に失敗しました（${(e as Error).message}）`);
          } else await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    },
    [props.sessionId],
  );

  const enqueue = useCallback(
    (blob: Blob) => {
      if (blob.size === 0) return;
      const seq = ++seqRef.current;
      setQueued((n) => n + 1);
      queueRef.current = queueRef.current.then(() => upload(blob, seq)).finally(() => setQueued((n) => n - 1));
    },
    [upload],
  );

  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    recordSegments(stream, {
      onChunk: enqueue,
      shouldContinue: () => activeRef.current,
      onStart: (rec, timer) => {
        recorderRef.current = rec;
        timerRef.current = timer;
      },
    });
  }, [enqueue]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const start = async () => {
    setError(null);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("マイクを使用できません。ブラウザの設定でマイクを許可してください。");
      return;
    }
    // 録音中に画面が消えると録音が止まる端末があるため、スリープを防ぐ
    wakeLockRef.current = await navigator.wakeLock?.request("screen").catch(() => null);
    activeRef.current = true;
    setRecording(true);
    setStarted(true);
    startSegment();
  };

  // 録音を止めて、最後の音声を送り切るまで待つ
  const pause = useCallback(async () => {
    activeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      await new Promise<void>((resolve) => {
        rec.addEventListener("stop", () => resolve(), { once: true });
        rec.stop();
      });
    }
    stopStream();
    setRecording(false);
    await queueRef.current;
  }, [stopStream]);

  const finish = async () => {
    setFinishing(true);
    try {
      await pause();
      const res = await fetch(`/api/sessions/${props.sessionId}/finalize`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError(`まとめの作成に失敗しました（${(e as Error).message}）`);
      setFinishing(false);
    }
  };

  useEffect(
    () => () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      recorderRef.current?.stop();
      stopStream();
    },
    [stopStream],
  );

  const keptCount = feed.filter((e) => e.kind === "kept").length;
  const discardedCount = feed.filter((e) => e.kind === "discarded").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          {recording ? (
            <button onClick={pause} className="flex-1 rounded-xl bg-rose-600 py-3 text-lg font-semibold text-white">
              <span className="mr-2 inline-block size-3 animate-pulse rounded-full bg-white" />
              録音中（一時停止）
            </button>
          ) : (
            <button
              onClick={start}
              disabled={finishing}
              className="flex-1 rounded-xl bg-zinc-900 py-3 text-lg font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {started ? "録音を再開" : "録音を開始"}
            </button>
          )}
          <button
            onClick={finish}
            disabled={finishing}
            className="rounded-xl border border-zinc-300 px-4 font-semibold disabled:opacity-50 dark:border-zinc-700"
          >
            {finishing ? "まとめ中…" : "終了"}
          </button>
        </div>

        {leadScore != null && <LeadMeter score={leadScore} />}

        {probe && (
          <div className="rounded-xl bg-sky-50 p-3 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
            <p className="text-xs font-semibold">次に聞いてみる</p>
            <p className="text-base font-medium">{PROBES[probe].question}</p>
          </div>
        )}

        <p className="text-xs text-zinc-500">
          課題メモ {keptCount}件 ・ 破棄 {discardedCount}件
          {queued > 0 && ` ・ 処理中 ${queued}件`}
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <ul className="flex flex-col-reverse gap-2">
        {feed.map((e) =>
          e.kind === "kept" ? (
            <InsightCard key={e.key} item={e.item} />
          ) : e.kind === "discarded" ? (
            <DiscardedLine key={e.key} text={e.text} relevance={e.relevance} reason={e.reason} />
          ) : (
            <PendingLine key={e.key} text={e.text} label={e.kind === "judging" ? "Jev 判定中…" : "送信失敗"} />
          ),
        )}
        {pendingText && <PendingLine text={pendingText} label="聞き取り中…" />}
      </ul>
      {feed.length === 0 && !pendingText && (
        <p className="py-6 text-center text-sm text-zinc-500">課題に関係する発言があると、ここに表示されます</p>
      )}
    </div>
  );
}
