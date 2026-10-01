import { answerText, QUESTIONS, type SurveyAnswers as Answers } from "@/lib/survey";

// アンケートの回答を、設問と並べて表示する（担当者用）
export function SurveyAnswers({ answers }: { answers: Answers }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {QUESTIONS.map((q) => (
        <div key={q.id}>
          <dt className="text-xs text-zinc-500">{q.label}</dt>
          <dd className="whitespace-pre-wrap">{answerText(q, answers) || "（未回答）"}</dd>
        </div>
      ))}
    </dl>
  );
}
