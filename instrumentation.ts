// サーバの起動時に 1 回だけ呼ばれる。計測（lib/metrics.ts）を 10 秒ごとに DB へ書き出す
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { flushMetrics } = await import("./lib/metrics-store");
  setInterval(() => {
    try {
      flushMetrics();
    } catch (e) {
      console.error("[metrics]", e);
    }
  }, 10_000).unref();
}
