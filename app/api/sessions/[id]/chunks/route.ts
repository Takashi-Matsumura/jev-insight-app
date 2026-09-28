import type { NextRequest } from "next/server";
import { errorResponse, isSameOrigin } from "@/lib/http";
import { processChunk, SessionStateError } from "@/lib/pipeline";

const MAX_BYTES = 4 * 1024 * 1024;

// 1行1JSON（NDJSON）で返す。文字起こしが終わった時点で transcript を先に送り、
// Jev の判定が終わったら result を送る（画面に早く文字を出すため）。
export type ChunkEvent =
  | { type: "transcript"; sentences: string[]; pending: string }
  | ({ type: "result" } & Awaited<ReturnType<typeof processChunk>>)
  | { type: "error"; error: string };

export async function POST(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/chunks">) {
  if (!isSameOrigin(req)) return errorResponse("forbidden", 403);
  const { id } = await ctx.params;

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return errorResponse("音声がありません", 400);
  if (audio.size > MAX_BYTES) return errorResponse("音声が大きすぎます", 413);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ChunkEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const result = await processChunk(id, audio, audio.name || "chunk.webm", (t) =>
          send({ type: "transcript", ...t }),
        );
        send({ type: "result", ...result });
      } catch (e) {
        if (!(e instanceof SessionStateError)) console.error("[chunks]", e);
        send({ type: "error", error: e instanceof SessionStateError ? e.message : "文字起こしまたは判定に失敗しました" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
