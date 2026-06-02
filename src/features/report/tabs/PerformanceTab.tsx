import React from "react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import DashboardMetrics from "../../../components/DashboardMetrics";
import PerformanceChart from "../../../components/PerformanceChart";
import PortfolioSummaryWidget from "../../../components/PortfolioSummaryWidget";

interface PerformanceTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
}

export function PerformanceTab({ foundReports, summary, channelSummary }: PerformanceTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Performance</h2>
        <span className="text-[10px] text-[#a1a1a1] font-mono">Conversion metrics + code leaderboard</span>
      </div>
      <DashboardMetrics summary={summary} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8"><PerformanceChart reports={foundReports} channels={channelSummary} /></div>
        <div className="lg:col-span-4"><PortfolioSummaryWidget summary={summary} reports={foundReports} channels={channelSummary} /></div>
      </div>
    </div>
  );
}
