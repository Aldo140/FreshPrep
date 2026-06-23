import { useMemo } from "react";
import { CustomerRecord, AnalysisFlow } from "../types";

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
  eventDate: string;      // ISO "YYYY-MM-DD" — first signup date
  eventMonth: string;     // "YYYY-MM"
  eventDateLabel: string; // "Jul 3" (for display inside month context)
  homeProvince: string;   // majority province
  totalSignups: number;
  signupsByProvince: Record<string, number>;
}

export interface CustomerDataResult {
  monthStats: MonthStats[];
  provinces: string[];
  eventStats: EventStats[];
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

function deriveEventStats(rows: CustomerRecord[]): EventStats[] {
  const evRows = rows.filter(isBdRow);

  const byCode = new Map<string, CustomerRecord[]>();
  for (const row of evRows) {
    const code = row.discount_code!;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(row);
  }

  const events: EventStats[] = [];
  for (const [code, codeRows] of byCode) {
    const provinces: Record<string, number> = {};
    for (const r of codeRows) {
      const p = r.province || "??";
      provinces[p] = (provinces[p] ?? 0) + 1;
    }
    const homeProvince = Object.entries(provinces).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "??";

    // Group valid ISO dates by month, then pick the peak month (most signups).
    // Using first-signup as event date places codes with early stragglers in wrong month.
    const byMonth: Record<string, string[]> = {};
    for (const r of codeRows) {
      const d = toIsoDate(r.signup_date);
      if (!d) continue;
      const mo = d.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = [];
      byMonth[mo].push(d);
    }
    const peakMonth = Object.entries(byMonth).sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? "";
    const eventMonth = peakMonth;
    const eventDate = peakMonth ? [...byMonth[peakMonth]].sort()[0] : "";

    const d = eventDate ? new Date(eventDate + "T12:00:00") : null;
    const eventDateLabel = d
      ? d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
      : "";

    events.push({ code, eventDate, eventMonth, eventDateLabel, homeProvince, totalSignups: codeRows.length, signupsByProvince: provinces });
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
    const hasEvData = evStats.length > 0;

    if (customerRows.length === 0) {
      return { monthStats: [], provinces: [], eventStats: evStats, hasData: hasEvData };
    }

    if (rawPastedCodes.length === 0) {
      return { monthStats: [], provinces: [], eventStats: evStats, hasData: hasEvData };
    }

    const codeSet = new Set(rawPastedCodes.map(c => c.toUpperCase()));
    const relevant = customerRows.filter(r => r.discount_code !== null && codeSet.has(r.discount_code));

    if (relevant.length === 0) {
      return { monthStats: [], provinces: [], eventStats: evStats, hasData: hasEvData };
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

    return { monthStats: stats.slice(0, 24), provinces: allProvinces, eventStats: evStats, hasData: true };
  }, [customerRows, rawPastedCodes]);
}
