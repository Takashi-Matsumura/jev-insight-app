import { NavLink } from "@/components/NavLink";
import { NewSessionForm } from "./NewSessionForm";

export default function NewSessionPage() {
  return (
    <main className="mx-auto w-full max-w-lg p-4">
      <NavLink href="/">一覧へ</NavLink>
      <h1 className="mb-4 mt-2 text-xl font-bold">来場者の登録</h1>
      <NewSessionForm />
    </main>
  );
}
