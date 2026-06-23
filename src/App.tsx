/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo } from "react";
import { Upload, FileSpreadsheet, FileText, Download } from "lucide-react";
import { useFileUpload } from "./hooks/useFileUpload";
import { useAnalysis } from "./hooks/useAnalysis";
import { useReport } from "./hooks/useReport";
import { useCodeFormatting } from "./hooks/useCodeFormatting";
import { useCustomerFile } from "./hooks/useCustomerFile";
import { useCustomerData } from "./hooks/useCustomerData";
import { useStaticSignups } from "./hooks/useStaticSignups";
import { UploadFlow } from "./features/upload/UploadFlow";
import { BdFlowPicker } from "./features/upload/BdFlowPicker";
import { WizardFlow } from "./features/wizard/WizardFlow";
import { ReportDashboard } from "./features/report/ReportDashboard";
import { PrintPreview } from "./features/report/PrintPreview";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  aggregateNonEvBusinessDevelopmentRows,
  mergeBusinessDevelopmentFallbacks,
} from "./utils/bdFallback";
import {
  calculatePerformanceRating,
  calculatePerformanceGrade,
  calculateOverallScore,
} from "./utils/fileParser";
import type { AnalyzedCodeReport } from "./types";

const EMPTY_SUMMARY = {
  totalSignups: 0, totalPayingCustomers: 0, blendedConversionRate: 0,
  averageConversionRate: 0, medianConversionRate: 0, totalLTV12: 0,
  averageLTV12: 0, topPerformers: [], underperformers: [],
} as const;

