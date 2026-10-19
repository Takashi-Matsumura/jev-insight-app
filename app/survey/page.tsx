import { ClipboardList, Coffee } from "lucide-react";
import Image from "next/image";
import { QrIcon } from "@/components/QrIcon";
import { CAFE_LOGO } from "@/lib/survey";
import { SurveyFlow } from "./SurveyFlow";

const STEPS = [
  { Icon: QrIcon, label: "バッジのQRを読み取る" },
  { Icon: ClipboardList, label: "アンケートに回答" },
  { Icon: Coffee, label: "コーヒーをどうぞ" },
] as const;

export default function SurveyPage() {
  return (
    <main className="mx-auto w-full max-w-lg p-4 pb-6">
      <header className="mb-6 mt-2 flex flex-col items-center text-center">
        <Image {...CAFE_LOGO} alt="OCCカフェ" priority unoptimized className="h-auto w-40" />
        <h1 className="mt-4 text-2xl font-bold tracking-wide">来場者アンケート</h1>
        <p className="mt-1 text-balance text-sm text-roast/80">お答えいただいた方に、コーヒーの引換チケットをお渡しします</p>
      </header>

      <ol className="mb-8 grid grid-cols-3 gap-2 rounded-2xl bg-espresso p-3 text-crema shadow-lg shadow-roast/20">
        {STEPS.map(({ Icon, label }, i) => (
          <li key={label} className="flex flex-col items-center gap-1.5 px-1 py-2 text-center">
            <span className="font-slab text-xs text-gold">STEP {i + 1}</span>
            <Icon className="size-7 text-crema" aria-hidden />
            <span className="text-balance text-xs leading-snug">{label}</span>
          </li>
        ))}
      </ol>

      <SurveyFlow />
    </main>
  );
}
