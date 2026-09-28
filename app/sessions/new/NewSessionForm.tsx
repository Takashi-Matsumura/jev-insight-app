"use client";

import { useActionState, useCallback, useState, useSyncExternalStore } from "react";
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

      {badgeCode ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <span className="text-xl">✓</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">QRコードを読み取りました</span>
            <span className="block break-all font-mono text-xs opacity-70">{badgeCode}</span>
          </span>
          <button type="button" onClick={() => setScanning(true)} className="text-sm underline">
            読み直す
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="rounded-xl border-2 border-dashed border-zinc-400 py-5 text-lg font-semibold dark:border-zinc-600"
        >
          📷 来場者バッジのQRを読み取る
        </button>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        会社・団体名
        <input
          name="company"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={inputClass}
          autoComplete="organization"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        お名前
        <input
          name="visitorName"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          autoComplete="name"
        />
      </label>

      <label className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <input name="consent" type="checkbox" className="mt-0.5 size-5 shrink-0" />
        <span>会話の録音・文字起こしについて、来場者の同意を得ました（課題に関係しない発言は保存しません）</span>
      </label>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-zinc-900 py-4 text-lg font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
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
