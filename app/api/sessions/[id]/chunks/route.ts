import type { NextRequest } from "next/server";
import { errorResponse, isSameOrigin } from "@/lib/http";
import { processChunk, SessionStateError } from "@/lib/pipeline";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/chunks">) {
  if (!isSameOrigin(req)) return errorResponse("forbidden", 403);
  const { id } = await ctx.params;

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return errorResponse("音声がありません", 400);
  if (audio.size > MAX_BYTES) return errorResponse("音声が大きすぎます", 413);

  try {
    return Response.json(await processChunk(id, audio, audio.name || "chunk.webm"));
  } catch (e) {
    if (e instanceof SessionStateError) return errorResponse(e.message, 409);
    console.error("[chunks]", e);
    return errorResponse("文字起こしまたは判定に失敗しました", 502);
  }
}
