/**
 * Calls the tennis alert tick API on an interval.
 *
 * Env:
 * - NEXT_BASE_URL (default https://kang-nu.vercel.app)
 * - TENNIS_ALERT_SECRET
 * - TENNIS_ALERT_INTERVAL_MS (default 300000 = 5m)
 *
 *   npm run tennis:alerts
 */
const baseUrl = (
  process.env.NEXT_BASE_URL ?? "https://kang-nu.vercel.app"
).replace(/\/$/, "");
const secret = process.env.TENNIS_ALERT_SECRET ?? "";
const intervalMs = Number(process.env.TENNIS_ALERT_INTERVAL_MS ?? "300000");
const safeInterval =
  Number.isFinite(intervalMs) && intervalMs >= 60000 ? intervalMs : 300000;

if (!secret) {
  console.error("[tennis-alerts] TENNIS_ALERT_SECRET is required");
  process.exit(1);
}

async function tickOnce() {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/tennis/alerts/tick`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${secret}`,
      },
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
        `[tennis-alerts] failed status=${response.status} ${elapsed}ms`,
        body,
      );
      return;
    }
    console.log(
      `[tennis-alerts] ok openings=${body?.openings} new=${body?.newOpenings} notified=${body?.notified} ${elapsed}ms`,
    );
  } catch (error) {
    console.error("[tennis-alerts] request error", error);
  }
}

console.log(
  `[tennis-alerts] starting baseUrl=${baseUrl} intervalMs=${safeInterval}`,
);
void tickOnce();
setInterval(() => {
  void tickOnce();
}, safeInterval);
