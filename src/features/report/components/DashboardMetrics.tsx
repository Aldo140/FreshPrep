/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AnalyzedCodeReport, KPIReportSummary } from "../../../types";
import { MetricInfo } from "../../../components/MetricInfo";
import { AlertTriangle, Crown, FileCheck, TrendingUp, Users } from "lucide-react";

/* ── Grade bands ──────────────────────────────────────────────────────────
   Mirrors calculatePerformanceGrade() in utils/fileParser.ts. Shared with
   PerformanceTab so the distribution strip and the conversion spectrum are
   coloured from one source of truth.                                        */
export interface GradeBand {
  grade: string;
  min: number;
  max: number;
  color: string; // solid fill
  tint: string;  // background wash
  ink: string;   // readable text on white
  note: string;
}

export const GRADE_BANDS: GradeBand[] = [
  { grade: "A+", min: 50, max: Infinity, color: "#1a3d2f", tint: "#e9f1ec", ink: "#1a3d2f", note: "50%+" },
  { grade: "A",  min: 40, max: 50,       color: "#2b5346", tint: "#eef4f1", ink: "#2b5346", note: "40–49%" },
  { grade: "B",  min: 30, max: 40,       color: "#4d8970", tint: "#f1f7f4", ink: "#33705a", note: "30–39%" },
  { grade: "C",  min: 20, max: 30,       color: "#e7bd27", tint: "#fdf8e1", ink: "#8a6f00", note: "20–29%" },
  { grade: "D",  min: 10, max: 20,       color: "#e07a45", tint: "#fdf1e9", ink: "#9b4a1c", note: "10–19%" },
  { grade: "F",  min: 0,  max: 10,       color: "#850b0b", tint: "#fbeaea", ink: "#850b0b", note: "under 10%" },
];

