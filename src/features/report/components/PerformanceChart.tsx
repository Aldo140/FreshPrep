/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { AnalyzedCodeReport } from "../../../types";
import { Layers } from "lucide-react";
import { gradeBand } from "./DashboardMetrics";
import { MetricInfo } from "../../../components/MetricInfo";

type SortKey = "conversion" | "signups" | "score";

interface PerformanceChartProps {
  reports: AnalyzedCodeReport[];
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: "conversion", label: "Conversion" },
  { id: "signups", label: "Signups" },
  { id: "score", label: "Score" },
];

export default function PerformanceChart({ reports }: PerformanceChartProps) {
  const [sortKey, setSortKey] = useState<SortKey>("conversion");

  const maxSignups = useMemo(
    () => reports.reduce((m, r) => Math.max(m, r.Signups), 1),
    [reports],
  );

  const rows = useMemo(() => {
    const copy = [...reports];
    copy.sort((a, b) => {
      if (sortKey === "signups") return b.Signups - a.Signups;
      if (sortKey === "score") return b.overallScore - a.overallScore;
      return b.calculatedConversion - a.calculatedConversion;
    });
    return copy;
  }, [reports, sortKey]);

  if (reports.length === 0) {
    return (
      <div id="chart-placeholder" className="p-8 rounded-2xl border border-dashed border-[#e0e0e0] bg-[#fafafa] text-center">
        <Layers className="w-9 h-9 text-[#c8c8c8] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#1a1a1a]">No codes to rank</p>
        <p className="text-xs text-[#a1a1a1] mt-1">
          Upload an export and enter codes to build the roster.
        </p>
      </div>
    );
  }

  return (
    <div
      id="performance-chart-container"
      className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-[#f2f2f2]">
        <p className="text-[9px] font-semibold text-[#a1a1a1] uppercase tracking-widest font-mono flex items-center gap-1.5">
          {reports.length} {reports.length === 1 ? "code" : "codes"} · bar length = signups
          <MetricInfo
            side="bottom"
            text="Each bar's full length shows how many signups the code drove relative to your biggest code. The solid section is the share that converted to paying."
          />
        </p>

        <div className="flex items-center gap-1 bg-[#f6f6f5] border border-[#ececec] p-0.5 rounded-lg">
          {SORTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSortKey(s.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-colors tap-scale ${
                sortKey === s.id
                  ? "bg-white text-[#2b5346] shadow-sm border border-[#e4e4e4]"
                  : "text-[#a1a1a1] hover:text-[#3d3d3d] border border-transparent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster */}
      <div className={`divide-y divide-[#f4f4f4] ${reports.length > 12 ? "max-h-[520px] overflow-y-auto" : ""}`}>
        {rows.map((r, idx) => {
          const band = gradeBand(r.calculatedConversion);
          const volumeShare = (r.Signups / maxSignups) * 100;
          const convShare = Math.min(100, r.calculatedConversion);

          return (
            <div
              key={`${r.discount_code}-${r.Province ?? ""}-${idx}`}
              className="px-4 md:px-5 py-3 hover:bg-[#fbfbfa] transition-colors"
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[9px] font-mono text-[#c8c8c8] w-4 shrink-0 text-right">{idx + 1}</span>
                <span className="font-mono text-xs font-bold text-[#1a1a1a] truncate">{r.discount_code}</span>
                <span className="text-[9px] font-mono text-[#b8b8b8] truncate hidden sm:inline">
                  {r.channel}
                  {r.Province ? ` · ${r.Province}` : ""}
                </span>
                <span
                  className="ml-auto shrink-0 text-[9px] font-black font-mono px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: band.tint, color: band.ink }}
                >
                  {band.grade}
                </span>
                <span className="shrink-0 text-xs font-bold font-mono w-14 text-right" style={{ color: band.ink }}>
                  {r.calculatedConversion.toFixed(1)}%
                </span>
              </div>

              {/* Volume rail: length = signups, solid part = converted */}
              <div className="ml-6 h-3.5 rounded-md bg-[#f7f7f6] overflow-hidden">
                <div
                  className="h-full rounded-md overflow-hidden"
                  style={{
                    width: `${Math.max(volumeShare, 1.5)}%`,
                    backgroundColor: `${band.color}22`,
                    transition: "width 600ms cubic-bezier(0.23,1,0.32,1)",
                  }}
                >
                  <div
                    className="h-full rounded-md"
                    style={{
                      width: `${convShare}%`,
                      backgroundColor: band.color,
                      transition: "width 600ms cubic-bezier(0.23,1,0.32,1)",
                    }}
                  />
                </div>
              </div>

              <div className="ml-6 flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5 text-[9px] font-mono text-[#b0b0b0]">
                <span>{r.Signups.toLocaleString()} signups</span>
                <span style={{ color: band.ink }}>{r["Paying cx"].toLocaleString()} paying</span>
                <span>{(r.Signups - r["Paying cx"]).toLocaleString()} didn't convert</span>
                <span className="ml-auto">score {r.overallScore}/100</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
