import { useEffect, useState } from "react";

/**
 * Loads the bundled per-code Looker totals (built by scripts/build-looker-totals.mjs
 * from the two "Code Level Report" exports).
 *
 * Both numbers come from the same system on purpose:
 *  • paying  — FreshPrep's actual Customer definition: total revenue > $49, i.e. the
 *    person ordered beyond their promotional week. The built-in signup DB's
 *    `last_step = "Paying Customer"` is a different, higher-reading measure (it only
 *    means they took that first promo delivery) — 23 vs 8 on EVCALGARYMARATHON26.
 *  • signups — taken from the matching export so conversion stays a single-source
 *    ratio (DATA_INTEGRITY_TRUTHS.md §1), and so codes missing from the built-in DB
 *    still get a denominator. Verified to agree exactly with the DB where both exist.
 */
export interface LookerCodeTotals {
  generatedAt: string;
  signupSource: string | null;
  payingSource: string | null;
  codeCount: number;
  totalSignups: number;
  totalPaying: number;
  byCode: Record<string, { signups: number | null; paying: number | null }>;
}

let _cache: LookerCodeTotals | null = null;
let _promise: Promise<LookerCodeTotals | null> | null = null;

export function useLookerCodeTotals(): { data: LookerCodeTotals | null; loading: boolean } {
  const [data, setData] = useState<LookerCodeTotals | null>(_cache);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    if (_cache !== null) return;
    if (!_promise) {
      _promise = fetch(`${import.meta.env.BASE_URL}data/looker-code-totals.json`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<LookerCodeTotals>;
        })
        .catch(() => null); // optional enrichment — the app still works without it
    }
    let cancelled = false;
    _promise.then(d => {
      if (d) _cache = d;
      if (!cancelled) { setData(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
