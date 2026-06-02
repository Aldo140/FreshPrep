import React from "react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import PortfolioSummaryWidget from "../../../components/PortfolioSummaryWidget";

interface RevenueTabProps {
  summary: KPIReportSummary;
  foundReports: AnalyzedCodeReport[];
  channelSummary: ChannelSummary[];
}

export function RevenueTab({ summary, foundReports, channelSummary }: RevenueTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* Revenue hero — warm gold accent */}
      <div className="rounded-2xl overflow-hidden flex min-h-[140px] shadow-sm">
        <div className="flex-1 p-6 flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, #2b5346 0%, #3a6b58 100%)' }}>
          <p className="text-xs text-white/50 font-mono uppercase tracking-widest">Revenue snapshot</p>
          <div className="flex gap-8 mt-3">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Total LTV 12M</p>
              <p className="text-2xl font-bold font-mono text-white">${summary.totalLTV12.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Avg LTV 12M</p>
              <p className="text-2xl font-bold font-mono text-white">${Math.round(summary.averageLTV12).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Paying Cx</p>
              <p className="text-2xl font-bold font-mono text-white">{summary.totalPayingCustomers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:block w-[30%] shrink-0 relative">
          <img
            src="https://freshprep.imgix.net/landing/carousel/recipe_2.jpg?auto=compress,format&w=400"
            alt="FreshPrep meal"
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.88) saturate(1.05)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #2b5346 0%, transparent 35%)' }} />
        </div>
      </div>
      <PortfolioSummaryWidget summary={summary} reports={foundReports} channels={channelSummary} />
    </div>
  );
}
