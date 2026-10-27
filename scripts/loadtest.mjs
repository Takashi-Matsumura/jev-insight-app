#!/usr/bin/env node
// 当日の前に、どこまでの同時アクセスに耐えられるかを測る負荷試験。
// 本番のコンテナではなく、手元で動かしたサーバ（DB はコピー）や、whisper・llama-server に直接送って測る。
//
//   node scripts/loadtest.mjs survey  <base URL> [同時数=50] [秒数=30] [チケットの token]
//     アンケートの画面（とチケットの画面）を、同時数の分だけ休まず開き続ける
//   node scripts/loadtest.mjs whisper <whisper URL> <音声ファイル> [ブース数=6] [秒数=64]
//     ブースの数だけ、録音の断片（8 秒ごと）を同時に文字起こしに送る
//   node scripts/loadtest.mjs gemma   <llama-server URL> [同時数=12] [回数=2]
//     会話の終了（まとめ 2 本）が同時に重なったときのように、まとめの生成を同時に送る

import { readFile } from "node:fs/promises";
import path from "node:path";

const [mode, base, ...rest] = process.argv.slice(2);

function summary(label, ms, errors) {
  const s = [...ms].sort((a, b) => a - b);
  const p = (q) => (s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(q * s.length))]) : 0);
  console.log(
    `${label}: ${s.length} 件（失敗 ${errors}） 中央値 ${p(0.5)}ms / 95% ${p(0.95)}ms / 最大 ${Math.round(s.at(-1) ?? 0)}ms`,
  );
}

async function timed(fn) {
  const start = performance.now();
  try {
    await fn();
    return { ms: performance.now() - start, ok: true };
  } catch (e) {
    return { ms: performance.now() - start, ok: false, error: e };
  }
}

async function surveyTest([concurrency = "50", seconds = "30", token]) {
  const urls = [`${base}/survey`, ...(token ? [`${base}/survey/ticket/${token}`] : [])];
  const until = Date.now() + Number(seconds) * 1000;
  const results = Object.fromEntries(urls.map((u) => [u, { ms: [], errors: 0 }]));
  let firstError;
  await Promise.all(
    Array.from({ length: Number(concurrency) }, async (_, i) => {
      for (let n = i; Date.now() < until; n++) {
        const url = urls[n % urls.length];
        const r = await timed(async () => {
          const res = await fetch(url);
          await res.arrayBuffer();
          if (!res.ok) throw new Error(`${res.status}`);
        });
        results[url].ms.push(r.ms);
        if (!r.ok) {
          results[url].errors++;
          firstError ??= r.error;
        }
      }
    }),
  );
  const total = Object.values(results).reduce((n, r) => n + r.ms.length, 0);
  console.log(`同時 ${concurrency}、${seconds} 秒: 1 秒あたり ${Math.round(total / Number(seconds))} 件`);
  for (const [url, r] of Object.entries(results)) summary(new URL(url).pathname.replace(/[0-9a-f-]{36}/, "<token>"), r.ms, r.errors);
  if (firstError) console.log("最初の失敗:", String(firstError));
}

async function whisperTest([file, booths = "6", seconds = "64"]) {
  if (!file) throw new Error("音声ファイルを指定してください");
  const audio = new Blob([await readFile(file)]);
  const name = path.basename(file);
  const rounds = Math.ceil(Number(seconds) / 8);
  const ms = [];
  let errors = 0;
  // ブースごとに 8 秒おきに 1 つ送る。前の断片の結果を待たずに送る（実際の録音と同じ）
  await Promise.all(
    Array.from({ length: Number(booths) }, async (_, booth) => {
      // ブースどうしで送る時刻を少しずらす
      await new Promise((r) => setTimeout(r, (booth * 8000) / Number(booths)));
      const pending = [];
      for (let i = 0; i < rounds; i++) {
        pending.push(
          timed(async () => {
            const form = new FormData();
            form.append("file", audio, name);
            form.append("language", "ja");
            form.append("response_format", "json");
            const res = await fetch(`${base}/inference`, { method: "POST", body: form });
            await res.text();
            if (!res.ok) throw new Error(`${res.status}`);
          }).then((r) => {
            ms.push(r.ms);
            if (!r.ok) errors++;
          }),
        );
        await new Promise((r) => setTimeout(r, 8000));
      }
      await Promise.all(pending);
    }),
  );
  summary(`ブース ${booths}、8 秒ごと、${rounds} 回ずつ`, ms, errors);
  console.log("8 秒より長くかかる断片が続くと、文字起こしが遅れて溜まっていきます");
}

// 担当者向けまとめと同じくらいの長さの入力と出力
const SAMPLE = Array.from({ length: 12 }, (_, i) => `発言${i + 1}: 社内の問い合わせ対応が属人化していて、担当者が休むと回らない。生成AIで一次回答を自動化できないか検討している。`).join("\n");

async function gemmaTest([concurrency = "12", rounds = "2"]) {
  for (let round = 1; round <= Number(rounds); round++) {
    const ms = [];
    let errors = 0;
    const started = performance.now();
    await Promise.all(
      Array.from({ length: Number(concurrency) }, () =>
        timed(async () => {
          const res = await fetch(`${base}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                { role: "system", content: "展示会ブースでの会話から、来場者の課題を日本語で 5 項目に整理し、それぞれ 3 文で説明してください。" },
                { role: "user", content: SAMPLE },
              ],
              temperature: 0.3,
              max_tokens: 800,
              chat_template_kwargs: { enable_thinking: false },
            }),
          });
          await res.json();
          if (!res.ok) throw new Error(`${res.status}`);
        }).then((r) => {
          ms.push(r.ms);
          if (!r.ok) errors++;
        }),
      ),
    );
    summary(`${round} 回目、同時 ${concurrency}（全体 ${Math.round(performance.now() - started)}ms）`, ms, errors);
  }
}

const tests = { survey: surveyTest, whisper: whisperTest, gemma: gemmaTest };
if (!tests[mode] || !base) {
  console.error("使い方は scripts/loadtest.mjs の先頭を見てください");
  process.exit(1);
}
await tests[mode](rest);
