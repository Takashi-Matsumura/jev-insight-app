import type { NextRequest } from "next/server";
import { errorResponse, isSameOrigin } from "@/lib/http";
import { finalizeSession, SessionStateError } from "@/lib/pipeline";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/finalize">) {
  if (!isSameOrigin(req)) return errorResponse("forbidden", 403);
  const { id } = await ctx.params;

  try {
    return Response.json(await finalizeSession(id));
  } catch (e) {
    if (e instanceof SessionStateError) return errorResponse(e.message, 409);
    console.error("[finalize]", e);
    return errorResponse("まとめの作成に失敗しました", 502);
  }
}
