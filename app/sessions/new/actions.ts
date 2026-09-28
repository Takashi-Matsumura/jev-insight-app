"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";

// 認証はアプリの前段（Cloudflare Access）で行う。アプリ側ではログインを持たない。

const field = (max: number) => z.string().trim().max(max).default("");

// QR を読み取った場合は、会社名・氏名は後から主催者データで補えるので省略できる
const inputSchema = z
  .object({
    company: field(200),
    visitorName: field(100),
    badgeCode: field(4096),
    staffName: field(100),
    consent: z.literal("on", { error: "録音の同意を確認してください" }),
  })
  .superRefine((v, ctx) => {
    if (v.badgeCode) return;
    if (!v.company) ctx.addIssue({ code: "custom", message: "QRを読み取るか、会社名を入力してください" });
    else if (!v.visitorName) ctx.addIssue({ code: "custom", message: "お名前を入力してください" });
  });

export type CreateState = { error?: string };

export async function createSession(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { company, visitorName, badgeCode, staffName } = parsed.data;
  const id = crypto.randomUUID();
  await getDb()
    .insert(schema.sessions)
    .values({ id, company, visitorName, badgeCode, staffName, consentAt: new Date() });
  redirect(`/sessions/${id}`);
}
