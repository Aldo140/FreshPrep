import React, { useState } from "react";
import { ChevronDown, TrendingUp, BarChart2, DollarSign } from "lucide-react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import PortfolioSummaryWidget from "../../../components/PortfolioSummaryWidget";

interface RevenueTabProps {
  summary: KPIReportSummary;
  foundReports: AnalyzedCodeReport[];
  channelSummary: ChannelSummary[];
}

export function RevenueTab({ summary, foundReports, channelSummary }: RevenueTabProps): React.ReactElement {
  const [insightsOpen, setInsightsOpen] = useState(false);

  const sortedByLtv = [...foundReports].sort((a, b) => b["Avg LTV 12"] - a["Avg LTV 12"]);
  const maxAvgLtv12 = sortedByLtv[0]?.["Avg LTV 12"] ?? 1;

  const sortedByRevenue = [...foundReports].sort((a, b) => b["Sum LTV 12"] - a["Sum LTV 12"]);
  const maxRevenue = sortedByRevenue[0]?.["Sum LTV 12"] ?? 1;

  const totalLtv3 = foundReports.reduce((s, r) => s + r["Sum LTV 3"], 0);
  const totalLtv6 = foundReports.reduce((s, r) => s + r["Sum LTV 6"], 0);

  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Revenue</h2>
        <span className="text-[10px] text-[#a1a1a1] font-mono">LTV · revenue attribution · customer value</span>
      </div>

      {/* Hero — revenue overview */}
      <div className="rounded-2xl overflow-hidden flex min-h-[160px] shadow-sm">
        <div
          className="flex-1 p-6 flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #1e3d31 0%, #2b5346 55%, #3a6b58 100%)" }}
        >
          <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Revenue Snapshot</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 mt-3">
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-0.5">Portfolio Total (12mo)</p>
              <p className="text-3xl font-bold font-mono text-white leading-none">
                ${summary.totalLTV12.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-5">
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-0.5">3 Month</p>
                <p className="text-lg font-semibold font-mono text-white/70">${totalLtv3.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-0.5">6 Month</p>
                <p className="text-lg font-semibold font-mono text-white/70">${totalLtv6.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Avg LTV / Customer</p>
              <p className="text-base font-bold font-mono text-white/90">${Math.round(summary.averageLTV12).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Paying Customers</p>
              <p className="text-base font-bold font-mono text-white/90">{summary.totalPayingCustomers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:block w-[28%] shrink-0 relative">
          <img
            src="https://freshprep.imgix.net/landing/carousel/recipe_2.jpg?auto=compress,format&w=400"
            alt="FreshPrep meal"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.82) saturate(1.1)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, #2b5346 0%, transparent 40%)" }}
          />
        </div>
      </div>

      {/* LTV Progression — per-code 3/6/12mo bars */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#2b5346]" />
              Customer LTV Progression
            </h3>
            <p className="text-[11px] text-[#a1a1a1] font-mono mt-0.5">
              Avg revenue per paying customer at 3, 6 and 12 months
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wider">
            <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-[#86b09e] inline-block" />3mo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-[#4d8970] inline-block" />6mo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-[#2b5346] inline-block" />12mo</span>
          </div>
        </div>

        <div className="divide-y divide-[#f8f8f8]">
          {sortedByLtv.map((code) => {
            const pct3 = maxAvgLtv12 > 0 ? (code["Avg LTV 3"] / maxAvgLtv12) * 100 : 0;
            const pct6 = maxAvgLtv12 > 0 ? (code["Avg LTV 6"] / maxAvgLtv12) * 100 : 0;
            const pct12 = maxAvgLtv12 > 0 ? (code["Avg LTV 12"] / maxAvgLtv12) * 100 : 0;
            const multiplier = code["Avg LTV 3"] > 0 ? code["Avg LTV 12"] / code["Avg LTV 3"] : null;

            return (
              <div key={`${code.discount_code}-${code.Province ?? ""}`} className="px-6 py-4">
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-[13px] text-[#1a1a1a] truncate">{code.discount_code}</span>
                    <span className="text-[10px] text-[#a1a1a1] px-1.5 py-0.5 rounded bg-[#f8f7f5] border border-[#e8e8e8] shrink-0">
                      {code.channel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                    <span className="text-[#a1a1a1]">${code["Avg LTV 3"].toFixed(0)}</span>
                    <span className="text-[#c8c8c8]">→</span>
                    <span className="text-[#a1a1a1]">${code["Avg LTV 6"].toFixed(0)}</span>
                    <span className="text-[#c8c8c8]">→</span>
                    <span className="font-bold text-[#2b5346]">${code["Avg LTV 12"].toFixed(0)}</span>
                    {multiplier !== null && multiplier > 0 && (
                      <span className="text-[9px] text-[#a1a1a1] bg-[#f8f7f5] border border-[#e8e8e8] px-1.5 py-0.5 rounded">
                        ×{multiplier.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[8px] font-mono text-[#c8c8c8] uppercase text-right shrink-0">3mo</span>
                    <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#86b09e] rounded-full transition-[width] duration-500" style={{ width: `${pct3}%` }} />
                    </div>
                    <span className="w-12 text-right text-[9px] font-mono text-[#c8c8c8] shrink-0">${code["Avg LTV 3"].toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[8px] font-mono text-[#c8c8c8] uppercase text-right shrink-0">6mo</span>
                    <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4d8970] rounded-full transition-[width] duration-500" style={{ width: `${pct6}%` }} />
                    </div>
                    <span className="w-12 text-right text-[9px] font-mono text-[#c8c8c8] shrink-0">${code["Avg LTV 6"].toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[8px] font-mono text-[#c8c8c8] uppercase text-right shrink-0">12mo</span>
                    <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#2b5346] rounded-full transition-[width] duration-500" style={{ width: `${pct12}%` }} />
                    </div>
                    <span className="w-12 text-right text-[9px] font-mono text-[#2b5346] font-semibold shrink-0">${code["Avg LTV 12"].toFixed(0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Contribution Leaderboard */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f0f0f0]">
          <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-[#2b5346]" />
            Revenue Contribution
          </h3>
          <p className="text-[11px] text-[#a1a1a1] font-mono mt-0.5">
            Total 12-month revenue generated per code (Sum LTV 12)
          </p>
        </div>

        <div className="divide-y divide-[#f8f8f8]">
          {sortedByRevenue.map((code, idx) => {
            const pct = maxRevenue > 0 ? (code["Sum LTV 12"] / maxRevenue) * 100 : 0;
            const portfolioShare = summary.totalLTV12 > 0
              ? (code["Sum LTV 12"] / summary.totalLTV12) * 100
              : 0;

            return (
              <div
                key={`${code.discount_code}-${code.Province ?? ""}-rev-${idx}`}
                className="px-6 py-3.5 flex items-center gap-4"
              >
                <span className="text-[11px] font-bold font-mono text-[#d8d8d8] w-4 shrink-0 text-center">{idx + 1}</span>
                <div className="flex flex-col w-28 shrink-0 min-w-0">
                  <span className="font-mono font-semibold text-[12px] text-[#1a1a1a] truncate">{code.discount_code}</span>
                  <span className="text-[9px] text-[#a1a1a1]">{code.channel}</span>
                </div>
                <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2b5346] rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-right shrink-0 min-w-[80px]">
                  <p className="text-[13px] font-bold font-mono text-[#2b5346]">
                    ${code["Sum LTV 12"].toLocaleString()}
                  </p>
                  <p className="text-[9px] text-[#a1a1a1] font-mono">
                    {code["Paying cx"]} cx · {portfolioShare.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-[#f0f0f0] flex items-center justify-between bg-[#f8f7f5] rounded-b-2xl">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-[#2b5346]" />
            <span className="text-[11px] font-semibold text-[#a1a1a1] font-mono uppercase tracking-wider">
              Portfolio Total (12mo)
            </span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-[#1a1a1a]">${summary.totalLTV12.toLocaleString()}</span>
            <p className="text-[10px] text-[#a1a1a1] font-mono">{summary.totalPayingCustomers} total customers</p>
          </div>
        </div>
      </div>

      {/* Collapsible: Executive Segment Performance */}
      <div>
        <button
          onClick={() => setInsightsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#e8e8e8] bg-white hover:bg-[#f8f8f8] transition-colors text-left shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#2b5346] shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Executive Segment Performance</p>
              <p className="text-[10px] text-[#a1a1a1] font-mono">Top/bottom performers · LTV breakdown · segment analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[#a1a1a1] font-mono hidden sm:block">
              {insightsOpen ? "Collapse" : "Expand"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#a1a1a1] transition-transform duration-200 ${insightsOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {insightsOpen && (
          <div className="mt-2">
            <PortfolioSummaryWidget summary={summary} reports={foundReports} channels={channelSummary} />
          </div>
        )}
      </div>
    </div>
  );
}
