import { Alfa_Slab_One } from "next/font/google";

// ロゴの「COFFEE & SOLUTION」に合わせた、英字の飾り用の書体（font-slab）。
// 来場者向けの画面と、担当者の画面で出す VIP 用 QR で使う
export const alfaSlab = Alfa_Slab_One({ weight: "400", subsets: ["latin"], variable: "--font-alfa-slab" });
