import React, { useEffect, useState } from "react";
import {
  ReportPage,
  ActiveTab,
  AnalysisFlow,
  UserPersona,
  AnalyzedCodeReport,
  KPIReportSummary,
  ChannelSummary,
  DiscountCodeData,
} from "../../types";
import { PortfolioHealth } from "../../hooks/useAnalysis";
import { TAB_RELEVANCE } from "../../config/flowRelevance";
import { RefreshCw, ArrowLeft, Database, Upload, X } from "lucide-react";
import { OverviewTab } from "./tabs/OverviewTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { RegionalTab } from "./tabs/RegionalTab";
import { DataTab } from "./tabs/DataTab";
import { IssuesTab } from "./tabs/IssuesTab";
import { ComparisonTab } from "./tabs/ComparisonTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { FiscalTab } from "./tabs/FiscalTab";
import { CustomerUploadModal } from "./components/CustomerUploadModal";
import { CustomerDataResult } from "../../hooks/useCustomerData";

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
  editionLabels: Record<string, string>;
  customerData: CustomerDataResult;
  customerFileName: string | null;
  isLoadingCustomer: boolean;
  onCustomerFile: (file: File) => void;
  onClearCustomer: () => void;
  staticLoading: boolean;
  staticError: string | null;
  missingCodes: string[];
  uniqueChannels: string[];
  portfolioHealth: PortfolioHealth | null;
  selectedFlow: AnalysisFlow;
  userPersona: UserPersona;
  businessDevelopmentCodes: string[];
  eventName: string;
  eventDate: string;
  onApplyCorrections: (corrections: Record<string, string>) => void;
  onBackToWizard: () => void;
  onReset: () => void;
  onResetToLookerUpload?: () => void;
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
    editionLabels,
    customerData,
    customerFileName,
    isLoadingCustomer,
    onCustomerFile,
    onClearCustomer,
    staticLoading,
    staticError,
    missingCodes,
    uniqueChannels,
    portfolioHealth,
    selectedFlow,
    userPersona,
    businessDevelopmentCodes,
    eventName,
    eventDate,
    onApplyCorrections,
    onBackToWizard,
    onReset,
    onResetToLookerUpload,
  } = props;

  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const allPages: { id: ReportPage; label: string }[] = [
    { id: "comparison", label: "Comparison" },
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "revenue", label: "Revenue" },
    { id: "regional", label: "Regional" },
    { id: "data", label: "Data" },
    {
      id: "issues",
      label: `Issues${missingCodes.length > 0 ? ` (${missingCodes.length})` : ""}`,
    },
    { id: "calendar", label: "Calendar" },
    { id: "fiscal",   label: "Fiscal" },
  ];

  const pages = allPages.filter(p => {
    const needsLooker = ["overview", "performance", "revenue", "data", "issues"].includes(p.id);
    if (needsLooker && foundReports.length === 0) return false;
    if (p.id === "regional" && (userPersona === "bd-rep" || userPersona === "analyst")) return false;
    if (p.id === "comparison" && selectedFlow !== "compare") return false;
    if (p.id === "calendar" && selectedFlow === "compare") return false;
    if (p.id === "fiscal"   && selectedFlow === "compare") return false;
    // Calendar/Fiscal belong to the built-in BD events DB view only.
    // Once a Looker file is uploaded those tabs are redundant — hide them.
    if ((p.id === "calendar" || p.id === "fiscal") && foundReports.length > 0) return false;
    return true;
  });

  // In BD-only mode (no foundReports), default to calendar
  useEffect(() => {
    if (foundReports.length === 0 && !["calendar", "fiscal", "regional"].includes(reportPage)) {
      setReportPage("calendar");
    }
  }, [foundReports.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reportPage === "regional" && (userPersona === "bd-rep" || userPersona === "analyst")) {
      setReportPage("overview");
    }
  }, [userPersona, reportPage, setReportPage]);

  useEffect(() => {
    if (selectedFlow === "compare") {
      setReportPage("comparison");
    }
  }, [selectedFlow]);

  // Redirect away from Calendar/Fiscal when a Looker file is uploaded
  useEffect(() => {
    if (foundReports.length > 0 && (reportPage === "calendar" || reportPage === "fiscal")) {
      setReportPage("overview");
    }
  }, [foundReports.length, reportPage, setReportPage]);

  // Redirect away from comparison page when not in compare flow
  useEffect(() => {
    if (reportPage === "comparison" && selectedFlow !== "compare") {
      setReportPage("overview");
    }
  }, [reportPage, selectedFlow, setReportPage]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col" id="report-dashboard">

      {/* Sticky page navigation */}
      <div className="shrink-0 bg-white border-b border-[#e5e5e5] px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setReportPage(page.id)}
            className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 ${
              reportPage === page.id
                ? "border-[#2b5346] text-[#2b5346]"
                : "border-transparent text-[#3d3d3d] hover:text-[#1a1a1a]"
            } ${page.id === "issues" ? "text-[#9b4a1c]" : ""}`}
            style={{ transition: "color 150ms var(--ease-out), border-color 150ms var(--ease-out)" }}
          >
            {page.label}
            {TAB_RELEVANCE[page.id][selectedFlow] === "partial" && (
              <span className="text-[9px] font-mono text-[#a1a1a1] bg-[#f8f7f5] border border-[#e5e5e5] px-1.5 py-0.5 rounded">
                partial
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onBackToWizard}
          className="shrink-0 text-[11px] text-[#2b5346] font-semibold flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-md hover:bg-[#eef4f1]"
          style={{ transition: "background-color 150ms var(--ease-out)" }}
          title="Go back and change codes or settings"
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="hidden sm:inline">Edit analysis</span>
        </button>
        <div className="w-px h-4 bg-[#e5e5e5] mx-1 shrink-0" />
        <button
          onClick={onReset}
          className="shrink-0 text-[11px] text-[#a1a1a1] hover:text-[#1a1a1a] font-medium flex items-center gap-1 cursor-pointer ml-1"
          style={{ transition: "color 150ms var(--ease-out)" }}
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">New dataset</span>
        </button>
      </div>

      {/* Data source bar — only relevant in BD-only mode (Calendar/Fiscal visible) */}
      {foundReports.length === 0 && <div className="shrink-0 px-4 py-2 bg-[#f8f7f5] border-b border-[#ececec]">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <Database className="w-3.5 h-3.5 shrink-0 text-[#a1a1a1]" />
          {customerFileName ? (
            <>
              <span className="text-[10.5px] font-semibold font-mono text-[#1a1a1a]">{customerFileName}</span>
              <span className="text-[8.5px] font-mono text-[#2b5346] bg-[#eef4f1] px-2 py-0.5 rounded-full">your data</span>
              <span className="text-[9px] font-mono text-[#a1a1a1]">BD events: EV-prefix + BusinessDevelopment channel</span>
              <button
                onClick={onClearCustomer}
                className="ml-1 text-[9px] font-mono text-[#a1a1a1] hover:text-[#850b0b] cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Revert to built-in
              </button>
            </>
          ) : (
            <>
              <span className="text-[10.5px] font-mono text-[#3d3d3d]">Built-in BD Events DB</span>
              <span className="text-[8.5px] font-mono text-[#c9a000] bg-[#fffbeb] border border-[#f5e09a] px-2 py-0.5 rounded-full shrink-0">
                Jul 2024 – Jun 19, 2026
              </span>
              <span className="text-[9px] font-mono text-[#a1a1a1]">
                Events after Jun 19 won't appear — upload a fresh export to get current data
              </span>
            </>
          )}
          <button
            onClick={() => setShowCustomerModal(true)}
            className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all bg-white text-[#2b5346] border-[#d0e8e2] hover:bg-[#eef4f1]"
          >
            <Upload className="w-3 h-3" />
            {customerFileName ? "Change data file" : "Upload newer data"}
          </button>
        </div>
      </div>}

      {/* Page content — key= triggers fade on page change */}
      <div
        key={reportPage}
        className="flex-1 overflow-y-auto bg-[#f8f7f5]"
        style={{ animation: "fadeIn 180ms var(--ease-out)" }}
      >

        {reportPage === "fiscal" && (
          <FiscalTab
            foundReports={foundReports}
            summary={summary}
            customerData={customerData}
            selectedFlow={selectedFlow}
          />
        )}

        {reportPage === "calendar" && (
          <CalendarTab
            customerData={customerData}
            rawPastedCodes={rawPastedCodes}
            foundReports={foundReports}
            selectedFlow={selectedFlow}
            staticLoading={staticLoading}
            staticError={staticError}
            customerFileName={customerFileName}
            isLoadingCustomer={isLoadingCustomer}
            onCustomerFile={onCustomerFile}
            onClearCustomer={onClearCustomer}
          />
        )}

        {reportPage === "comparison" && (
          <ComparisonTab
            foundReports={foundReports}
            editionLabels={editionLabels}
            rawPastedCodes={rawPastedCodes}
            eventStats={customerData.eventStats}
          />
        )}

        {reportPage === "overview" && (
          <OverviewTab
            foundReports={foundReports}
            summary={summary}
            fileName={fileName}
            dbRowCount={dbRows.length}
            portfolioHealth={portfolioHealth}
            selectedFlow={selectedFlow}
            userPersona={userPersona}
            businessDevelopmentCodes={businessDevelopmentCodes}
            eventName={eventName}
            eventDate={eventDate}
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
            selectedFlow={selectedFlow}
            userPersona={userPersona}
            eventStats={customerData.eventStats}
            onUploadLooker={foundReports.length === 0 ? (onResetToLookerUpload ?? onReset) : undefined}
          />
        )}

        {reportPage === "data" && (
          <DataTab
            foundReports={foundReports}
            uniqueChannels={uniqueChannels}
            dbRows={dbRows}
            fileName={fileName}
            selectedFlow={selectedFlow}
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

      <CustomerUploadModal
        isOpen={showCustomerModal}
        isLoading={isLoadingCustomer}
        onClose={() => setShowCustomerModal(false)}
        onFile={file => { onCustomerFile(file); setShowCustomerModal(false); }}
      />
    </div>
  );
}
