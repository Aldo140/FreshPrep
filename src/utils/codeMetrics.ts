/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds year-over-year metrics for a set of confirmed discount codes (Code
 * Finder's "view selected" step), preferring the real built-in per-signup DB
 * and falling back to the BD wrap-up spreadsheet's own tracked numbers for
 * codes the DB doesn't have. LTV is only ever available from the wrap-up
 * sheet (sparse); a true "discount offered on first order" figure isn't
 * present in any source this app has access to — always shown as unavailable
 * rather than guessed.
 */
import { EventSchedule } from "../hooks/useEventSchedule";
import { EventStats } from "../hooks/useCustomerData";

export interface CodeMetrics {
  code: string;
  name: string;
  province: string;
  year: number | null;
  eventMonth: string | null; // "YYYY-MM", only when sourced from the real per-signup DB
  signups: number | null;
  paying: number | null;
  conversionPct: number | null; // 0..1
  avgLtv3: number | null;
  avgLtv6: number | null;
  avgLtv12: number | null;
  source: "db" | "none"; // where Signups came from
  // True when `paying`/conversionPct came from the built-in DB's last_step /
  // first_paying_date heuristic rather than a confirmed Paying Customers count.
  // That heuristic tracks funnel-step completion, not confirmed revenue >$49, and can
  // run 2-3x too high — verified against EVCALGARYMARATHON26: DB says 23 paying, the
  // real Looker Paying Customers export says 8. Per this app's DATA_INTEGRITY_TRUTHS.md,
  // DB-derived paying figures are never authoritative — always flag them when used.
  payingApproximate: boolean;
  /** Where the paying/conversion figure actually came from — surfaced in the UI. */
  payingSource: "looker" | "sheet" | "db" | "none";
}

function extractYear(scheduleDate: string | null | undefined): number | null {
  if (!scheduleDate) return null;
  const m = scheduleDate.match(/(20\d{2})/);
  if (m) return Number(m[1]);
  // Some wrap-up sheet date cells came through as a raw Excel serial number (as text)
  const serial = Number(scheduleDate);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const utcDays = Math.floor(serial) - 25569;
    const d = new Date(utcDays * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.getUTCFullYear();
  }
  return null;
}

export function buildCodeMetrics(
  selectedCodes: string[],
  schedule: EventSchedule,
  dbStats: EventStats[],
  /**
   * Per-code Looker totals — signups and confirmed Paying Customers, both from the
   * Code Level Report exports (bundled at public/data/looker-code-totals.json, or a
   * fresher user upload). Authoritative for paying, and the matching denominator so
   * conversion stays a single-source ratio.
   */
  lookerTotals: Record<string, { signups?: number | null; paying?: number | null }> = {},
  /** Per-code LTV from a user-supplied Client LTV export (ltvDataBridge). */
  ltvByCode: Record<string, { avgLtv3: number | null; avgLtv6: number | null; avgLtv12: number | null }> = {},
): CodeMetrics[] {
  const dbByCode = new Map(dbStats.map(e => [e.code.toUpperCase(), e]));

  return selectedCodes.map((rawCode): CodeMetrics => {
    const code = rawCode.toUpperCase();
    const sched = schedule[code];
    const db = dbByCode.get(code);
    const name = sched?.name ?? code;
    const province = db?.homeProvince ?? sched?.province ?? "??";

    const looker = lookerTotals[code];

    // Signups: built-in per-signup DB first (exact, and it's what dates the event),
    // then the Looker signup-side total, which covers codes the DB never captured and
    // agrees with it where both exist. The wrap-up workbook's Sign ups column is
    // hand-maintained and is never used.
    const signups = db ? db.totalSignups : (looker?.signups ?? null);
    const year = db ? (Number(db.eventMonth.slice(0, 4)) || extractYear(sched?.date)) : extractYear(sched?.date);
    const eventMonth = db?.eventMonth || null;

    // Paying / Conversion source priority:
    //   1. Looker paying-side export — confirmed Customers (revenue > $49), the
    //      figure BD reports on. Always wins when present.
    //   2. Built-in DB's funnel-step signal — counts reaching the "Paying Customer"
    //      step (first promo delivery), NOT confirmed revenue. Reads high; flagged ≈.
    // The wrap-up workbook's Paying Customers column is intentionally not consulted.
    let paying: number | null = null;
    let conversionPct: number | null = null;
    let payingApproximate = false;
    let payingSource: CodeMetrics["payingSource"] = "none";

    const lookerCount = looker?.paying;
    if (lookerCount != null) {
      paying = lookerCount;
      conversionPct = signups && signups > 0 ? paying / signups : null;
      payingSource = "looker";
    } else if (db) {
      paying = db.payingSignups;
      conversionPct = db.conversionRate;
      payingApproximate = true;
      payingSource = "db";
    }

    const ltv = ltvByCode[code];

    return {
      code, name, province, year, eventMonth,
      signups, paying, conversionPct,
      avgLtv3: ltv?.avgLtv3 ?? null,
      avgLtv6: ltv?.avgLtv6 ?? null,
      avgLtv12: ltv?.avgLtv12 ?? null,
      source: db ? "db" : "none",
      payingApproximate,
      payingSource,
    };
  });
}

/** Groups metrics by event name (recurring events share a name across years' codes). */
export function groupByEventName(metrics: CodeMetrics[]): { name: string; entries: CodeMetrics[] }[] {
  const byName = new Map<string, CodeMetrics[]>();
  for (const m of metrics) {
    if (!byName.has(m.name)) byName.set(m.name, []);
    byName.get(m.name)!.push(m);
  }
  return Array.from(byName.entries())
    .map(([name, entries]) => ({
      name,
      entries: entries.sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * A user-assembled event: one real-world recurring event and every discount code
 * that belongs to it. Built from fuzzy matches, then refined by hand — the user can
 * drop codes the match got wrong and add ones it missed.
 */
export interface EventGroup {
  id: string;
  name: string;
  codes: string[];
}

/** One year of an event, summing every code that ran under it that year. */
export interface GroupYearRow {
  year: number | null;
  codes: string[];
  signups: number | null;
  paying: number | null;
  conversionPct: number | null;
  approximate: boolean;
}

/**
 * Rolls a group's per-code metrics up to one row per year. An event can run several
 * codes in the same year (e.g. a per-province code split), so those are summed
 * rather than shown as separate columns — the BD question is "how did the event do
 * that year," not "how did each code do."
 */
export function rollupGroupByYear(entries: CodeMetrics[]): GroupYearRow[] {
  const byYear = new Map<number | null, CodeMetrics[]>();
  for (const e of entries) {
    const key = e.year ?? null;
    if (!byYear.has(key)) byYear.set(key, []);
    byYear.get(key)!.push(e);
  }

  const rows: GroupYearRow[] = Array.from(byYear.entries()).map(([year, list]) => {
    const withSignups = list.filter(e => e.signups != null);
    const signups = withSignups.length > 0 ? withSignups.reduce((s, e) => s + (e.signups ?? 0), 0) : null;
    const withPaying = list.filter(e => e.paying != null);
    const paying = withPaying.length > 0 ? withPaying.reduce((s, e) => s + (e.paying ?? 0), 0) : null;
    return {
      year,
      codes: list.map(e => e.code),
      signups,
      paying,
      conversionPct: signups != null && signups > 0 && paying != null ? paying / signups : null,
      approximate: list.some(e => e.payingApproximate),
    };
  });

  // Dated years ascending; undated bucket last so the timeline reads left→right.
  return rows.sort((a, b) => {
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return a.year - b.year;
  });
}

/** Headline numbers for one event across all its years. */
export function summarizeGroup(rows: GroupYearRow[]): {
  totalSignups: number;
  totalPaying: number;
  blendedConversion: number | null;
  latest: GroupYearRow | null;
  previous: GroupYearRow | null;
  approximate: boolean;
} {
  const totalSignups = rows.reduce((s, r) => s + (r.signups ?? 0), 0);
  const totalPaying = rows.reduce((s, r) => s + (r.paying ?? 0), 0);
  const dated = rows.filter(r => r.year != null && (r.signups ?? 0) > 0);
  return {
    totalSignups,
    totalPaying,
    blendedConversion: totalSignups > 0 ? totalPaying / totalSignups : null,
    latest: dated.length > 0 ? dated[dated.length - 1] : null,
    previous: dated.length > 1 ? dated[dated.length - 2] : null,
    approximate: rows.some(r => r.approximate),
  };
}
