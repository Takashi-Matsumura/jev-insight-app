import Link from "next/link";
import { NewSessionForm } from "./NewSessionForm";

export default function NewSessionPage() {
  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <Link href="/" className="text-sm text-zinc-500">
        ← 一覧へ
      </Link>
      <h1 className="mb-4 mt-2 text-xl font-bold">来場者の登録</h1>
      <NewSessionForm />
    </main>
  );
}
