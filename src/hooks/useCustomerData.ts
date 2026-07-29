import { useMemo } from "react";
import { CustomerRecord, AnalysisFlow } from "../types";
import { MonthlyCodeStat } from "../utils/fileParser";

export interface CodeMonthBreakdown {
  code: string;
  signups: number;
  active: number;
  paused: number;
}

export interface MonthStats {
  monthKey: string;
  label: string;
  totalSignups: number;
  signupsByProvince: Record<string, number>;
  yoyDelta: number | null;
  codeBreakdown: CodeMonthBreakdown[];
}

export interface EventStats {
  code: string;
  channel: string;        // dominant channel for this code (e.g. "Events", "BusinessDevelopment")
  eventDate: string;      // ISO "YYYY-MM-DD" — first signup date within peak month
  eventMonth: string;     // "YYYY-MM"
  eventDateLabel: string; // "Jul 3" (for display inside month context)
  firstSignupDate: string; // ISO "YYYY-MM-DD" — earliest signup using this code
  lastSignupDate: string;  // ISO "YYYY-MM-DD" — latest signup using this code
  homeProvince: string;   // majority province
  totalSignups: number;
  signupsByProvince: Record<string, number>;
  payingSignups: number;        // rows that reached "Paying Customer"
  conversionRate: number;       // payingSignups / totalSignups (0..1)
  medianDaysToPay: number | null;
  statusCounts: { active: number; paused: number; closed: number };
  preExistingAccounts: number;  // accounts created >90 days before the event month
  // True for codes reconstructed from the 2026 Code Level Report upload rather than
  // the built-in per-signup DB — only month-level date, no status/median-days-to-pay/
  // pre-existing-account detail exists for these (all zeroed/null above, not real).
  isSynthetic?: boolean;
}

/** All-channel vs BD signup counts per province (organic baseline). */
export type ProvinceTotals = Record<string, { all: number; bd: number }>;

export interface CustomerDataResult {
  monthStats: MonthStats[];
  provinces: string[];
  eventStats: EventStats[];
  provinceTotals: ProvinceTotals;
  hasData: boolean;
}

function toIsoDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  if (y < 2000 || y > 2100) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toMonthKey(dateStr: string): string | null {
  const iso = toIsoDate(dateStr);
  return iso ? iso.slice(0, 7) : null;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
}

function priorYearKey(key: string): string {
  const [year, month] = key.split("-");
  return `${Number(year) - 1}-${month}`;
}

function isBdRow(r: CustomerRecord): boolean {
  if (r.discount_code?.startsWith("EV")) return true;
  // Also capture non-EV codes that came through the BusinessDevelopment channel
  const ch = r.channel?.replace(/[\s_-]/g, "").toLowerCase() ?? "";
  return ch === "businessdevelopment" && r.discount_code !== null;
}

