"use server";

import { isStaffRequest } from "@/lib/access";
import { getDb, schema } from "@/lib/db";
import { measure } from "@/lib/metrics";
import { eventDay } from "@/lib/survey";

// 担当者用の操作。Server Actions は公開している /survey の URL からも呼べるので、最初に isStaffRequest() で確かめる

export type VipTicket = { token: string; id: number; eventDay: string } | { error: string };

// VIP 用 QR を出すたびに、アンケートなしのチケットを 1 枚発行する。
// QR はそのチケットの URL なので、1 つの QR で受け取れるコーヒーは 1 杯だけ（撮られて広まっても増えない）。
// 来場者証を持たない方にも渡せるよう、来場者証の代わりに発行ごとの値を入れる
export async function issueVipTicket(): Promise<VipTicket> {
  return measure("survey:vip", async () => {
    if (!(await isStaffRequest())) return { error: "ログインの有効期限が切れました。画面を開き直してください" };
    const token = crypto.randomUUID();
    const day = eventDay();
    const [row] = await getDb()
      .insert(schema.surveyResponses)
      .values({
        token,
        badgeCode: `vip:${crypto.randomUUID()}`,
        eventDay: day,
        company: "",
        visitorName: "",
        answers: {},
        consentAt: new Date(),
        vip: true,
      })
      .returning({ id: schema.surveyResponses.id });
    return { token, id: row.id, eventDay: day };
  });
}
