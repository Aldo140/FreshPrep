/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lifetime-value data for Code Finder.
 *
 * There is no bundled LTV source. The 2026 Looker "Code Level Report" exports carry
 * only counts, and the BD wrap-up workbook's LTV columns are hand-kept, sparse, and
 * not trusted — so they're deliberately not used. That leaves exactly one real
 * source: an old-format "Client LTV" export (or any per-code sheet carrying LTV
 * columns), which fileParser already knows how to read.
 *
 * The user loads one here; it's cached in localStorage so it persists across visits
 * and is shared with the main app's report views.
 */

const STORAGE_KEY = "freshprep.codefinder.ltvData.v1";

export interface CodeLtv {
  avgLtv3: number | null;
  avgLtv6: number | null;
  avgLtv12: number | null;
  sumLtv12: number | null;
}

export interface LtvSnapshot {
  byCode: Record<string, CodeLtv>;
  fileName: string;
  savedAt: string;
  codeCount: number;
}

function isRelevantCode(code: string, channel?: string): boolean {
  if (code.startsWith("EV") || code.startsWith("BD")) return true;
  const ch = channel?.replace(/[\s_-]/g, "").toLowerCase() ?? "";
  return ch === "businessdevelopment" || ch === "events";
}

/** Builds a snapshot from parsed per-code rows (the "full" / Client LTV shape). */
export function buildLtvSnapshot(
  rows: {
    discount_code: string;
    channel?: string;
    "Avg LTV 3": number;
    "Avg LTV 6": number;
    "Avg LTV 12": number;
    "Sum LTV 12": number;
  }[],
  fileName: string,
): LtvSnapshot {
  const byCode: Record<string, CodeLtv> = {};
  for (const r of rows) {
    const code = r.discount_code?.trim().toUpperCase();
    if (!code || code === "NULL") continue;
    if (!isRelevantCode(code, r.channel)) continue;

    const a3 = r["Avg LTV 3"] || 0;
    const a6 = r["Avg LTV 6"] || 0;
    const a12 = r["Avg LTV 12"] || 0;
    const s12 = r["Sum LTV 12"] || 0;
    if (a3 <= 0 && a6 <= 0 && a12 <= 0 && s12 <= 0) continue; // nothing usable

    byCode[code] = {
      avgLtv3: a3 > 0 ? a3 : null,
      avgLtv6: a6 > 0 ? a6 : null,
      avgLtv12: a12 > 0 ? a12 : null,
      sumLtv12: s12 > 0 ? s12 : null,
    };
  }
  return { byCode, fileName, savedAt: new Date().toISOString(), codeCount: Object.keys(byCode).length };
}

export function saveLtvSnapshot(s: LtvSnapshot): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); return true; }
  catch { return false; } // quota or storage disabled — LTV just stays unavailable
}

export function loadLtvSnapshot(): LtvSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LtvSnapshot;
    if (!parsed || typeof parsed.byCode !== "object" || parsed.byCode === null) return null;
    return parsed;
  } catch { return null; }
}

export function clearLtvSnapshot(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage disabled */ }
}
