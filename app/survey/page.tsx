import { Coffee } from "lucide-react";
import { SurveyFlow } from "./SurveyFlow";

export default function SurveyPage() {
  return (
    <main className="mx-auto w-full max-w-lg p-4 pb-10">
      <header className="mb-6 mt-4">
        <h1 className="text-xl font-bold">来場者アンケート</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
          <Coffee className="size-4 shrink-0" aria-hidden />
          お答えいただいた方に、コーヒーの引換チケットをお渡しします
        </p>
      </header>
      <SurveyFlow />
    </main>
  );
}
