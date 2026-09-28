"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PROBES, type ProbeKey } from "@/lib/probes";
import { InsightCard, type InsightItem } from "./InsightCard";

// 12秒ごとに録音を区切り、それぞれを単体で変換できる音声ファイルとして順番に送信する。
// （MediaRecorder の timeslice で分けた断片は、2つ目以降にヘッダが無く単体では変換できない）
const CHUNK_MS = 12_000;
const MAX_ATTEMPTS = 3;

type ChunkResponse = { kept: InsightItem[]; discarded: number; nextProbe: ProbeKey | null };

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
}) {
  const router = useRouter();
  const [items, setItems] = useState(props.initialItems);
  const [probe, setProbe] = useState(props.initialProbe);
  const [discarded, setDiscarded] = useState(0);
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
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const form = new FormData();
          form.append("audio", blob, `chunk-${seq}.${ext}`);
          const res = await fetch(`/api/sessions/${props.sessionId}/chunks`, { method: "POST", body: form });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
          const data = body as ChunkResponse;
          setItems((prev) => [...prev, ...data.kept]);
          setDiscarded((n) => n + data.discarded);
          if (data.nextProbe) setProbe(data.nextProbe);
          setError(null);
          return;
        } catch (e) {
          if (attempt === MAX_ATTEMPTS) setError(`送信に失敗しました（${(e as Error).message}）`);
          else await new Promise((r) => setTimeout(r, 1000 * attempt));
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

        {probe && (
          <div className="rounded-xl bg-sky-50 p-3 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
            <p className="text-xs font-semibold">次に聞いてみる</p>
            <p className="text-base font-medium">{PROBES[probe].question}</p>
          </div>
        )}

        <p className="text-xs text-zinc-500">
          課題メモ {items.length}件 ・ 関係ない発言として破棄 {discarded}件
          {queued > 0 && ` ・ 処理中 ${queued}件`}
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <ul className="flex flex-col-reverse gap-2">
        {items.map((item) => (
          <InsightCard key={item.id} item={item} />
        ))}
      </ul>
      {items.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-500">課題に関係する発言があると、ここに表示されます</p>
      )}
    </div>
  );
}
