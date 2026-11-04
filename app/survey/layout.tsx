import type { Metadata, Viewport } from "next";
import { alfaSlab } from "@/lib/fonts";

// 来場者が自分のスマホで開く画面。担当者用の画面とは題名を分ける
export const metadata: Metadata = {
  title: "来場者アンケート",
  description: "アンケートにお答えいただいた方に、コーヒーの引換チケットをお渡しします",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f3e7d5",
};

// 担当者用の白い画面と一目で見分けられるよう、OCCカフェの色で包む。端末のダークモードには合わせない
export default function SurveyLayout({ children }: LayoutProps<"/survey">) {
  return (
    <div className={`${alfaSlab.variable} flex flex-1 flex-col bg-crema text-espresso [color-scheme:light]`}>
      {children}
      <footer className="mt-auto pb-8 pt-4 text-center font-slab text-xs tracking-widest text-roast/50">
        OCC CAFE · COFFEE &amp; SOLUTION
      </footer>
    </div>
  );
}
