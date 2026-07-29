/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Carries the authoritative paying-customer counts from a Looker "Code Level
 * Report" (paying side) across to /codefinder.
 *
 * Why this exists: /codefinder is its own route with its own React tree, so it
 * cannot see the main app's uploaded-file state. Without this bridge it falls back
 * to the built-in signup DB's paying signal — and those two sources do NOT measure
 * the same thing:
 *
 *   • built-in DB `last_step = "Paying Customer"` → the person took their first
 *     (promotional) delivery.
 *   • Looker "Paying Customers" → total revenue > $49, i.e. they ordered BEYOND the
 *     promo week. This is FreshPrep's own definition of a Customer.
 *
 * Verified on EVCALGARYMARATHON26: the DB shows 23, Looker shows 8. Both are
 * "correct" for what they measure; only the Looker figure is the one BD reports on.
 * So when it's available it always wins.
 *
 * Only BD/EV-relevant codes are persisted — the full export is ~35k codes of mostly
 * retail/referral noise, which would risk blowing the localStorage quota for no gain.
 */

const STORAGE_KEY = "freshprep.codefinder.payingData.v1";

export interface PayingDataSnapshot {
  /** discount code (upper) → confirmed paying customers, summed across all months. */
  byCode: Record<string, number>;
  fileName: string;
  savedAt: string; // ISO
  codeCount: number;
}

function isRelevantCode(code: string, channel?: string): boolean {
  if (code.startsWith("EV") || code.startsWith("BD")) return true;
  const ch = channel?.replace(/[\s_-]/g, "").toLowerCase() ?? "";
  return ch === "businessdevelopment" || ch === "events";
}

/**
 * Builds a snapshot from parsed paying-side rows. Accepts the per-code rows that
 * `parseSpreadsheetFile` returns for a paying-side Code Level Report (where
 * `Paying cx` carries the count).
 */
export function buildPayingSnapshot(
  rows: { discount_code: string; channel?: string; "Paying cx": number }[],
  fileName: string,
): PayingDataSnapshot {
  const byCode: Record<string, number> = {};
  for (const r of rows) {
    const code = r.discount_code?.trim().toUpperCase();
    if (!code || code === "NULL") continue;
    if (!isRelevantCode(code, r.channel)) continue;
    const n = r["Paying cx"] ?? 0;
    if (n <= 0) continue;
    byCode[code] = (byCode[code] ?? 0) + n;
  }
  return {
    byCode,
    fileName,
    savedAt: new Date().toISOString(),
    codeCount: Object.keys(byCode).length,
  };
}

export function savePayingSnapshot(snapshot: PayingDataSnapshot): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    // Quota exceeded or storage disabled — the app still works, /codefinder just
    // falls back to its other sources and says so in the UI.
    return false;
  }
}

export function loadPayingSnapshot(): PayingDataSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PayingDataSnapshot;
    if (!parsed || typeof parsed.byCode !== "object" || parsed.byCode === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPayingSnapshot(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage disabled */ }
}
