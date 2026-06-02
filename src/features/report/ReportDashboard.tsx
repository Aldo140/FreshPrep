import React from "react";
import {
  ReportPage,
  ActiveTab,
  AnalyzedCodeReport,
  KPIReportSummary,
  ChannelSummary,
  DiscountCodeData,
} from "../../types";
import { PortfolioHealth } from "../../hooks/useAnalysis";
import { RefreshCw } from "lucide-react";
import { OverviewTab } from "./tabs/OverviewTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { RegionalTab } from "./tabs/RegionalTab";
import { DataTab } from "./tabs/DataTab";
import { IssuesTab } from "./tabs/IssuesTab";

interface ReportDashboardProps {
  reportPage: ReportPage;
  setReportPage: (page: ReportPage) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  channelSummary: ChannelSummary[];
  dbRows: DiscountCodeData[];
  fileName: string | null;
  uniqueDbCodes: string[];
  rawPastedCodes: string[];
  missingCodes: string[];
  uniqueChannels: string[];
  portfolioHealth: PortfolioHealth | null;
  onApplyCorrections: (corrections: Record<string, string>) => void;
  onReset: () => void;
}

export function ReportDashboard(props: ReportDashboardProps): React.ReactElement {
  const {
    reportPage,
    setReportPage,
    setActiveTab,
    foundReports,
    summary,
    channelSummary,
    dbRows,
    fileName,
    uniqueDbCodes,
    rawPastedCodes,
    missingCodes,
    uniqueChannels,
    portfolioHealth,
    onApplyCorrections,
    onReset,
  } = props;

  const pages: { id: ReportPage; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "revenue", label: "Revenue" },
    { id: "regional", label: "Regional" },
    { id: "data", label: "Data" },
    {
      id: "issues",
      label: `Issues${missingCodes.length > 0 ? ` (${missingCodes.length})` : ""}`,
    },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col" id="report-dashboard">

      {/* Sticky page navigation */}
      <div className="shrink-0 bg-white border-b border-[#e5e5e5] px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setReportPage(page.id)}
            className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer ${
              reportPage === page.id
                ? "border-[#2b5346] text-[#2b5346]"
                : "border-transparent text-[#3d3d3d] hover:text-[#1a1a1a]"
            } ${page.id === "issues" ? "text-[#9b4a1c]" : ""}`}
            style={{ transition: "color 150ms var(--ease-out), border-color 150ms var(--ease-out)" }}
          >
            {page.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onReset}
          className="shrink-0 text-[11px] text-[#a1a1a1] hover:text-[#2b5346] font-medium flex items-center gap-1 cursor-pointer ml-2"
          style={{ transition: "color 150ms var(--ease-out)" }}
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">New dataset</span>
        </button>
      </div>

      {/* Page content — key= triggers fade on page change */}
      <div
        key={reportPage}
        className="flex-1 overflow-y-auto bg-[#f8f7f5]"
        style={{ animation: "fadeIn 180ms var(--ease-out)" }}
      >

        {reportPage === "overview" && (
          <OverviewTab
            foundReports={foundReports}
            summary={summary}
            fileName={fileName}
            dbRowCount={dbRows.length}
            portfolioHealth={portfolioHealth}
            onNavigate={setReportPage}
          />
        )}

        {reportPage === "performance" && (
          <PerformanceTab
            foundReports={foundReports}
            summary={summary}
            channelSummary={channelSummary}
          />
        )}

        {reportPage === "revenue" && (
          <RevenueTab
            summary={summary}
            foundReports={foundReports}
            channelSummary={channelSummary}
          />
        )}

        {reportPage === "regional" && (
          <RegionalTab
            dbRows={dbRows}
            foundReports={foundReports}
          />
        )}

        {reportPage === "data" && (
          <DataTab
            foundReports={foundReports}
            uniqueChannels={uniqueChannels}
            dbRows={dbRows}
            fileName={fileName}
            onSwitchToExplorer={() => setActiveTab("explorer")}
          />
        )}

        {reportPage === "issues" && (
          <IssuesTab
            missingCodes={missingCodes}
            uniqueDbCodes={uniqueDbCodes}
            rawPastedCodes={rawPastedCodes}
            foundReports={foundReports}
            onApplyCorrections={onApplyCorrections}
          />
        )}

        {/* Footer */}
        <footer
          id="saas-footer"
          className="text-[10px] text-[#a1a1a1] font-mono py-4 border-t border-[#e5e5e5] mt-auto flex items-center justify-between px-6 max-w-6xl mx-auto w-full"
        >
          <span>FreshPrep Campaign Intelligence · {new Date().getFullYear()}</span>
          <span>All analysis runs client-side. No data leaves your browser.</span>
        </footer>

      </div>
    </div>
  );
}
