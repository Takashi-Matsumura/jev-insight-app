import type { Metadata } from "next";

// 来場者が自分のスマホで開く画面。担当者用の画面とは題名を分ける
export const metadata: Metadata = {
  title: "来場者アンケート",
  description: "アンケートにお答えいただいた方に、コーヒーの引換チケットをお渡しします",
  robots: { index: false, follow: false },
};

export default function SurveyLayout({ children }: LayoutProps<"/survey">) {
  return children;
}
