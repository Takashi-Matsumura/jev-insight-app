import { ClipboardList, MessagesSquare } from "lucide-react";
import Link from "next/link";

const TABS = [
  { key: "memo", href: "/", label: "課題メモ", Icon: MessagesSquare },
  { key: "survey", href: "/responses", label: "アンケート回答", Icon: ClipboardList },
] as const;

// 担当者用の 2 つの一覧（課題メモ／アンケート回答）を切り替える
export function StaffTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="mb-4 flex gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-semibold dark:bg-zinc-900">
      {TABS.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === current ? "page" : undefined}
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 ${
            key === current ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500"
          }`}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