export default function App(): React.ReactElement {
  const fileUpload = useFileUpload();
  const formatting = useCodeFormatting();
  const customerFile = useCustomerFile();
  const staticSignups = useStaticSignups();

  const fallbackBusinessDevelopmentRows = useMemo(
    () => aggregateNonEvBusinessDevelopmentRows(staticSignups.rows),
    [staticSignups.rows],
  );

  const effectiveDbRows = useMemo(
    () => mergeBusinessDevelopmentFallbacks(
      fileUpload.state.dbRows,
      fallbackBusinessDevelopmentRows,
    ),
    [fileUpload.state.dbRows, fallbackBusinessDevelopmentRows],
  );

  // Fallback rows are lookup-only. The uploaded file remains the source of
  // truth for generic Full Dataset and Compare code lists.
  const analysis = useAnalysis(effectiveDbRows, fileUpload.state.uniqueDbCodes);
  const report = useReport({
    foundReports: analysis.state.reportResults.foundReports,
    missingCodes: analysis.state.reportResults.missingCodes,
    summary: analysis.state.reportResults.summary,
    hasReportGenerated: analysis.state.hasReportGenerated,
    eventName: analysis.state.eventName,
    eventDate: analysis.state.eventDate,
  });

  // BD-only mode: uses built-in DB, no Looker file required
  const [bdOnlyMode, setBdOnlyMode] = React.useState(false);
  const [bdConfig, setBdConfig] = React.useState<{ flow: "all" | "paste" | "compare"; codes: string[]; codesB?: string[] } | null>(null);
  const [wantLookerUpload, setWantLookerUpload] = React.useState(false);

  const { foundReports, missingCodes, summary, channelSummary } = analysis.state.reportResults;
  const { hasReportGenerated, eventName, eventDate } = analysis.state;

  useEffect(() => {
    staticSignups.load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBdOnly = () => setBdOnlyMode(true);
  const handleBdConfig = (flow: "all" | "paste" | "compare", codes: string[], codesB?: string[]) => setBdConfig({ flow, codes, codesB });

  const effectiveRawPastedCodes = bdOnlyMode
    ? [...(bdConfig?.codes ?? []), ...(bdConfig?.codesB ?? [])]
    : analysis.state.rawPastedCodes;
  const effectiveSelectedFlow = bdOnlyMode ? (bdConfig?.flow ?? "all") : analysis.state.selectedFlow;
  const bdEditionLabels: Record<string, string> = bdOnlyMode && bdConfig?.flow === "compare"
    ? {
        ...Object.fromEntries((bdConfig.codes).map(c => [c, "Edition A"])),
        ...Object.fromEntries((bdConfig.codesB ?? []).map(c => [c, "Edition B"])),
      }
    : {};

  // When user uploads their own CSV, merge static BD rows that aren't already present.
  // This ensures BD events identified by channel="businessdevelopment" (not EV-prefix) are
  // always captured even if the user's file lacks a channel column.
  const effectiveCustomerRows = useMemo(() => {
    const uploaded = customerFile.state.customerRows;
    if (uploaded.length === 0) return staticSignups.rows;

    // Build a set of client_ids already in the user's file for deduplication
    const uploadedIds = new Set(uploaded.map(r => r.client_id).filter(id => id && id.length > 0));

    // Extract BD rows from static DB not already covered by the user's file
    const missingBdRows = staticSignups.rows.filter(r => {
      if (r.client_id && uploadedIds.has(r.client_id)) return false;
      if (r.discount_code?.startsWith("EV")) return true;
      const ch = r.channel?.replace(/[\s_-]/g, "").toLowerCase() ?? "";
      return ch === "businessdevelopment" && r.discount_code !== null;
    });

    return [...uploaded, ...missingBdRows];
  }, [customerFile.state.customerRows, staticSignups.rows]);

  const customerData = useCustomerData(effectiveCustomerRows, effectiveRawPastedCodes);

  // All unique non-EV BD codes from the built-in static DB (channel=businessdevelopment).
  // Passed to WizardFlow so it can identify file codes that are BD even when the file
  // lacks a channel column.
  const staticNonEvBdCodes = useMemo((): string[] => {
    return fallbackBusinessDevelopmentRows.map(row => row.discount_code);
  }, [fallbackBusinessDevelopmentRows]);

  // BD codes that exist in the static DB but are absent from the uploaded Looker file.
  // These are real BD events — they just weren't in the user's Looker export date range.
  const staticOnlyBdCodes = useMemo(() => {
    const fileCodeSet = new Set(fileUpload.state.uniqueDbCodes.map(c => c.toUpperCase()));
    return staticNonEvBdCodes.filter(c => !fileCodeSet.has(c.toUpperCase()));
  }, [staticNonEvBdCodes, fileUpload.state.uniqueDbCodes]);

  // Synthetic AnalyzedCodeReport entries built from the static DB for static-only BD codes.
  // Only generated when a BD-filtered analysis has been run. LTV fields are 0 (unknown),
  // but signups and conversion are real — derived from the built-in signup records.
  // isStaticOnly=true lets any tab exclude them from LTV-based averages.
  const syntheticFoundReports = useMemo((): AnalyzedCodeReport[] => {
    if (!hasReportGenerated || foundReports.length === 0) return [];
    if (!analysis.state.bdFilter) return [];
    const staticOnlySet = new Set(staticOnlyBdCodes.map(c => c.toUpperCase()));
    return fallbackBusinessDevelopmentRows
      .filter(row => staticOnlySet.has(row.discount_code.toUpperCase()))
      .map(row => {
        const conv = row.Signups > 0 ? (row["Paying cx"] / row.Signups) * 100 : 0;
        const { score, badge } = calculateOverallScore(conv, 0, row.Signups, 0, false);
        return {
          ...row,
          Province: row.Province || "?",
          calculatedConversion: conv,
          performanceRating: calculatePerformanceRating(conv),
          efficiencyRatio: 0,
          overallScore: score,
          performanceGrade: calculatePerformanceGrade(conv),
          overallScoreBadge: badge,
          isStaticOnly: true,
        };
      });
  }, [hasReportGenerated, foundReports.length, analysis.state.bdFilter, fallbackBusinessDevelopmentRows, staticOnlyBdCodes]);

  // Merge Looker-based reports with synthetic built-in BD entries.
  // Summary KPIs are intentionally left unchanged (synthetic codes contribute no LTV).
  const augmentedFoundReports = useMemo(
    () => [...foundReports, ...syntheticFoundReports],
    [foundReports, syntheticFoundReports],
  );

  const handleResetWorkspace = (openLooker = false): void => {
    fileUpload.actions.reset();
    analysis.actions.reset();
    report.actions.reset();
    setBdOnlyMode(false);
    setBdConfig(null);
    setWantLookerUpload(openLooker);
  };

  const showBdPicker = bdOnlyMode && bdConfig === null;
  const showDashboard = (hasReportGenerated && foundReports.length > 0) || (bdOnlyMode && bdConfig !== null);

  return (
    <div
      id="saas-applet-root"
      className="flex flex-col h-screen w-full bg-[#f8f7f5] text-[#1a1a1a] overflow-hidden font-sans selection:bg-[#eef4f1] selection:text-[#2b5346]"
    >
      <header
        id="app-global-nav"
        className="h-14 bg-[#2b5346] flex items-center justify-between px-6 sm:px-8 shrink-0 z-40"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
            alt="FreshPrep"
            className="h-6 w-auto shrink-0"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <div className="hidden sm:block w-px h-4 bg-white/25 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xs font-medium text-white/80 tracking-widest uppercase font-mono leading-none">
              Campaign Intelligence
            </h1>
            {fileUpload.state.fileName && (
              <p className="text-xs text-white/50 font-mono leading-none mt-0.5 truncate max-w-[280px]">
                {fileUpload.state.fileName} · {fileUpload.state.dbRows.length.toLocaleString()} records
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fileUpload.state.dbRows.length > 0 && (
            <button
              onClick={handleResetWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
              style={{ transition: "background-color 150ms var(--ease-out)" }}
              title="Upload a different dataset"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">New Dataset</span>
            </button>
          )}
          {hasReportGenerated && foundReports.length > 0 && (
            <>
              <button
                onClick={report.actions.exportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-[#2b5346] hover:bg-white/90 cursor-pointer"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
              <button
                onClick={() => report.actions.setIsPrintPreview(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={report.actions.exportCsv}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>CSV</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0" id="analysis-main-viewport">
        {fileUpload.state.dbRows.length === 0 && !bdOnlyMode && (
          <UploadFlow
            state={fileUpload.state}
            actions={fileUpload.actions}
            onBdOnly={handleBdOnly}
            autoOpenLooker={wantLookerUpload}
          />
        )}
        {showBdPicker && (
          <BdFlowPicker onConfirm={handleBdConfig} onBack={handleResetWorkspace} />
        )}
        {fileUpload.state.dbRows.length > 0 && !hasReportGenerated && !bdOnlyMode && (
          <WizardFlow
            fileState={fileUpload.state}
            analysis={analysis}
            formatting={formatting}
            onReset={handleResetWorkspace}
            staticNonEvBdCodes={staticNonEvBdCodes}
          />
        )}
        {hasReportGenerated && !bdOnlyMode && foundReports.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-8 max-w-sm w-full shadow-sm text-center">
              <p className="text-sm font-semibold text-[#1a1a1a] mb-1">No codes matched</p>
              <p className="text-xs text-[#3d3d3d] leading-relaxed mb-5">
                None of the codes you entered were found in the uploaded file. Check your date range in Looker Studios or try different codes.
              </p>
              <button
                onClick={analysis.actions.reset}
                className="px-4 py-2 bg-[#2b5346] text-white text-xs font-medium rounded-lg hover:bg-[#0d3a2f] cursor-pointer"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              >
                Try different codes
              </button>
            </div>
          </div>
        )}
        {showDashboard && (
          <ErrorBoundary onReset={handleResetWorkspace}>
            <ReportDashboard
              reportPage={report.state.reportPage}
              setReportPage={report.actions.setReportPage}
              activeTab={report.state.activeTab}
              setActiveTab={report.actions.setActiveTab}
              foundReports={augmentedFoundReports}
              summary={summary ?? EMPTY_SUMMARY}
              channelSummary={channelSummary}
              dbRows={fileUpload.state.dbRows}
              fileName={fileUpload.state.fileName}
              uniqueDbCodes={fileUpload.state.uniqueDbCodes}
              rawPastedCodes={effectiveRawPastedCodes}
              missingCodes={missingCodes}
              uniqueChannels={analysis.state.uniqueChannels}
              portfolioHealth={analysis.state.portfolioHealth}
              selectedFlow={effectiveSelectedFlow}
              editionLabels={bdOnlyMode && bdConfig?.flow === "compare" ? bdEditionLabels : analysis.state.editionLabels}
              customerData={customerData}
              customerFileName={customerFile.state.customerFileName}
              isLoadingCustomer={customerFile.state.isLoadingCustomer}
              onCustomerFile={customerFile.actions.processCustomerFile}
              onClearCustomer={customerFile.actions.resetCustomer}
              staticLoading={staticSignups.loading}
              staticError={staticSignups.error}
              userPersona={bdOnlyMode && !hasReportGenerated ? "bd-lead" : analysis.state.userPersona}
              businessDevelopmentCodes={staticNonEvBdCodes}
              eventName={eventName}
              eventDate={eventDate}
              onApplyCorrections={analysis.actions.applyCorrections}
              onBackToWizard={bdOnlyMode ? () => setBdConfig(null) : analysis.actions.backToWizard}
              onReset={handleResetWorkspace}
              onResetToLookerUpload={() => handleResetWorkspace(true)}
              onCompareFamily={bdOnlyMode ? (codes) => handleBdConfig("compare", codes) : undefined}
            />
          </ErrorBoundary>
        )}
      </main>

      <PrintPreview
        foundReports={augmentedFoundReports}
        missingCodes={missingCodes}
        summary={summary}
        fileName={fileUpload.state.fileName}
        eventName={eventName}
        eventDate={eventDate}
        isPrintPreview={report.state.isPrintPreview}
        onClose={() => report.actions.setIsPrintPreview(false)}
      />
    </div>
  );
}