function isPayingRow(r: CustomerRecord): boolean {
  if (r.last_step?.trim().toLowerCase() === "paying customer") return true;
  const pay = r.first_paying_date?.trim().toLowerCase();
  return !!pay && pay !== "null";
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function deriveProvinceTotals(rows: CustomerRecord[]): ProvinceTotals {
  const totals: ProvinceTotals = {};
  for (const r of rows) {
    const p = r.province || "??";
    if (!totals[p]) totals[p] = { all: 0, bd: 0 };
    totals[p].all++;
    if (isBdRow(r)) totals[p].bd++;
  }
  return totals;
}

function buildEventStatsFromGroups(byCode: Map<string, CustomerRecord[]>): EventStats[] {
  const events: EventStats[] = [];
  for (const [code, codeRows] of byCode) {
    const provinces: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};
    for (const r of codeRows) {
      const p = r.province || "??";
      provinces[p] = (provinces[p] ?? 0) + 1;
      const ch = r.channel?.trim() || "Unknown";
      channelCounts[ch] = (channelCounts[ch] ?? 0) + 1;
    }
    const homeProvince = Object.entries(provinces).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "??";
    const dominantChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

    // Group valid ISO dates by month, then pick the peak month (most signups).
    // Using first-signup as event date places codes with early stragglers in wrong month.
    const byMonth: Record<string, string[]> = {};
    const allSignupDates: string[] = [];
    for (const r of codeRows) {
      const d = toIsoDate(r.signup_date);
      if (!d) continue;
      allSignupDates.push(d);
      const mo = d.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = [];
      byMonth[mo].push(d);
    }
    const peakMonth = Object.entries(byMonth).sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? "";
    const eventMonth = peakMonth;
    const eventDate = peakMonth ? [...byMonth[peakMonth]].sort()[0] : "";
    allSignupDates.sort();
    const firstSignupDate = allSignupDates[0] ?? "";
    const lastSignupDate = allSignupDates[allSignupDates.length - 1] ?? "";

    const d = eventDate ? new Date(eventDate + "T12:00:00") : null;
    const eventDateLabel = d
      ? d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
      : "";

    const statusCounts = { active: 0, paused: 0, closed: 0 };
    const daysToPay: number[] = [];
    let payingSignups = 0;
    for (const r of codeRows) {
      const st = r.current_status.trim().toLowerCase();
      if (st === "active") statusCounts.active++;
      else if (st === "paused") statusCounts.paused++;
      else if (st === "closed") statusCounts.closed++;
      if (isPayingRow(r)) {
        payingSignups++;
        if (typeof r.days_till_paying === "number") daysToPay.push(r.days_till_paying);
      }
    }

    // Accounts created well before the event: existing customers who redeemed
    // the code, not new signups driven by the event.
    let preExistingAccounts = 0;
    if (peakMonth) {
      const cutoff = new Date(`${peakMonth}-01T12:00:00`);
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      preExistingAccounts = allSignupDates.filter(iso => iso < cutoffIso).length;
    }

    events.push({
      code, channel: dominantChannel, eventDate, eventMonth, eventDateLabel,
      firstSignupDate, lastSignupDate, homeProvince,
      totalSignups: codeRows.length, signupsByProvince: provinces,
      payingSignups,
      conversionRate: codeRows.length > 0 ? payingSignups / codeRows.length : 0,
      medianDaysToPay: median(daysToPay),
      statusCounts,
      preExistingAccounts,
    });
  }

  return events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

function deriveEventStats(rows: CustomerRecord[]): EventStats[] {
  const byCode = new Map<string, CustomerRecord[]>();
  for (const row of rows.filter(isBdRow)) {
    const code = row.discount_code!;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(row);
  }
  return buildEventStatsFromGroups(byCode);
}

/**
 * Same computation as deriveEventStats, but filters by an explicit code set
 * instead of the isBdRow channel/prefix heuristic — for callers (like Code
 * Finder) that already know a code is a real BD code from another source
 * (the event wrap-up schedule) and want its real per-signup stats regardless
 * of how — or whether — the built-in DB happened to tag its channel.
 */
export function deriveEventStatsForCodes(rows: CustomerRecord[], codes: Set<string>): EventStats[] {
  const byCode = new Map<string, CustomerRecord[]>();
  for (const row of rows) {
    const code = row.discount_code;
    if (!code || !codes.has(code.toUpperCase())) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(row);
  }
  return buildEventStatsFromGroups(byCode);
}

/**
 * Builds EventStats for codes uploaded via the 2026 Code Level Report format —
 * monthly (code, province, channel) counts rather than raw per-signup rows. This
 * is a degraded reconstruction: it has real eventMonth/province/signup/paying
 * numbers (enough for the Calendar heatmap and Fiscal volume tables), but no
 * exact day, no status breakdown, no median-days-to-pay, and no pre-existing-account
 * detection — those require per-signup detail this report format doesn't carry.
 * `excludeCodes` should be every code already covered by the real built-in/uploaded
 * per-signup DB, so this never overrides genuine detailed data with an approximation.
 */
function isBdMonthlyCode(code: string, channel: string | undefined): boolean {
  if (code.startsWith("EV") || code.startsWith("BD")) return true;
  const ch = channel?.replace(/[\s_-]/g, "").toLowerCase() ?? "";
  return ch === "businessdevelopment";
}

export function deriveSyntheticEventStats(
  signupMonthly: MonthlyCodeStat[],
  payingMonthly: MonthlyCodeStat[],
  excludeCodes: Set<string>,
): EventStats[] {
  // The new Code Level Report uploads are frequently NOT pre-filtered to BD/Events —
  // they can carry every marketing channel (Referral, SEO, PaidSocial, ...). Without
  // this filter, every code in the file becomes a "synthetic event" — tens of
  // thousands of unrelated retail/referral codes flooding Calendar/Fiscal and making
  // the real handful of new BD codes impossible to find (and likely making the whole
  // view painfully slow to render).
  const byCode = new Map<string, MonthlyCodeStat[]>();
  for (const m of signupMonthly) {
    const code = m.code.trim().toUpperCase();
    if (!code || excludeCodes.has(code)) continue;
    if (!isBdMonthlyCode(code, m.channel)) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(m);
  }

  const payingByCode = new Map<string, number>();
  for (const m of payingMonthly) {
    const code = m.code.trim().toUpperCase();
    payingByCode.set(code, (payingByCode.get(code) ?? 0) + m.count);
  }

  const events: EventStats[] = [];
  for (const [code, stats] of byCode) {
    const byMonth: Record<string, number> = {};
    const provinces: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};
    let totalSignups = 0;

    for (const s of stats) {
      byMonth[s.month] = (byMonth[s.month] ?? 0) + s.count;
      totalSignups += s.count;
      if (s.province) provinces[s.province] = (provinces[s.province] ?? 0) + s.count;
      if (s.channel) channelCounts[s.channel] = (channelCounts[s.channel] ?? 0) + s.count;
    }

    // Peak month = the event's likely actual month, same heuristic as deriveEventStats.
    const peakMonth = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const months = Object.keys(byMonth).sort();
    const firstMonth = months[0] ?? "";
    const lastMonth = months[months.length - 1] ?? "";
    const homeProvince = Object.entries(provinces).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "??";
    const dominantChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
    const payingSignups = payingByCode.get(code) ?? 0;

    events.push({
      code,
      channel: dominantChannel,
      eventDate: peakMonth ? `${peakMonth}-01` : "",
      eventMonth: peakMonth,
      eventDateLabel: peakMonth ? monthLabel(peakMonth) : "",
      firstSignupDate: firstMonth ? `${firstMonth}-01` : "",
      lastSignupDate: lastMonth ? `${lastMonth}-01` : "",
      homeProvince,
      totalSignups,
      signupsByProvince: provinces,
      payingSignups,
      conversionRate: totalSignups > 0 ? payingSignups / totalSignups : 0,
      medianDaysToPay: null,
      statusCounts: { active: 0, paused: 0, closed: 0 },
      preExistingAccounts: 0,
      isSynthetic: true,
    });
  }

  return events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

export function useCustomerData(
  customerRows: CustomerRecord[],
  rawPastedCodes: string[],
  _selectedFlow?: AnalysisFlow,
): CustomerDataResult {
  return useMemo((): CustomerDataResult => {
    const evStats = deriveEventStats(customerRows);
    const provinceTotals = deriveProvinceTotals(customerRows);
    const hasEvData = evStats.length > 0;

    if (customerRows.length === 0) {
      return { monthStats: [], provinces: [], eventStats: evStats, provinceTotals, hasData: hasEvData };
    }

    if (rawPastedCodes.length === 0) {
      return { monthStats: [], provinces: [], eventStats: evStats, provinceTotals, hasData: hasEvData };
    }

    const codeSet = new Set(rawPastedCodes.map(c => c.toUpperCase()));
    const relevant = customerRows.filter(r => r.discount_code !== null && codeSet.has(r.discount_code));

    if (relevant.length === 0) {
      return { monthStats: [], provinces: [], eventStats: evStats, provinceTotals, hasData: hasEvData };
    }

    const monthMap: Record<string, Record<string, { signups: number; active: number; paused: number; province: Record<string, number> }>> = {};

    for (const row of relevant) {
      const key = toMonthKey(row.signup_date);
      if (!key) continue;
      const code = row.discount_code!;
      if (!monthMap[key]) monthMap[key] = {};
      if (!monthMap[key][code]) monthMap[key][code] = { signups: 0, active: 0, paused: 0, province: {} };

      const entry = monthMap[key][code];
      entry.signups++;
      if (row.current_status.toLowerCase() === "active") entry.active++;
      else if (row.current_status.toLowerCase() === "paused") entry.paused++;

      const prov = row.province || "??";
      entry.province[prov] = (entry.province[prov] ?? 0) + 1;
    }

    const allProvinces = Array.from(
      new Set(relevant.map(r => r.province || "??").filter(p => p !== "??"))
    ).sort();

    const allKeys = Object.keys(monthMap).sort().reverse();

    const stats: MonthStats[] = allKeys.map(key => {
      const codesInMonth = monthMap[key];
      const codeBreakdown: CodeMonthBreakdown[] = Object.entries(codesInMonth).map(([code, data]) => ({
        code,
        signups: data.signups,
        active: data.active,
        paused: data.paused,
      })).sort((a, b) => b.signups - a.signups);

      const signupsByProvince: Record<string, number> = {};
      for (const data of Object.values(codesInMonth)) {
        for (const [prov, count] of Object.entries(data.province)) {
          signupsByProvince[prov] = (signupsByProvince[prov] ?? 0) + count;
        }
      }

      const totalSignups = codeBreakdown.reduce((s, c) => s + c.signups, 0);
      const priorKey = priorYearKey(key);
      let yoyDelta: number | null = null;
      if (monthMap[priorKey]) {
        const priorTotal = Object.values(monthMap[priorKey]).reduce((s, c) => s + c.signups, 0);
        yoyDelta = totalSignups - priorTotal;
      }

      return { monthKey: key, label: monthLabel(key), totalSignups, signupsByProvince, yoyDelta, codeBreakdown };
    });

    return { monthStats: stats.slice(0, 24), provinces: allProvinces, eventStats: evStats, provinceTotals, hasData: true };
  }, [customerRows, rawPastedCodes]);
}