export function gradeBand(conversion: number): GradeBand {
  return GRADE_BANDS.find(b => conversion >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

interface DashboardMetricsProps {
  summary: KPIReportSummary;
  reports: AnalyzedCodeReport[];
}

export default function DashboardMetrics({ summary, reports }: DashboardMetricsProps) {
  const total = reports.length;

  const distribution = GRADE_BANDS.map(band => ({
    band,
    count: reports.filter(r => gradeBand(r.calculatedConversion).grade === band.grade).length,
  }));

  const topByVolume = reports.reduce<AnalyzedCodeReport | null>(
    (best, r) => (best === null || r.Signups > best.Signups ? r : best),
    null,
  );
  const bestScored = reports.find(r => r.discount_code === summary.bestOverallScoreCode) ?? null;

  const callouts = [
    {
      id: "best-overall",
      label: "Top performer",
      icon: Crown,
      value: summary.bestOverallScoreCode || "—",
      sub: summary.bestOverallScoreVal > 0
        ? `${summary.bestOverallScoreVal}/100${bestScored ? ` · ${bestScored.overallScoreBadge}` : ""}`
        : "No codes matched",
      accent: "#2b5346",
      info: summary.hasLtvData
        ? "Composite score out of 100 blending conversion rate, customer value and signup volume."
        : "Composite score out of 100. With no revenue in this upload the score weights conversion rate (65%) and signup volume (35%).",
    },
    {
      id: "top-conversion",
      label: "Best conversion",
      icon: TrendingUp,
      value: summary.topPerformingCodeCode || "—",
      sub: summary.topPerformingCodeVal > 0 ? `${summary.topPerformingCodeVal.toFixed(1)}% converted` : "No codes matched",
      accent: "#4d8970",
      info: "The single code with the highest share of signups that became paying customers, regardless of how many signups it drove.",
    },
    {
      id: "top-volume",
      label: "Most signups",
      icon: Users,
      value: topByVolume?.discount_code || "—",
      sub: topByVolume ? `${topByVolume.Signups.toLocaleString()} signups · ${topByVolume.calculatedConversion.toFixed(1)}%` : "No codes matched",
      accent: "#8a6f00",
      info: "The code that brought in the most registrations. High volume with a low rate still moves the cohort number more than a small, sharp code.",
    },
    {
      id: "codes",
      label: "Codes matched",
      icon: summary.numCodesMissing > 0 ? AlertTriangle : FileCheck,
      value: summary.numCodesFound.toLocaleString(),
      sub: summary.numCodesMissing > 0
        ? `${summary.numCodesMissing} not found in the data`
        : "Every code you entered was found",
      accent: summary.numCodesMissing > 0 ? "#9b4a1c" : "#a1a1a1",
      info: "Codes from your input that were matched to rows in the upload. Unmatched codes get fuzzy-match suggestions on the Issues tab.",
    },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-5" id="dashboard-metric-engine-root">

      {/* ── Grade distribution ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden animate-slide-up-in">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 md:px-5 py-3 border-b border-[#f2f2f2]">
          <p className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-widest font-mono flex items-center gap-1.5">
            Grade distribution
            <MetricInfo side="bottom" text="Every matched code is graded on its conversion rate alone: A+ at 50% and up, A 40–49, B 30–39, C 20–29, D 10–19, F below 10." />
          </p>
          <p className="text-[9px] font-mono text-[#c0c0c0] flex items-center gap-1.5">
            {summary.averageConversionRate.toFixed(1)}% per code · {summary.blendedConversionRate.toFixed(1)}% blended
            <MetricInfo side="bottom" text="Per code is the plain average of every code's rate — each code counts once. Blended pools all signups together, so your biggest codes pull it. A gap between them means volume and quality are landing on different codes." />
          </p>
        </div>

        {/* Proportional strip */}
        <div className="flex h-2 bg-[#f5f5f5]">
          {distribution.filter(d => d.count > 0).map(d => (
            <div
              key={d.band.grade}
              style={{ flexGrow: d.count, backgroundColor: d.band.color }}
              title={`${d.count} ${d.count === 1 ? "code" : "codes"} graded ${d.band.grade}`}
            />
          ))}
        </div>

        {/* Per-grade cells */}
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[#f4f4f4]">
          {distribution.map(({ band, count }) => {
            const share = total > 0 ? (count / total) * 100 : 0;
            const on = count > 0;
            return (
              <div
                key={band.grade}
                className="px-3 py-3 md:py-3.5 flex flex-col gap-1 transition-colors"
                style={{ backgroundColor: on ? band.tint : "#ffffff" }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: on ? band.color : "#e0e0e0" }}
                  />
                  <span
                    className="text-[10px] font-black font-mono tracking-wide"
                    style={{ color: on ? band.ink : "#c8c8c8" }}
                  >
                    {band.grade}
                  </span>
                </div>
                <p
                  className="text-xl md:text-2xl font-bold font-mono leading-none tracking-tight"
                  style={{ color: on ? band.ink : "#d4d4d4" }}
                >
                  {count}
                </p>
                <p className="text-[8.5px] font-mono text-[#b0b0b0] leading-tight">
                  {band.note}{on ? ` · ${share.toFixed(0)}%` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Callout tiles ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {callouts.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              id={`kpi-card-${c.id}`}
              data-stagger={i}
              className="group bg-white rounded-xl border border-[#e8e8e8] shadow-sm px-3.5 py-3 md:px-4 md:py-3.5 flex flex-col gap-1.5 animate-slide-up-in hover:border-[#d6d6d6] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8.5px] md:text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-widest font-mono flex items-center gap-1 min-w-0">
                  <span className="truncate">{c.label}</span>
                  <MetricInfo side="bottom" text={c.info} />
                </p>
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: c.accent }} />
              </div>
              <p
                className="text-sm md:text-base font-bold font-mono tracking-tight truncate leading-tight"
                style={{ color: c.value === "—" ? "#c8c8c8" : "#1a1a1a" }}
                title={c.value}
              >
                {c.value}
              </p>
              <p className="text-[9px] md:text-[9.5px] font-mono leading-tight" style={{ color: c.accent }}>
                {c.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Revenue, only when the upload actually carries it ────────── */}
      {summary.hasLtvData && (
        <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 md:px-5 py-2.5 border-b border-[#f2f2f2] bg-[#fdfaf0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e7bd27] shrink-0" />
            <p className="text-[9px] font-semibold text-[#8a6f00] uppercase tracking-widest font-mono">
              This upload also carries revenue
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#f2f2f2]">
            {[
              { label: "LTV 3-month", value: summary.totalLTV3, sub: "cohort total" },
              { label: "LTV 12-month", value: summary.totalLTV12, sub: "cohort total" },
              { label: "Avg per customer", value: summary.averageLTV12, sub: "12-month" },
            ].map(m => (
              <div key={m.label} className="px-3.5 md:px-5 py-3">
                <p className="text-[8.5px] font-semibold text-[#b0b0b0] uppercase tracking-widest font-mono">{m.label}</p>
                <p className="text-base md:text-lg font-bold font-mono text-[#1a1a1a] mt-0.5 tracking-tight">
                  ${Math.round(m.value).toLocaleString()}
                </p>
                <p className="text-[8.5px] text-[#c0c0c0] font-mono mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
