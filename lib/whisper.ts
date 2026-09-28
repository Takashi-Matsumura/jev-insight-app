import "server-only";
import { z } from "zod";

// whisper.cpp の whisper-server（--convert 付きで起動）への文字起こしリクエスト

const WHISPER_URL = process.env.WHISPER_URL ?? "http://127.0.0.1:8090";

// 用語のヒント。無いと「AI」が「愛」になるなど誤認識が増える
const PROMPT =
  "展示会ブースでの商談。AI、生成AI、DX、セキュリティ、人材開発、研修、インフラ、クラウド、ネットワーク。";

// 無音やノイズに対して Whisper が出しがちな定型文
const HALLUCINATIONS = [
  /ご視聴(いただき)?ありがとうございました/,
  /チャンネル登録/,
  /字幕(は|を)/,
  /^(はい|うん|ええ)[。、]?$/,
];

export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("language", "ja");
  form.append("response_format", "json");
  form.append("temperature", "0");
  form.append("prompt", PROMPT);

  const res = await fetch(`${WHISPER_URL}/inference`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`whisper-server ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const { text } = z.object({ text: z.string() }).parse(await res.json());
  return text.replace(/\s*\n\s*/g, "").trim();
}

// 文末（。！？）で区切って発話単位にする。末尾の区切れていない部分は次のチャンクに持ち越す。
export function splitSentences(text: string): { sentences: string[]; rest: string } {
  const parts = text.match(/[^。！？!?]+[。！？!?]+|[^。！？!?]+$/g) ?? [];
  const sentences: string[] = [];
  let rest = "";
  for (const [i, raw] of parts.entries()) {
    const s = raw.trim();
    if (!s) continue;
    const isLast = i === parts.length - 1;
    if (isLast && !/[。！？!?]$/.test(s)) rest = s;
    else if (!HALLUCINATIONS.some((re) => re.test(s))) sentences.push(s);
  }
  return { sentences, rest };
}
