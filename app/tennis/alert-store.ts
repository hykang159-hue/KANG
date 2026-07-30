import { openingKey, type AlertOpening } from "./alert-windows";

/**
 * Best-effort dedupe across warm serverless instances.
 * Cold starts may re-notify currently open slots once.
 */
const notifiedKeys = new Map<string, number>();
const RETAIN_MS = 1000 * 60 * 60 * 36; // 36h

function prune(now: number) {
  for (const [key, at] of notifiedKeys) {
    if (now - at > RETAIN_MS) {
      notifiedKeys.delete(key);
    }
  }
}

export function filterNewOpenings(openings: AlertOpening[]): AlertOpening[] {
  const now = Date.now();
  prune(now);
  const fresh: AlertOpening[] = [];
  for (const opening of openings) {
    const key = openingKey(opening);
    if (notifiedKeys.has(key)) {
      continue;
    }
    fresh.push(opening);
  }
  return fresh;
}

export function markOpeningsNotified(openings: AlertOpening[]) {
  const now = Date.now();
  for (const opening of openings) {
    notifiedKeys.set(openingKey(opening), now);
  }
}
