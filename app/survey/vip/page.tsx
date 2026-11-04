import { Crown } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import { CAFE_LOGO } from "@/lib/survey";
import { checkVipKey } from "@/lib/vip";
import { VipClaim } from "./VipClaim";

// 共通の VIP カードの QR を読んだときに開く画面。ボタンを押すと、アンケートなしでチケットを受け取れる。
// 開いただけでは発行しない（リンクの先読みやプレビューでチケットが増えないように）
export default async function VipPage(props: PageProps<"/survey/vip">) {
  await connection();
  const { key } = await props.searchParams;
  const valid = checkVipKey(key);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 p-4 pb-6 text-center">
      <header className="mt-2 flex flex-col items-center">
        <Image {...CAFE_LOGO} alt="OCCカフェ" priority unoptimized className="h-auto w-32" />
        <span className="mt-4 flex items-center gap-1.5 font-slab text-xs tracking-[0.4em] text-gold">
          <Crown className="size-4" aria-hidden />
          VIP INVITATION
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-wide">コーヒーのご招待</h1>
      </header>

      {valid ? (
        <VipClaim cardKey={key as string} />
      ) : (
        <p role="alert" className="text-balance font-semibold text-rose-700">
          このVIPカードは使えません。
          <br />
          スタッフにお声がけください。
        </p>
      )}
    </main>
  );
}
