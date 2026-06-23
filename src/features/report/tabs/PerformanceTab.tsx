import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import DashboardMetrics from "../components/DashboardMetrics";
import PerformanceChart from "../components/PerformanceChart";
import PortfolioSummaryWidget from "../components/PortfolioSummaryWidget";

interface PerformanceTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
}

export function PerformanceTab({ foundReports, summary, channelSummary }: PerformanceTabProps): React.ReactElement {
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const totalSignups = summary.totalSignups;
  const totalPaying = summary.totalPayingCustomers;
  const notConverted = totalSignups - totalPaying;

  const r = 52;
  const circumference = 2 * Math.PI * r;
  const convFraction = totalSignups > 0 ? totalPaying / totalSignups : 0;
  const dashOffset = circumference * (1 - convFraction);

  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Performance</h2>
        <span className="text-[10px] text-[#a1a1a1] font-mono">Conversion metrics + code leaderboard</span>
      </div>

      <DashboardMetrics summary={summary} />

      {/* Signup → Customer conversion funnel */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-5 sm:p-6">
        <p className="text-[10px] text-[#a1a1a1] font-mono uppercase tracking-wider mb-4">Signup → Customer Funnel</p>
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Donut */}
          <div className="relative shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140">
              {/* background track */}
              <circle cx="70" cy="70" r={r} fill="none" stroke="#e8e8e8" strokeWidth="14" />
              {/* paying arc */}
              <circle
                cx="70" cy="70" r={r}
                fill="none"
                stroke="#2b5346"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[22px] font-bold font-mono text-[#1a1a1a] leading-none">
                {summary.blendedConversionRate.toFixed(1)}%
              </span>
              <span className="text-[9px] text-[#a1a1a1] font-mono uppercase tracking-wider mt-0.5">converted</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
            <div>
              <p className="text-[10px] text-[#a1a1a1] font-mono uppercase tracking-wider mb-1">Total Signups</p>
              <p className="text-2xl font-bold font-mono text-[#1a1a1a]">{totalSignups.toLocaleString()}</p>
              <p className="text-[10px] text-[#a1a1a1] mt-0.5">venue registrations</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#2b5346] shrink-0" />
                <p className="text-[10px] text-[#a1a1a1] font-mono uppercase tracking-wider">Paying customers</p>
              </div>
              <p className="text-2xl font-bold font-mono text-[#2b5346]">{totalPaying.toLocaleString()}</p>
              <p className="text-[10px] text-[#a1a1a1] mt-0.5">converted to subscribers</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full border border-[#d0d0d0] bg-[#e8e8e8] shrink-0" />
                <p className="text-[10px] text-[#a1a1a1] font-mono uppercase tracking-wider">Not converted</p>
              </div>
              <p className="text-2xl font-bold font-mono text-[#a1a1a1]">{notConverted.toLocaleString()}</p>
              <p className="text-[10px] text-[#a1a1a1] mt-0.5">signed up, didn't subscribe</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible: Performance Analytics */}
      <div>
        <button
          onClick={() => setAnalyticsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#e8e8e8] bg-white hover:bg-[#f8f8f8] transition-colors text-left shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#2b5346] shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Performance Analytics</p>
              <p className="text-[10px] text-[#a1a1a1] font-mono">Conversion leaderboard · volume funnel · channel breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[#a1a1a1] font-mono hidden sm:block">
              {analyticsOpen ? "Collapse" : "Expand"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#a1a1a1] transition-transform duration-200 ${analyticsOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {analyticsOpen && (
          <div className="mt-2">
            <PerformanceChart reports={foundReports} channels={channelSummary} />
          </div>
        )}
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
