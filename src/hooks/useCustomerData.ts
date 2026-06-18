import { useMemo } from "react";
import { CustomerRecord } from "../types";

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

export interface CustomerDataResult {
  monthStats: MonthStats[];
  provinces: string[];
  hasData: boolean;
}

function toMonthKey(dateStr: string): string | null {
  if (!dateStr) return null;
  const normalized = dateStr.replace(/\//g, "-");
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

export function useCustomerData(
  customerRows: CustomerRecord[],
  rawPastedCodes: string[]
): CustomerDataResult {
  return useMemo((): CustomerDataResult => {
    if (customerRows.length === 0 || rawPastedCodes.length === 0) {
      return { monthStats: [], provinces: [], hasData: false };
    }

    const codeSet = new Set(rawPastedCodes.map(c => c.toUpperCase()));
    const relevant = customerRows.filter(r => r.discount_code !== null && codeSet.has(r.discount_code));

    if (relevant.length === 0) {
      return { monthStats: [], provinces: [], hasData: false };
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

    return { monthStats: stats.slice(0, 24), provinces: allProvinces, hasData: true };
  }, [customerRows, rawPastedCodes]);
}
