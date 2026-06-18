/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { Upload, FileSpreadsheet, FileText, Download } from "lucide-react";
import { useFileUpload } from "./hooks/useFileUpload";
import { useAnalysis } from "./hooks/useAnalysis";
import { useReport } from "./hooks/useReport";
import { useCodeFormatting } from "./hooks/useCodeFormatting";
import { useCustomerFile } from "./hooks/useCustomerFile";
import { useCustomerData } from "./hooks/useCustomerData";
import { useStaticSignups } from "./hooks/useStaticSignups";
import { UploadFlow } from "./features/upload/UploadFlow";
import { WizardFlow } from "./features/wizard/WizardFlow";
import { ReportDashboard } from "./features/report/ReportDashboard";
import { PrintPreview } from "./features/report/PrintPreview";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App(): React.ReactElement {
  const fileUpload = useFileUpload();
  const formatting = useCodeFormatting();
  const analysis = useAnalysis(fileUpload.state.dbRows, fileUpload.state.uniqueDbCodes);
  const report = useReport({
    foundReports: analysis.state.reportResults.foundReports,
    missingCodes: analysis.state.reportResults.missingCodes,
    summary: analysis.state.reportResults.summary,
    hasReportGenerated: analysis.state.hasReportGenerated,
    eventName: analysis.state.eventName,
    eventDate: analysis.state.eventDate,
  });

  const customerFile = useCustomerFile();
  const staticSignups = useStaticSignups();

  const { foundReports, missingCodes, summary, channelSummary } = analysis.state.reportResults;
  const { hasReportGenerated, eventName, eventDate } = analysis.state;

  // Start loading static signup data as soon as the report is generated
  useEffect(() => {
    if (hasReportGenerated) staticSignups.load();
  }, [hasReportGenerated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Uploaded file takes precedence over static data
  const effectiveCustomerRows = customerFile.state.customerRows.length > 0
    ? customerFile.state.customerRows
    : staticSignups.rows;

  const customerData = useCustomerData(effectiveCustomerRows, analysis.state.rawPastedCodes);

  const handleResetWorkspace = (): void => {
    fileUpload.actions.reset();
    analysis.actions.reset();
    report.actions.reset();
  };

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
        {fileUpload.state.dbRows.length === 0 && (
          <UploadFlow state={fileUpload.state} actions={fileUpload.actions} />
        )}
        {fileUpload.state.dbRows.length > 0 && !hasReportGenerated && (
          <WizardFlow
            fileState={fileUpload.state}
            analysis={analysis}
            formatting={formatting}
            onReset={handleResetWorkspace}
          />
        )}
        {hasReportGenerated && foundReports.length === 0 && (
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
        {hasReportGenerated && foundReports.length > 0 && (
          <ErrorBoundary onReset={handleResetWorkspace}>
            <ReportDashboard
              reportPage={report.state.reportPage}
              setReportPage={report.actions.setReportPage}
              activeTab={report.state.activeTab}
              setActiveTab={report.actions.setActiveTab}
              foundReports={foundReports}
              summary={summary}
              channelSummary={channelSummary}
              dbRows={fileUpload.state.dbRows}
              fileName={fileUpload.state.fileName}
              uniqueDbCodes={fileUpload.state.uniqueDbCodes}
              rawPastedCodes={analysis.state.rawPastedCodes}
              missingCodes={missingCodes}
              uniqueChannels={analysis.state.uniqueChannels}
              portfolioHealth={analysis.state.portfolioHealth}
              selectedFlow={analysis.state.selectedFlow}
              editionLabels={analysis.state.editionLabels}
              customerData={customerData}
              customerFileName={customerFile.state.customerFileName}
              isLoadingCustomer={customerFile.state.isLoadingCustomer}
              onCustomerFile={customerFile.actions.processCustomerFile}
              onClearCustomer={customerFile.actions.resetCustomer}
              staticLoading={staticSignups.loading}
              staticError={staticSignups.error}
              userPersona={analysis.state.userPersona}
              eventName={eventName}
              eventDate={eventDate}
              onApplyCorrections={analysis.actions.applyCorrections}
              onBackToWizard={analysis.actions.backToWizard}
              onReset={handleResetWorkspace}
            />
          </ErrorBoundary>
        )}
      </main>

      <PrintPreview
        foundReports={foundReports}
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
