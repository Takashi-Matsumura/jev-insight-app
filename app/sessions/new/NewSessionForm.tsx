"use client";

import { CircleCheck, RefreshCw } from "lucide-react";
import { useActionState, useCallback, useState, useSyncExternalStore } from "react";
import { QrIcon } from "@/components/QrIcon";
import { QrScanner } from "@/components/QrScanner";
import { parseBadge } from "@/lib/badge";
import { createSession, type CreateState } from "./actions";

const STAFF_KEY = "booth.staffName";
const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900";

const noopSubscribe = () => () => {};
function readStaff() {
  try {
    return localStorage.getItem(STAFF_KEY) ?? "";
  } catch {
    return "";
  }
}

// 来場者の手間を最小にするため、入力は QR・会社名・氏名だけにする
export function NewSessionForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(createSession, {});
  const [scanning, setScanning] = useState(false);
  const [badgeCode, setBadgeCode] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  // ブース担当者名は端末に覚えておき、毎回の入力を省く
  const storedStaff = useSyncExternalStore(noopSubscribe, readStaff, () => "");
  const [staffEdit, setStaffEdit] = useState<string | null>(null);

  const handleDetect = useCallback((value: string) => {
    setScanning(false);
    setBadgeCode(value);
    const info = parseBadge(value);
    if (info.company) setCompany(info.company);
    if (info.name) setName(info.name);
  }, []);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="badgeCode" value={badgeCode} />

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setScanning(true)}
          aria-label={badgeCode ? "QRコードを読み直す" : "来場者バッジのQRを読み取る"}
          className={`flex aspect-square w-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
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
                来場者バッジの
                <br />
                QRを読み取る
              </span>
            </>
          )}
        </button>
        {badgeCode && <p className="w-full break-all text-center font-mono text-xs text-zinc-500">{badgeCode}</p>}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>
          会社・団体名{badgeCode && <span className="ml-1 text-xs font-normal text-zinc-500">（QR読み取り済みのため省略可）</span>}
        </span>
        <input
          name="company"
          required={!badgeCode}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={inputClass}
          autoComplete="organization"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>
          お名前{badgeCode && <span className="ml-1 text-xs font-normal text-zinc-500">（省略可）</span>}
        </span>
        <input
          name="visitorName"
          required={!badgeCode}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          autoComplete="name"
        />
      </label>

      <label className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <input
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-5 shrink-0"
        />
        <span>会話の録音・文字起こしについて、来場者の同意を得ました（課題に関係しない発言は保存しません）</span>
      </label>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <button
        type="submit"
        // 録音の同意を確認するまでは押せないようにする
        disabled={pending || !consent}
        className="rounded-xl bg-zinc-900 py-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-white dark:text-zinc-900 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
      >
        {pending ? "作成中…" : "会話を始める"}
      </button>

      <label className="flex items-center gap-2 text-xs text-zinc-500">
        ブース担当
        <input
          name="staffName"
          placeholder="名前（この端末に記憶）"
          value={staffEdit ?? storedStaff}
          onChange={(e) => {
            setStaffEdit(e.target.value);
            try {
              localStorage.setItem(STAFF_KEY, e.target.value);
            } catch {}
          }}
          className="flex-1 border-b border-zinc-300 bg-transparent px-1 py-1 text-sm dark:border-zinc-700"
        />
      </label>

      {scanning && <QrScanner onDetect={handleDetect} onClose={() => setScanning(false)} />}
    </form>
  );
}
