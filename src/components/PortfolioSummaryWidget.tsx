/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { KPIReportSummary, AnalyzedCodeReport, ChannelSummary } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  DollarSign, 
  ClipboardCheck, 
  Activity, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

interface PortfolioSummaryWidgetProps {
  summary: KPIReportSummary;
  reports: AnalyzedCodeReport[];
  channels: ChannelSummary[];
}

export default function PortfolioSummaryWidget({ summary, reports, channels }: PortfolioSummaryWidgetProps) {
  const [selectedTopic, setSelectedTopic] = useState<"summary" | "top" | "highest-conv" | "highest-ltv" | "lowest">("summary");

  const computedMetrics = useMemo(() => {
    if (reports.length === 0) return null;

    // 1. Portfolio Summary Insights
    const totalMatchedCodes = reports.length;
    const avgConversion = reports.reduce((acc, r) => acc + r.calculatedConversion, 0) / totalMatchedCodes;

    // 2. Highest Conversion
    const highestConvCode = [...reports].sort((a, b) => b.calculatedConversion - a.calculatedConversion)[0];

    // 3. Highest LTV
    const highestLtvCode = [...reports].sort((a, b) => b["Avg LTV 12"] - a["Avg LTV 12"])[0];

    // 4. Lowest Performer
    const lowestPerformerCode = [...reports].sort((a, b) => a.calculatedConversion - b.calculatedConversion)[0];

    // 5. Top Performer (Best Overall Score of Rank)
    const topPerformerCode = [...reports].sort((a, b) => b.overallScore - a.overallScore)[0];

    return {
      totalMatchedCodes,
      avgConversion,
      highestConvCode,
      highestLtvCode,
      lowestPerformerCode,
      topPerformerCode
    };
  }, [reports]);

  if (!computedMetrics) {
    return (
      <div
        id="portfolio-summary-blank"
        className="p-6 rounded-xl border border-dashed border-[#2b5346]/20 bg-white shadow-xs text-center flex flex-col items-center justify-center min-h-[160px]"
      >
        <Activity className="w-8 h-8 text-[#2b5346] animate-pulse mb-2.5" />
        <h4 className="text-sm font-semibold text-slate-800">Awaiting matched campaign data...</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
          Please submit valid promo codes matching the active database to view real-time portfolio summaries.
        </p>
      </div>
    );
  }

  const {
    totalMatchedCodes,
    avgConversion,
    highestConvCode,
    highestLtvCode,
    lowestPerformerCode,
    topPerformerCode
  } = computedMetrics;

  const topics = [
    { id: "summary", label: "Portfolio Summary", icon: ClipboardCheck },
    { id: "top", label: "Top Performer", icon: Award },
    { id: "highest-conv", label: "Highest Conversion", icon: TrendingUp },
    { id: "highest-ltv", label: "Highest LTV", icon: DollarSign },
    { id: "lowest", label: "Lowest Performer", icon: TrendingDown },
  ] as const;

  return (
    <div 
      id="portfolio-summary-widget" 
      className="bg-white border border-slate-200/85 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col gap-4 font-sans animate-fade-in"
    >
      {/* Header section with Fresh Prep green accents */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
            <span className="w-2.5 h-2.5 bg-[#2b5346] rounded-full shrink-0" />
            Executive Segment Performance
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Internal Fresh Prep Business Intelligence Insights
          </p>
        </div>
      </div>

      {/* Modern tabbed controls in a neat, light sub-rail */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-50 border border-slate-100 rounded-lg" id="portfolio-tabs-rail">
        {topics.map((t) => {
          const Icon = t.icon;
          const isActive = selectedTopic === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id)}
              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-bold transition-colors cursor-pointer ${
                isActive
                  ? "bg-white border border-slate-205/55 text-[#2b5346] shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isActive ? "text-[#2b5346]" : "text-slate-400"}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl text-xs leading-relaxed text-slate-700 space-y-3 font-sans">
        
        {/* TAB 1: PORTFOLIO SUMMARY */}
        {selectedTopic === "summary" && (
          <div className="space-y-3 animate-fade-in" id="topic-summary-panel">
            <div className="flex justify-between items-center bg-white border border-slate-200/50 p-2.5 rounded-lg">
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider font-mono">Portfolio Average Conversion</p>
                <p className="text-base font-extrabold text-slate-850 font-sans mt-0.5">{avgConversion.toFixed(1)}%</p>
              </div>
              <span className="px-2 py-0.5 bg-[#eef4f1] text-[#2b5346] border border-[#2b5346]/20 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                Stable Benchmark
              </span>
            </div>
            
            <p className="text-slate-600">
              The audited portfolio currently encompasses <strong className="text-slate-800">{totalMatchedCodes} active event codes</strong>. Blended performance returns are yielding a conversion baseline of <strong className="font-mono text-slate-800">{summary.blendedConversionRate.toFixed(1)}%</strong> across all associated marketing channels. This output represents a total customer cohort contribution value of <strong className="text-[#2b5346] font-bold">${summary.totalLTV12.toLocaleString()}</strong> over a 12-month timeline.
            </p>
            
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2b5346] flex-shrink-0" />
              <span>Channels matched: {channels.length}. Main subscription conversion is tracing in line with corporate benchmarks.</span>
            </div>
          </div>
        )}

        {/* TAB 2: TOP PERFORMER */}
        {selectedTopic === "top" && topPerformerCode && (
          <div className="space-y-3 animate-fade-in" id="topic-top-panel">
            <div className="flex justify-between items-center bg-white border border-slate-200/50 p-2.5 rounded-lg">
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider font-mono">Top Combined Score Performer</p>
                <p className="text-base font-extrabold text-indigo-750 font-sans mt-0.5">{topPerformerCode.discount_code}</p>
              </div>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                Overall Index: {topPerformerCode.overallScore}/100
              </span>
            </div>

            <p className="text-slate-600">
              Promo code <strong className="text-slate-950 font-mono">{topPerformerCode.discount_code}</strong> represents the highest overall operational efficiency. It yielded <strong className="text-slate-900 font-mono">{topPerformerCode.Signups}</strong> venue signups, maintaining a highly healthy subscription conversion index of <strong className="text-[#2b5346] font-bold font-mono">{topPerformerCode.calculatedConversion.toFixed(1)}%</strong> and generating <strong className="text-[#2b5346] font-bold">${topPerformerCode["Sum LTV 12"].toLocaleString()}</strong> in actual customer lifetime volume.
            </p>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2b5346] flex-shrink-0" />
              <span>Recommended Action: Expand budget allocations on this program immediately to leverage stronger LTV returns.</span>
            </div>
          </div>
        )}

        {/* TAB 3: HIGHEST CONVERSION */}
        {selectedTopic === "highest-conv" && highestConvCode && (
          <div className="space-y-3 animate-fade-in" id="topic-highest-conv-panel">
            <div className="flex justify-between items-center bg-white border border-slate-200/50 p-2.5 rounded-lg">
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider font-mono">Highest Conversion Rate</p>
                <p className="text-base font-extrabold text-[#2b5346] font-sans mt-0.5">{highestConvCode.discount_code}</p>
              </div>
              <span className="px-2 py-0.5 bg-[#eef4f1] text-[#2b5346] border border-[#2b5346]/20 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                {highestConvCode.calculatedConversion.toFixed(1)}% Rate
              </span>
            </div>

            <p className="text-slate-600">
              Campaign checkout records verify <strong className="text-slate-950 font-mono">{highestConvCode.discount_code}</strong> achieved the maximum Conversion profile of <strong className="text-[#2b5346] font-bold font-mono">{highestConvCode.calculatedConversion.toFixed(1)}%</strong>. This code registered <strong className="text-slate-800 font-mono">{highestConvCode["Paying cx"]}</strong> subscription conversions out of <strong className="text-slate-800 font-mono">{highestConvCode.Signups}</strong> total signups, and returned <strong className="text-slate-800">${highestConvCode["Avg LTV 12"].toFixed(0)}</strong> in average customer value.
            </p>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2b5346] flex-shrink-0" />
              <span>Conversion Quality: Grade {highestConvCode.performanceGrade} performance. Outstanding audience response.</span>
            </div>
          </div>
        )}

        {/* TAB 4: HIGHEST LTV */}
        {selectedTopic === "highest-ltv" && highestLtvCode && (
          <div className="space-y-3 animate-fade-in" id="topic-highest-ltv-panel">
            <div className="flex justify-between items-center bg-white border border-slate-200/50 p-2.5 rounded-lg">
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider font-mono">Highest Avg Customer Value</p>
                <p className="text-base font-extrabold text-[#8a6f00] font-sans mt-0.5">{highestLtvCode.discount_code}</p>
              </div>
              <span className="px-2 py-0.5 bg-[#fdf8e1] text-[#8a6f00] border border-[#e7bd27]/30 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                ${highestLtvCode["Avg LTV 12"].toFixed(0)} Avg LTV
              </span>
            </div>

            <p className="text-slate-600">
              Segment analysis isolated <strong className="text-slate-950 font-mono">{highestLtvCode.discount_code}</strong> as the frontrunner for high-value client acquisitions. Subscribers sign up with an Average 12-Month LTV valuation of <strong className="text-slate-900 font-mono font-bold">${highestLtvCode["Avg LTV 12"].toFixed(0)}</strong>, which is substantially above the portfolio mean of <strong className="text-slate-800 font-sans">${summary.averageLTV12.toFixed(0)}</strong>.
            </p>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2b5346] flex-shrink-0" />
              <span>Customer Longevity: Strong financial retention indicators. Leverage this audience cohort across newsletter updates.</span>
            </div>
          </div>
        )}

        {/* TAB 5: LOWEST PERFORMER */}
        {selectedTopic === "lowest" && lowestPerformerCode && (
          <div className="space-y-3 animate-fade-in" id="topic-lowest-panel">
            <div className="flex justify-between items-center bg-white border border-slate-200/50 p-2.5 rounded-lg">
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider font-mono">Lowest Conversion segment</p>
                <p className="text-base font-extrabold text-[#850b0b] font-sans mt-0.5">{lowestPerformerCode.discount_code}</p>
              </div>
              <span className="px-2 py-0.5 bg-[#ffd0d0] text-[#850b0b] border border-[#850b0b]/20 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                {lowestPerformerCode.calculatedConversion.toFixed(1)}% Conversion
              </span>
            </div>

            <p className="text-slate-600">
              Promo code <strong className="text-slate-900 font-mono">{lowestPerformerCode.discount_code}</strong> currently ranks as the lowest converting segment at <strong className="text-[#850b0b] font-bold font-mono">{lowestPerformerCode.calculatedConversion.toFixed(1)}%</strong>. Active signups stands at <strong className="font-mono text-slate-800">{lowestPerformerCode.Signups}</strong> resulting in <strong className="font-mono text-slate-800">{lowestPerformerCode["Paying cx"]}</strong> subscription buyers.
            </p>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5 font-sans">
              <AlertCircle className="w-3.5 h-3.5 text-[#850b0b] flex-shrink-0" />
              <span>Mitigation Direction: Suspend further ad placement or optimize coupon alignment steps in this specific regional campaign.</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
