"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegenerateButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/sessions/${sessionId}/finalize`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.summaryError) setError("作り直しに失敗しました");
    setPending(false);
    router.refresh();
  };

  return (
    <span className="flex flex-col items-end gap-1">
      <button onClick={run} disabled={pending} className="inline-flex items-center gap-1 text-sm text-zinc-600 disabled:opacity-50">
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {pending ? "作成中…" : "まとめを作り直す"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
