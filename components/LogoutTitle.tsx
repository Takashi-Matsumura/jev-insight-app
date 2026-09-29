"use client";

import { useRef } from "react";

// 見出しを長押しすると Cloudflare Access からログアウトする。
// Access のセッションは既定で24時間続くため、共用の端末でも担当者を切り替えられるようにする
const LONG_PRESS_MS = 800;
// Next.js のページではなく Cloudflare が処理する URL なので、ルーターを通さずに移動する
const LOGOUT_PATH = "/cdn-cgi/access/logout";

export function LogoutTitle({ children }: { children: React.ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const start = () => {
    cancel();
    timer.current = setTimeout(() => {
      timer.current = null;
      if (window.confirm("ログアウトしますか？")) window.location.assign(new URL(LOGOUT_PATH, window.location.origin));
    }, LONG_PRESS_MS);
  };

  return (
    <h1
      className="select-none text-xl font-bold [-webkit-touch-callout:none]"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </h1>
  );
}
