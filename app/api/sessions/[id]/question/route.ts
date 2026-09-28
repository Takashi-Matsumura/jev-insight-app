import type { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, isSameOrigin } from "@/lib/http";
import { alternativeQuestion, SessionStateError } from "@/lib/pipeline";

const bodySchema = z.object({ current: z.string().max(500).default("") });

// 「別の問いかけ」を生成する
export async function POST(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/question">) {
  if (!isSameOrigin(req)) return errorResponse("forbidden", 403);
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorResponse("リクエストが不正です", 400);

  try {
    return Response.json(await alternativeQuestion(id, parsed.data.current));
  } catch (e) {
    if (e instanceof SessionStateError) return errorResponse(e.message, 409);
    console.error("[question]", e);
    return errorResponse("問いかけを作成できませんでした", 502);
  }
}
