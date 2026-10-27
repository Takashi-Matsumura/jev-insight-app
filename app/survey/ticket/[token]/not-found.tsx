"use client";

import { Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { TICKET_STORAGE_KEY } from "@/lib/survey";

// 回答が消されたチケット（テスト回答の削除や、テストモードでの答え直し）。
// 端末が覚えたままだと、アンケートの丸ボタンが開けないチケットを指し続けるので、ここで忘れる
export default function TicketNotFound() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const token = pathname.split("/").pop();
      if (token && localStorage.getItem(TICKET_STORAGE_KEY) === token) localStorage.removeItem(TICKET_STORAGE_KEY);
    } catch {}
  }, [pathname]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-4 pt-12 text-center">
      <Ticket className="size-16 text-roast/40" strokeWidth={1.5} aria-hidden />
      <h1 className="text-lg font-bold">チケットが見つかりません</h1>
      <p className="text-balance text-sm leading-relaxed text-roast/80">
        お手数ですが、もう一度アンケートにお答えください。
        <br />
        ご不明な点は、ブースのスタッフにお声がけください。
      </p>
      <Link href="/survey" className="mt-2 font-semibold text-occ underline underline-offset-4">
        アンケートに戻る
      </Link>
    </main>
  );
}
