/**
 * 매분 자동매매 tick API를 호출하는 로컬 스케줄러.
 *
 * Env:
 * - NEXT_BASE_URL (default http://localhost:3000)
 * - TRADING_TICK_SECRET (설정 시 Authorization: Bearer 로 전달)
 * - TRADING_TICK_INTERVAL_MS (default 60000)
 *
 * 서버(next dev/start)가 떠 있는 상태에서:
 *   npm run trading:scheduler
 */
const baseUrl = (process.env.NEXT_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const secret = process.env.TRADING_TICK_SECRET ?? "";
const intervalMs = Number(process.env.TRADING_TICK_INTERVAL_MS ?? "60000");
const safeInterval =
  Number.isFinite(intervalMs) && intervalMs >= 5000 ? intervalMs : 60000;

async function tickOnce() {
  const headers = { Accept: "application/json" };
  if (secret) {
    headers["Authorization"] = `Bearer ${secret}`;
  }

  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/stocks/trading/tick`, {
      method: "POST",
      headers,
    });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    const elapsed = Date.now() - started;
    if (!response.ok) {
      console.error(
        `[scheduler] tick failed status=${response.status} ${elapsed}ms`,
        body
      );
      return;
    }

    const triggered =
      body && Array.isArray(body.results)
        ? body.results.filter((row) => row.triggered).length
        : 0;
    console.log(
      `[scheduler] ok dryRun=${body?.dryRun} rules=${body?.ruleCount} triggered=${triggered} ${elapsed}ms`
    );
  } catch (error) {
    console.error("[scheduler] tick request error", error);
  }
}

console.log(
  `[scheduler] starting baseUrl=${baseUrl} intervalMs=${safeInterval}`
);
void tickOnce();
setInterval(() => {
  void tickOnce();
}, safeInterval);
