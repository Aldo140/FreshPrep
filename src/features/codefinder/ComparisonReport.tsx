/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo } from "react";
import { ArrowLeft, Printer, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { EventSchedule } from "../../hooks/useEventSchedule";
import { EventStats } from "../../hooks/useCustomerData";
import {
  EventGroup, buildCodeMetrics, rollupGroupByYear, summarizeGroup,
  CodeMetrics, GroupYearRow,
} from "../../utils/codeMetrics";
import {
  yearComparisonChart, conversionComparisonChart, yearChartLegend, CHART_COLORS,
} from "../../utils/codeFinderCharts";

const FP_LOGO = "https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

function pct(v: number | null, approx = false): string {
  return v == null ? "—" : `${approx ? "≈" : ""}${(v * 100).toFixed(1)}%`;
}
function num(v: number | null): string { return v == null ? "—" : v.toLocaleString(); }

export interface GroupReport {
  group: EventGroup;
  entries: CodeMetrics[];
  years: GroupYearRow[];
  summary: ReturnType<typeof summarizeGroup>;
}

export function buildGroupReports(
  groups: EventGroup[],
  schedule: EventSchedule,
  dbStats: EventStats[],
  /** code → "YYYY-MM" the user typed in for codes with no usable date on file. */
  manualDates: Record<string, string> = {},
  /** Per-code Looker signups + confirmed paying — outranks all other sources. */
  lookerTotals: Record<string, { signups?: number | null; paying?: number | null }> = {},
  /** Per-code LTV from a user-supplied Client LTV export. */
  ltvByCode: Record<string, { avgLtv3: number | null; avgLtv6: number | null; avgLtv12: number | null }> = {},
): GroupReport[] {
  return groups.map(group => {
    const entries = buildCodeMetrics(group.codes, schedule, dbStats, lookerTotals, ltvByCode).map((e): CodeMetrics => {
      const override = manualDates[e.code];
      if (!override) return e;
      return { ...e, year: Number(override.slice(0, 4)), eventMonth: override };
    });
    const years = rollupGroupByYear(entries);
    return { group, entries, years, summary: summarizeGroup(years) };
  });
}

function Svg({ markup }: { markup: string }) {
  // Chart markup is generated in codeFinderCharts.ts from numbers plus escaped
  // strings — no user HTML reaches it.
  return <div className="cf-svg-wrap" dangerouslySetInnerHTML={{ __html: markup }} />;
}

function TrendPill({ latest, previous }: { latest: GroupYearRow | null; previous: GroupYearRow | null }) {
  if (!latest || !previous || !previous.signups || !latest.signups) return null;
  const delta = ((latest.signups - previous.signups) / previous.signups) * 100;
  const up = delta >= 0;
  const flat = Math.abs(delta) < 1;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const color = flat ? "#8a8a84" : up ? "#2b5346" : "#9b4a1c";
  const bg = flat ? "#f5f5f3" : up ? "#eef4f1" : "#fdf1ea";
  return (
    <span
      className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ color, backgroundColor: bg }}
      title={`Signups ${up ? "up" : "down"} vs ${previous.year}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {up && !flat ? "+" : ""}{delta.toFixed(0)}% vs {previous.year}
    </span>
  );
}

interface ComparisonReportProps {
  reports: GroupReport[];
  onBack: () => void;
  onPrint: () => void;
  onViewDetail: (code: string) => void;
  loading: boolean;
}

export function ComparisonReport({ reports, onBack, onPrint, onViewDetail, loading }: ComparisonReportProps): React.ReactElement {
  const totals = useMemo(() => {
    const signups = reports.reduce((s, r) => s + r.summary.totalSignups, 0);
    const paying = reports.reduce((s, r) => s + r.summary.totalPaying, 0);
    const codes = reports.reduce((s, r) => s + r.group.codes.length, 0);
    const approximate = reports.some(r => r.summary.approximate);
    return {
      signups, paying, codes, approximate,
      conversion: signups > 0 ? paying / signups : null,
    };
  }, [reports]);

  const conversionChart = useMemo(() => conversionComparisonChart(
    reports.map(r => ({
      name: r.group.name,
      conversionPct: r.summary.blendedConversion,
      signups: r.summary.totalSignups,
      approximate: r.summary.approximate,
    })),
  ), [reports]);

  const best = useMemo(() => {
    const ranked = reports
      .filter(r => r.summary.blendedConversion != null)
      .sort((a, b) => (b.summary.blendedConversion ?? 0) - (a.summary.blendedConversion ?? 0));
    return ranked[0] ?? null;
  }, [reports]);

  return (
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#666] font-medium hover:text-[#1a1a1a] cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to events
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2b5346] hover:bg-[#1a3d2f] text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF
        </button>
      </div>

      {loading && <p className="text-xs text-[#a1a1a1] font-mono">Loading built-in signup DB…</p>}

      {/* Branded hero */}
      <div
        className="rounded-2xl px-5 md:px-7 py-5 md:py-6 shadow-md"
        style={{ background: "linear-gradient(135deg,#1a3d2f 0%,#2b5346 55%,#3a6b58 100%)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <img
            src={FP_LOGO}
            alt="FreshPrep"
            className="h-5 w-auto"
            style={{ filter: "brightness(0) invert(1)", opacity: 0.92 }}
          />
          <div className="h-3.5 w-px bg-white/20" />
          <span className="text-[8.5px] font-mono uppercase tracking-[0.22em] text-white/50">
            Business Development · Event Comparison
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-[26px] md:text-[32px] font-black text-white leading-none tracking-tight">
              {reports.length} event{reports.length === 1 ? "" : "s"} compared
            </h2>
            <p className="text-[10.5px] font-mono text-white/50 mt-1.5">
              {totals.codes} discount code{totals.codes === 1 ? "" : "s"} across all years
            </p>
          </div>
          <div className="flex items-start gap-6 md:gap-9">
            <div>
              <p className="text-[26px] md:text-[32px] font-black font-mono text-white leading-none tabular-nums">
                {totals.signups.toLocaleString()}
              </p>
              <p className="text-[8px] font-mono text-white/40 mt-1 uppercase tracking-[0.2em]">signups</p>
            </div>
            <div>
              <p className="text-[26px] md:text-[32px] font-black font-mono leading-none tabular-nums" style={{ color: "#8fc7ae" }}>
                {totals.approximate ? "≈" : ""}{totals.paying.toLocaleString()}
              </p>
              <p className="text-[8px] font-mono text-white/40 mt-1 uppercase tracking-[0.2em]">paying</p>
            </div>
            <div>
              <p className="text-[26px] md:text-[32px] font-black font-mono leading-none tabular-nums" style={{ color: "#e7bd27" }}>
                {pct(totals.conversion, totals.approximate)}
              </p>
              <p className="text-[8px] font-mono text-white/40 mt-1 uppercase tracking-[0.2em]">conversion</p>
            </div>
          </div>
        </div>
        {best && (
          <p className="text-[10px] font-mono text-white/45 mt-4 pt-3 border-t border-white/10">
            Best converting: <span className="text-white/85 font-bold">{best.group.name}</span>{" "}
            at {pct(best.summary.blendedConversion, best.summary.approximate)}
          </p>
        )}
      </div>

      {/* Cross-event conversion comparison */}
      {conversionChart && reports.length > 1 && (
        <section className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#f0f0ee]">
            <h3 className="text-[13px] font-bold text-[#0f0f0f]">Conversion by event</h3>
            <p className="text-[10px] font-mono text-[#a1a1a1] mt-0.5">
              All years combined, highest first · dashed line is the 40% benchmark
            </p>
          </div>
          <div className="px-3 py-4 overflow-x-auto">
            <div style={{ minWidth: 560 }}>
              <Svg markup={conversionChart} />
            </div>
          </div>
        </section>
      )}

      {/* Per-event detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reports.map(r => {
          const chart = yearComparisonChart(r.years.map(y => ({
            year: y.year ?? "No date",
            signups: y.signups,
            paying: y.paying,
            conversionPct: y.conversionPct,
            approximate: y.approximate,
          })));
          return (
            <section key={r.group.id} className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-[#f0f0ee] bg-[#fafafa]">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-bold text-[#0f0f0f] truncate">{r.group.name}</h3>
                    <p className="text-[9px] font-mono text-[#a1a1a1] mt-0.5">
                      {r.group.codes.length} code{r.group.codes.length === 1 ? "" : "s"} ·{" "}
                      {r.years.filter(y => y.year != null).length} year{r.years.filter(y => y.year != null).length === 1 ? "" : "s"} of data
                    </p>
                  </div>
                  <TrendPill latest={r.summary.latest} previous={r.summary.previous} />
                </div>
              </div>

              <div className="px-3 pt-4 pb-1">
                <Svg markup={chart} />
                <div
                  className="cf-legend-wrap px-2 pb-1"
                  dangerouslySetInnerHTML={{ __html: yearChartLegend() }}
                />
              </div>

              {/* Per-code roster */}
              <div className="border-t border-[#f0f0ee] divide-y divide-[#f7f7f6] mt-auto">
                {r.entries.map(e => (
                  <div key={e.code} className="px-4 py-2 flex items-center gap-2.5 flex-wrap">
                    <span className="text-[10px] font-black font-mono text-[#1a1a1a] shrink-0">{e.year ?? "—"}</span>
                    <span className="text-[9.5px] font-mono text-[#888] flex-1 min-w-0 truncate">{e.code}</span>
                    {e.province && e.province !== "??" && (
                      <span
                        className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ color: provColor(e.province), backgroundColor: provColor(e.province) + "14" }}
                      >
                        {e.province}
                      </span>
                    )}
                    <span className="text-[9.5px] font-mono text-[#3d3d3d] shrink-0 tabular-nums">{num(e.signups)} sig</span>
                    <span className="text-[9.5px] font-mono font-bold shrink-0 tabular-nums" style={{ color: e.payingApproximate ? CHART_COLORS.approx : CHART_COLORS.paying }}>
                      {e.payingApproximate ? "≈" : ""}{num(e.paying)} pay
                    </span>
                    <button
                      onClick={() => onViewDetail(e.code)}
                      className="shrink-0 text-[#c0c0c0] hover:text-[#2b5346] cursor-pointer"
                      title="All available info"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {totals.approximate && (
        <p className="text-[9.5px] font-mono text-[#c9a000]">
          ≈ Paying/conversion for some codes comes from the built-in DB's funnel-step signal, not a confirmed
          Paying Customers count — treat those as an upper bound.
        </p>
      )}
    </div>
  );
}
