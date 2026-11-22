/**
 * The server's clock, learned from the Date header of API responses. Business dates
 * ("today" in Baku) use it, so a phone with a wrong date or time still opens the right day.
 */
let offsetMs = 0;

export function learnServerTime(dateHeader: string | null | undefined, sentAt: number, receivedAt: number) {
  if (!dateHeader) return;
  const server = Date.parse(dateHeader);
  if (!Number.isFinite(server)) return;
  // The header has 1 s precision; ignore the noise of small differences.
  const local = (sentAt + receivedAt) / 2;
  const next = server - local;
  offsetMs = Math.abs(next) < 90_000 ? 0 : next;
}

/** Milliseconds since 1970 according to the server (falls back to the phone clock). */
export const serverNow = () => Date.now() + offsetMs;
