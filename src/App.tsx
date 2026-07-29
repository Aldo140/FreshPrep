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
import { useCustomerData, deriveSyntheticEventStats } from "./hooks/useCustomerData";
import { useStaticSignups } from "./hooks/useStaticSignups";
import { UploadFlow } from "./features/upload/UploadFlow";

import { WizardFlow } from "./features/wizard/WizardFlow";
import { ReportDashboard } from "./features/report/ReportDashboard";
import { PrintPreview } from "./features/report/PrintPreview";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  aggregateBusinessDevelopmentRows,
  mergeBusinessDevelopmentFallbacks,
} from "./utils/bdFallback";
import { toCanonicalCode } from "./utils/fileParser";
import type { KPIReportSummary } from "./types";

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
    () => aggregateBusinessDevelopmentRows(staticSignups.rows),
    [staticSignups.rows],
  );
  const verifiedStaticBdCodeSet = useMemo(
    () => new Set(fallbackBusinessDevelopmentRows.map(row => toCanonicalCode(row.discount_code))),
    [fallbackBusinessDevelopmentRows],
  );

  // Dominant channel per canonical code derived from the static signup rows.
  // Used to restore the correct channel (Events vs BusinessDevelopment) when
  // a Looker export omits the channel column.
  const staticCodeChannelMap = useMemo(() => {
    const counts = new Map<string, Record<string, number>>();
    for (const row of staticSignups.rows) {
      const code = toCanonicalCode(row.discount_code ?? "");
      if (!code) continue;
      const ch = row.channel?.trim() || "BusinessDevelopment";
      if (!counts.has(code)) counts.set(code, {});
      const entry = counts.get(code)!;
      entry[ch] = (entry[ch] ?? 0) + 1;
    }
    const result = new Map<string, string>();
    for (const [code, entry] of counts) {
      const dominant = Object.entries(entry).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "BusinessDevelopment";
      result.set(code, dominant);
    }
    return result;
  }, [staticSignups.rows]);

  // Enrich channels on uploaded rows: Looker exports often omit channel, leaving
  // codes as "Direct / Unknown". Use the static BD registry to restore the correct
  // channel (Events or BusinessDevelopment) so scope filters work on all tabs.
  const enrichedUploadedRows = useMemo(() =>
    fileUpload.state.dbRows.map(row => {
      const ch = (row.channel ?? "").trim().toLowerCase();
      const isUnknown = ch === "" || ch === "direct / unknown" || ch === "unknown";
      const canonical = toCanonicalCode(row.discount_code ?? "");
      if (isUnknown) {
        if (verifiedStaticBdCodeSet.has(canonical)) {
          return { ...row, channel: staticCodeChannelMap.get(canonical) ?? "BusinessDevelopment" };
        }
        if (row.discount_code?.toUpperCase().startsWith("EV")) {
          return { ...row, channel: "Events" };
        }
      }
      return row;
    }),
    [fileUpload.state.dbRows, verifiedStaticBdCodeSet, staticCodeChannelMap],
  );

  const effectiveDbRows = useMemo(
    () => mergeBusinessDevelopmentFallbacks(
      enrichedUploadedRows,
      fallbackBusinessDevelopmentRows,
    ),
    [enrichedUploadedRows, fallbackBusinessDevelopmentRows],
  );

  // Uploaded Client LTV is the source of truth for Overview/Performance/Revenue.
  // Built-in fallback rows stay available for Calendar/Fiscal/Regional DB context,
  // but must not be added into financial report totals.
  const analysis = useAnalysis(enrichedUploadedRows, fileUpload.state.uniqueDbCodes);
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

  const handleBdOnly = () => { setBdOnlyMode(true); setBdConfig({ flow: "all", codes: [] }); };
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
    // Only merge static BD rows in full-DB mode; in paste/compare modes respect the user's selection exactly
    if (effectiveSelectedFlow !== "all") return uploaded;

    // Build a set of client_ids already in the user's file for deduplication
    const uploadedIds = new Set(uploaded.map(r => r.client_id).filter(id => id && id.length > 0));

    // Extract BD rows from static DB not already covered by the user's file
    const missingBdRows = staticSignups.rows.filter(r => {
      if (r.client_id && uploadedIds.has(r.client_id)) return false;
      const code = r.discount_code?.trim().toUpperCase();
      if (!code) return false;
      if (code.startsWith("EV")) return true;
      return verifiedStaticBdCodeSet.has(toCanonicalCode(code));
    });

    return [...uploaded, ...missingBdRows];
  }, [customerFile.state.customerRows, staticSignups.rows, verifiedStaticBdCodeSet, effectiveSelectedFlow]);

  const baseCustomerData = useCustomerData(effectiveCustomerRows, effectiveRawPastedCodes);

  // Codes uploaded via the 2026 Code Level Report format (monthly signup/paying counts,
  // no per-signup detail) don't exist in the built-in DB and so are invisible to Calendar/
  // Fiscal by default. Reconstruct degraded EventStats for those codes only — never for
  // codes the built-in/uploaded DB already covers in full detail — and merge them in.
  const customerData = useMemo(() => {
    const excludeCodes = new Set(baseCustomerData.eventStats.map(e => e.code.toUpperCase()));
    const synthetic = deriveSyntheticEventStats(
      fileUpload.state.monthlySignupStats,
      fileUpload.state.monthlyPayingStats,
      excludeCodes,
    );
    if (synthetic.length === 0) return baseCustomerData;

    const eventStats = [...baseCustomerData.eventStats, ...synthetic].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const provinces = Array.from(new Set([
      ...baseCustomerData.provinces,
      ...synthetic.flatMap(e => Object.keys(e.signupsByProvince)),
    ])).sort();
    return { ...baseCustomerData, eventStats, provinces, hasData: true };
  }, [baseCustomerData, fileUpload.state.monthlySignupStats, fileUpload.state.monthlyPayingStats]);

  const allStaticBdCodes = useMemo((): string[] =>
    Array.from(new Set(fallbackBusinessDevelopmentRows.map(row => row.discount_code))),
  [fallbackBusinessDevelopmentRows]);
  // BD codes that exist in the static DB but are absent from the uploaded Looker file.
  // These are real BD events — they just weren't in the user's Looker export date range.
  const staticOnlyBdCodes = useMemo(() => {
    const fileCodeSet = new Set(fileUpload.state.uniqueDbCodes.map(c => c.toUpperCase()));
    return allStaticBdCodes.filter(c => !fileCodeSet.has(c.toUpperCase()));
  }, [allStaticBdCodes, fileUpload.state.uniqueDbCodes]);

  // Globally restrict to BD-only codes. Looker exports commonly omit channel,
  // so the preloaded BD code registry is authoritative for known event codes.
  const isBdCode = useMemo(() => {
    return (code: string, channel: string, isStaticOnly?: boolean): boolean => {
      const upper = code.trim().toUpperCase();
      if (upper.startsWith("EV")) return true;
      if (isStaticOnly) return true;
      const normalizedChannel = channel.replace(/[\s_-]/g, "").toLowerCase();
      if (normalizedChannel === "businessdevelopment") return true;
      const channelIsUnknown =
        normalizedChannel === ""
        || normalizedChannel === "direct/unknown"
        || normalizedChannel === "unknown";
      return channelIsUnknown && verifiedStaticBdCodeSet.has(toCanonicalCode(code));
    };
  }, [verifiedStaticBdCodeSet]);

  // When the user uploads their own Client LTV and selects specific codes,
  // respect their selection exactly — don't restrict to EV-prefix / BD registry.
  // BD filtering only applies in built-in DB mode (bdOnlyMode) or when no file is uploaded.
  const userUploadedMode = !bdOnlyMode && fileUpload.state.dbRows.length > 0;

  // Breakdown of which event codes' signup data came from the user's Client LTV upload
  // vs which were merged in from the built-in BD database. Only relevant in full-DB mode.
  const codeSourceBreakdown = useMemo(() => {
    if (!userUploadedMode || effectiveSelectedFlow !== "all" || customerFile.state.customerRows.length === 0) return null;
    const uploadedCodeSet = new Set(
      customerFile.state.customerRows.map(r => r.discount_code).filter((c): c is string => Boolean(c)),
    );
    const uploadedCodes = Array.from(uploadedCodeSet).sort();
    const staticCodes = Array.from(
      new Set(
        effectiveCustomerRows
          .filter(r => r.discount_code && !uploadedCodeSet.has(r.discount_code))
          .map(r => r.discount_code!),
      ),
    ).sort();
    return { uploadedCodes, staticCodes };
  }, [userUploadedMode, effectiveSelectedFlow, customerFile.state.customerRows, effectiveCustomerRows]);

  const bdFilteredReports = useMemo(() => {
    if (userUploadedMode) return foundReports;
    return foundReports.filter(r => isBdCode(r.discount_code ?? "", r.channel ?? "", r.isStaticOnly));
  }, [foundReports, isBdCode, userUploadedMode]);

  // Recompute KPI summary from BD-filtered reports so Overview/Performance/Revenue KPIs
  // reflect only BD codes, not the full Looker portfolio.
  const bdFilteredSummary = useMemo((): KPIReportSummary => {
    if (userUploadedMode) return summary ?? (EMPTY_SUMMARY as unknown as KPIReportSummary);
    const reps = bdFilteredReports;
    if (reps.length === 0) return summary ?? (EMPTY_SUMMARY as unknown as KPIReportSummary);
    let totalSignups = 0, totalPayingCustomers = 0;
    let totalLTV3 = 0, totalLTV6 = 0, totalLTV12 = 0;
    let sumLTV12Vals = 0, sumConv = 0;
    let topConvCode = "", topConvVal = 0, topScoreCode = "", topScoreVal = 0;
    for (const r of reps) {
      totalSignups += r.Signups;
      totalPayingCustomers += r["Paying cx"];
      totalLTV3 += r["Sum LTV 3"] ?? 0;
      totalLTV6 += r["Sum LTV 6"] ?? 0;
      totalLTV12 += r["Sum LTV 12"] ?? 0;
      sumLTV12Vals += r["Avg LTV 12"] ?? 0;
      sumConv += r.calculatedConversion;
      if (r.calculatedConversion > topConvVal) { topConvVal = r.calculatedConversion; topConvCode = r.discount_code; }
      if ((r.overallScore ?? 0) > topScoreVal) { topScoreVal = r.overallScore ?? 0; topScoreCode = r.discount_code; }
    }
    return {
      totalSignups,
      totalPayingCustomers,
      blendedConversionRate: totalSignups > 0 ? (totalPayingCustomers / totalSignups) * 100 : 0,
      totalLTV3,
      totalLTV6,
      totalLTV12,
      averageLTV12: reps.length > 0 ? sumLTV12Vals / reps.length : 0,
      averageConversionRate: reps.length > 0 ? sumConv / reps.length : 0,
      numCodesFound: reps.length,
      numCodesMissing: missingCodes.length,
      topPerformingCodeCode: topConvCode,
      topPerformingCodeVal: topConvVal,
      bestOverallScoreCode: topScoreCode,
      bestOverallScoreVal: topScoreVal,
      hasLtvData: reps.some(r => (r["Sum LTV 12"] ?? 0) > 0 || (r["Avg LTV 12"] ?? 0) > 0),
    };
  }, [bdFilteredReports, missingCodes.length, summary, userUploadedMode]);

  // Filter raw Looker rows to BD-only for Regional/Calendar/DataExplorer.
  // In user-upload mode, respect their data as-is.
  const bdFilteredDbRows = useMemo(() => {
    if (userUploadedMode) return effectiveDbRows;
    return effectiveDbRows.filter(r => isBdCode(r.discount_code ?? "", r.channel ?? "", r.isStaticOnly));
  }, [effectiveDbRows, isBdCode, userUploadedMode]);

  const handleResetWorkspace = (openLooker = false): void => {
    fileUpload.actions.reset();
    analysis.actions.reset();
    report.actions.reset();
    setBdOnlyMode(false);
    setBdConfig(null);
    setWantLookerUpload(openLooker);
  };

  const showDashboard = (hasReportGenerated && foundReports.length > 0) || (bdOnlyMode && bdConfig !== null);

  return (
    <div
      id="saas-applet-root"
      className="flex flex-col w-full bg-[#f8f7f5] text-[#1a1a1a] overflow-hidden font-sans selection:bg-[#eef4f1] selection:text-[#2b5346]"
      style={{ height: "100vh", minHeight: "-webkit-fill-available" }}
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
              onClick={() => handleResetWorkspace()}
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

        {fileUpload.state.dbRows.length > 0 && !hasReportGenerated && !bdOnlyMode && (
          <WizardFlow
            fileState={fileUpload.state}
            analysis={analysis}
            formatting={formatting}
            onReset={handleResetWorkspace}
            staticBdCodes={allStaticBdCodes}
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
              foundReports={bdFilteredReports}
              summary={bdFilteredSummary}
              channelSummary={channelSummary}
              dbRows={bdFilteredDbRows}
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
              businessDevelopmentCodes={allStaticBdCodes}
              eventName={eventName}
              eventDate={eventDate}
              onApplyCorrections={analysis.actions.applyCorrections}
              onBackToWizard={bdOnlyMode ? () => handleResetWorkspace(false) : analysis.actions.backToWizard}
              onReset={handleResetWorkspace}
              onResetToLookerUpload={() => handleResetWorkspace(true)}
              onCompareFamily={bdOnlyMode ? (codes) => handleBdConfig("compare", codes) : undefined}
              codeSourceBreakdown={codeSourceBreakdown}
            />
          </ErrorBoundary>
        )}
      </main>

      <PrintPreview
        foundReports={bdFilteredReports}
        missingCodes={missingCodes}
        summary={bdFilteredSummary}
        fileName={fileUpload.state.fileName}
        eventName={eventName}
        eventDate={eventDate}
        isPrintPreview={report.state.isPrintPreview}
        onClose={() => report.actions.setIsPrintPreview(false)}
      />
    </div>
  );
}
