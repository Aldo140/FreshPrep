import React from "react";
import { AnalyzedCodeReport, KPIReportSummary, ReportPage } from "../../../types";
import { PortfolioHealth } from "../../../hooks/useAnalysis";
import KeyFindingsSection from "../../../components/KeyFindingsSection";
import { MetricTooltip } from "../../../components/DesignSystem";

interface OverviewTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  fileName: string | null;
  dbRowCount: number;
  portfolioHealth: PortfolioHealth | null;
  /** Called when a quick-nav card on the overview page is clicked. */
  onNavigate: (page: ReportPage) => void;
}

export function OverviewTab({ foundReports, summary, fileName, dbRowCount, portfolioHealth, onNavigate }: OverviewTabProps): React.ReactElement {
  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">

      {/* Hero card with food photo */}
      <div className="rounded-2xl overflow-hidden flex min-h-[180px] shadow-sm">
        {/* Left: brand panel */}
        <div className="flex-1 bg-[#2b5346] p-7 flex flex-col justify-between">
          <div>
            <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-2">Campaign Performance Report</p>
            <h2 className="text-2xl font-display font-semibold text-white leading-tight">
              {foundReports.length} codes analyzed
            </h2>
            <p className="text-sm text-white/70 mt-1">
              {fileName && <span className="font-mono">{fileName} · </span>}
              {dbRowCount.toLocaleString()} records
            </p>
          </div>
          <div className="flex gap-6 mt-4">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Blended Conv.</p>
              <p className="text-xl font-bold font-mono text-white">{summary.blendedConversionRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Avg LTV 12M</p>
              <p className="text-xl font-bold font-mono text-white">${Math.round(summary.averageLTV12).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Total Signups</p>
              <p className="text-xl font-bold font-mono text-white">{summary.totalSignups.toLocaleString()}</p>
            </div>
          </div>
        </div>
        {/* Right: food photo */}
        <div className="hidden sm:block w-[38%] shrink-0 relative">
          <img
            src="https://freshprep.imgix.net/landing/carousel/recipe_1.jpg?auto=compress,format&w=600"
            alt="FreshPrep meal"
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.92) saturate(1.1)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #2b5346 0%, transparent 30%)' }} />
        </div>
      </div>

      {/* Portfolio health tiles */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-3xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1a1a1a]">Code performance</h3>
          <span className="text-[10px] bg-[#eef4f1] text-[#2b5346] px-2 py-0.5 rounded font-mono font-bold border border-[#2b5346]/20">
            {foundReports.length} Codes
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricTooltip title="Codes Analyzed" definition="Total unique promo codes matched and analyzed." note="Unmatched codes appear in Issues." position="below">
            <div className="p-3 bg-[#f8f7f5] rounded-lg cursor-default" style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '0ms' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a1a1a1] font-mono">Analyzed</p>
              <p className="text-xl font-bold text-[#1a1a1a] font-mono mt-0.5">{portfolioHealth?.total}</p>
              <p className="text-[9px] text-[#a1a1a1] mt-0.5">codes</p>
            </div>
          </MetricTooltip>
          <MetricTooltip title="High Converting" definition="Codes achieving ≥40% conversion." note="Strong. Replicate the offer structure." position="below">
            <div className="p-3 bg-[#eef4f1] border border-[#2b5346]/20 rounded-lg cursor-default" style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '40ms' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#2b5346] font-mono">High</p>
              <p className="text-xl font-bold text-[#2b5346] font-mono mt-0.5">{portfolioHealth?.strong}</p>
              <p className="text-[9px] text-[#3d3d3d] mt-0.5">≥ 40%</p>
            </div>
          </MetricTooltip>
          <MetricTooltip title="Average Performers" definition="Codes in the 20–39% conversion range." note="Monitor. Optimize targeting or offer." position="below">
            <div className="p-3 bg-[#fdf8e1] border border-[#e7bd27]/30 rounded-lg cursor-default" style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '80ms' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8a6f00] font-mono">Average</p>
              <p className="text-xl font-bold text-[#8a6f00] font-mono mt-0.5">{portfolioHealth?.average}</p>
              <p className="text-[9px] text-[#3d3d3d] mt-0.5">20–39%</p>
            </div>
          </MetricTooltip>
          <MetricTooltip title="Weak Performers" definition="Codes below 20% conversion." note="Review for discontinuation or re-targeting." position="below">
            <div className="p-3 bg-[#fef3ed] border border-[#e78a58]/30 rounded-lg cursor-default" style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '120ms' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#9b4a1c] font-mono">Weak</p>
              <p className="text-xl font-bold text-[#9b4a1c] font-mono mt-0.5">{portfolioHealth?.weak}</p>
              <p className="text-[9px] text-[#3d3d3d] mt-0.5">&lt; 20%</p>
            </div>
          </MetricTooltip>
          <MetricTooltip title="Portfolio Conversion" definition="Total paying customers ÷ total signups across all codes." note="Weighted by volume — large codes affect this most." position="below">
            <div className="p-3 bg-[#f8f7f5] rounded-lg cursor-default" style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '160ms' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a1a1a1] font-mono">Conv.</p>
              <p className="text-xl font-bold text-[#1a1a1a] font-mono mt-0.5">{summary.blendedConversionRate.toFixed(1)}%</p>
              <p className="text-[9px] text-[#a1a1a1] mt-0.5">blended</p>
            </div>
          </MetricTooltip>
          <MetricTooltip title="Portfolio LTV" definition="Mean 12-month lifetime value per acquired customer." note="Higher LTV justifies higher acquisition cost." position="below">
            <div className="p-3 bg-[#f8f7f5] rounded-lg cursor-default" style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards', animationDelay: '200ms' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a1a1a1] font-mono">LTV 12M</p>
              <p className="text-xl font-bold text-[#1a1a1a] font-mono mt-0.5">${Math.round(summary.averageLTV12).toLocaleString()}</p>
              <p className="text-[9px] text-[#a1a1a1] mt-0.5">avg / customer</p>
            </div>
          </MetricTooltip>
        </div>
      </div>

      {/* Key findings snapshot */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-3xs">
        <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Key findings</h3>
        <KeyFindingsSection reports={foundReports} summary={summary} />
      </div>

      {/* Navigation prompt */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { page: 'performance' as const, label: 'Performance', sub: 'KPIs + conversion chart', color: '#2b5346', bg: '#eef4f1' },
          { page: 'revenue' as const,     label: 'Revenue',     sub: 'LTV + portfolio health', color: '#8a6f00', bg: '#fdf8e1' },
          { page: 'regional' as const,    label: 'Regional',    sub: 'Province breakdown',     color: '#3d3d3d', bg: '#f8f7f5' },
          { page: 'data' as const,        label: 'Data',        sub: 'Full sortable table',    color: '#3d3d3d', bg: '#f8f7f5' },
        ].map(item => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className="text-left p-4 rounded-xl border cursor-pointer"
            style={{ backgroundColor: item.bg, borderColor: `${item.color}20`, transition: 'box-shadow 150ms var(--ease-out), transform 100ms var(--ease-out)' }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
          >
            <p className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</p>
            <p className="text-[10px] text-[#a1a1a1] mt-0.5">{item.sub}</p>
          </button>
        ))}
      </div>

    </div>
  );
}
