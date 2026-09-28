import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

// 画面間の移動リンク。矢印は記号ではなくアイコンで出す
export function NavLink({ href, children, forward = false }: { href: string; children: React.ReactNode; forward?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 text-sm text-zinc-500">
      {!forward && <ChevronLeft className="size-4" aria-hidden />}
      {children}
      {forward && <ChevronRight className="size-4" aria-hidden />}
    </Link>
  );
}
