import React, { useEffect, useMemo, useState } from "react";
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
import { ComparisonTab } from "./tabs/ComparisonTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { FiscalTab } from "./tabs/FiscalTab";
import { CustomerUploadModal } from "./components/CustomerUploadModal";
import { CustomerDataResult } from "../../hooks/useCustomerData";
import { MetricInfo } from "../../components/MetricInfo";

const CHIP_PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
  NS: "#5a5a5a", NB: "#888",
};
const chipProvColor = (p: string) => CHIP_PROV_COLOR[p] ?? "#888";
const normalizeChannel = (channel: string | undefined): string =>
  (channel ?? "").replace(/[\s_-]/g, "").toLowerCase();

type ChannelScope = "events" | "bd" | "all";

function matchesChannelScope(
  channel: string | undefined,
  scope: ChannelScope,
  code?: string,
  evOverride?: boolean,
): boolean {
  if (scope === "all") return true;
  const normalized = normalizeChannel(channel);
  if (scope === "events") {
    if (normalized === "events") return true;
    if (evOverride && code?.toUpperCase().startsWith("EV")) return true;
    return false;
  }
  return normalized === "businessdevelopment";
}


function summarizeReports(reports: AnalyzedCodeReport[], numCodesMissing = 0): KPIReportSummary {
  const totalSignups = reports.reduce((sum, report) => sum + report.Signups, 0);
  const totalPayingCustomers = reports.reduce((sum, report) => sum + report["Paying cx"], 0);
  const totalLTV3 = reports.reduce((sum, report) => sum + report["Sum LTV 3"], 0);
  const totalLTV6 = reports.reduce((sum, report) => sum + report["Sum LTV 6"], 0);
  const totalLTV12 = reports.reduce((sum, report) => sum + report["Sum LTV 12"], 0);
  const topByConversion = [...reports].sort((a, b) => b.calculatedConversion - a.calculatedConversion)[0];
  const topByScore = [...reports].sort((a, b) => b.overallScore - a.overallScore)[0];

  return {
    totalSignups,
    totalPayingCustomers,
    blendedConversionRate: totalSignups > 0 ? (totalPayingCustomers / totalSignups) * 100 : 0,
    totalLTV3,
    totalLTV6,
    totalLTV12,
    averageLTV12: reports.length > 0
      ? reports.reduce((sum, report) => sum + report["Avg LTV 12"], 0) / reports.length
      : 0,
    averageConversionRate: reports.length > 0
      ? reports.reduce((sum, report) => sum + report.calculatedConversion, 0) / reports.length
      : 0,
    numCodesFound: reports.length,
    numCodesMissing,
    topPerformingCodeCode: topByConversion?.discount_code ?? "",
    topPerformingCodeVal: topByConversion?.calculatedConversion ?? 0,
    bestOverallScoreCode: topByScore?.discount_code ?? "",
    bestOverallScoreVal: topByScore?.overallScore ?? 0,
  };
}

function summarizeChannels(reports: AnalyzedCodeReport[]): ChannelSummary[] {
  const byChannel = new Map<string, AnalyzedCodeReport[]>();
  for (const report of reports) {
    const channel = report.channel || "Direct / Unknown";
    byChannel.set(channel, [...(byChannel.get(channel) ?? []), report]);
  }
  return [...byChannel.entries()]
    .map(([channel, items]) => {
      const totalSignups = items.reduce((sum, report) => sum + report.Signups, 0);
      const totalPayingCustomers = items.reduce((sum, report) => sum + report["Paying cx"], 0);
      return {
        channel,
        codeCount: items.length,
        totalSignups,
        totalPayingCustomers,
        averageConversion: items.length > 0
          ? items.reduce((sum, report) => sum + report.calculatedConversion, 0) / items.length
          : 0,
        totalDiscount: items.reduce((sum, report) => sum + report.total_discount_used, 0),
        totalLTV12: items.reduce((sum, report) => sum + report["Sum LTV 12"], 0),
      };
    })
    .sort((a, b) => b.totalSignups - a.totalSignups);
}

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
  onCompareFamily?: (codes: string[]) => void;
  codeSourceBreakdown?: { uploadedCodes: string[]; staticCodes: string[] } | null;
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
    onCompareFamily,
    codeSourceBreakdown,
  } = props;

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [activeProvince, setActiveProvince] = useState<string | null>(null);
  const [channelScope, setChannelScope] = useState<ChannelScope>("all");
  const [evOverride, setEvOverride] = useState(false);
  // Calendar-specific: EV codes count as Events by default; user can opt out with strict mode
  const [calEvStrict, setCalEvStrict] = useState(false);

  // True when there are EV-prefix codes not already classified as Events — only then is the toggle meaningful.
  // Checks both analyzed reports (LTV data) and raw event stats (signup DB used by Calendar tab).
  const hasEvNonEventCodes = useMemo(
    () =>
      foundReports.some(r =>
        (r.discount_code ?? "").toUpperCase().startsWith("EV") &&
        normalizeChannel(r.channel) !== "events",
      ) ||
      customerData.eventStats.some(e =>
        e.code.toUpperCase().startsWith("EV") &&
        normalizeChannel(e.channel) !== "events",
      ),
    [foundReports, customerData.eventStats],
  );

  const channelScopedFoundReports = useMemo(
    () => foundReports.filter(report => matchesChannelScope(report.channel, channelScope, report.discount_code ?? undefined, evOverride)),
    [foundReports, channelScope, evOverride],
  );

  const channelScopedDbRows = useMemo(
    () => dbRows.filter(row => matchesChannelScope(row.channel, channelScope, row.discount_code ?? undefined, evOverride)),
    [dbRows, channelScope, evOverride],
  );

  const channelScopedEventStats = useMemo(() => {
    if (channelScope === "all") return customerData.eventStats;
    if (channelScope === "events" && !calEvStrict) {
      // EV-prefix codes always count as Events by default (strict mode lets user revert)
      return customerData.eventStats.filter(stat =>
        stat.code.toUpperCase().startsWith("EV") ||
        matchesChannelScope(stat.channel, channelScope, stat.code, false),
      );
    }
    return customerData.eventStats.filter(stat => matchesChannelScope(stat.channel, channelScope, stat.code, evOverride));
  }, [customerData.eventStats, channelScope, calEvStrict, evOverride]);

  const scopedFoundReports = channelScopedFoundReports;
  const scopedDbRows = channelScopedDbRows;
  const scopedMissingCodes = missingCodes;
  const scopedRawPastedCodes = rawPastedCodes;
  const scopedEventStats = channelScopedEventStats;

  const scopedCustomerData = useMemo<CustomerDataResult>(() => {
    const provinces = Array.from(new Set(
      scopedEventStats.flatMap(stat => Object.keys(stat.signupsByProvince)),
    )).sort();
    return {
      ...customerData,
      eventStats: scopedEventStats,
      provinces,
      hasData: customerData.hasData && scopedEventStats.length > 0,
    };
  }, [customerData, scopedEventStats]);

  const scopedSummary = useMemo(
    () => channelScope !== "all"
      ? summarizeReports(scopedFoundReports, scopedMissingCodes.length)
      : summary,
    [channelScope, scopedFoundReports, scopedMissingCodes.length, summary],
  );

  const scopedChannelSummary = useMemo(
    () => channelScope !== "all"
      ? summarizeChannels(scopedFoundReports)
      : channelSummary,
    [channelScope, scopedFoundReports, channelSummary],
  );

  const scopedUniqueChannels = useMemo(
    () => Array.from(new Set(scopedFoundReports.map(report => report.channel || "Direct / Unknown"))).sort(),
    [scopedFoundReports],
  );

  const scopedUniqueDbCodes = uniqueDbCodes;
  const scopedBusinessDevelopmentCodes = businessDevelopmentCodes;

  const scopedPortfolioHealth = useMemo<PortfolioHealth | null>(() => {
    if (channelScope === "all") return portfolioHealth;
    if (scopedFoundReports.length === 0) return null;
    return scopedFoundReports.reduce<PortfolioHealth>((acc, report) => {
      acc.total += 1;
      if (report.calculatedConversion >= 40) acc.strong += 1;
      else if (report.calculatedConversion >= 20) acc.average += 1;
      else acc.weak += 1;
      return acc;
    }, { total: 0, strong: 0, average: 0, weak: 0 });
  }, [channelScope, portfolioHealth, scopedFoundReports]);

  const chipProvinces = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of scopedCustomerData.eventStats) {
      if (!e.homeProvince || e.homeProvince === "??") continue;
      counts[e.homeProvince] = (counts[e.homeProvince] ?? 0) + e.totalSignups;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);
  }, [scopedCustomerData.eventStats]);

  const dataThrough = useMemo(() => {
    const months = scopedCustomerData.eventStats.map(e => e.eventMonth).filter(Boolean);
    if (!months.length) return null;
    return months.reduce((a, b) => a > b ? a : b);
  }, [scopedCustomerData.eventStats]);

  const dataAgeMonths = useMemo(() => {
    if (!dataThrough) return 0;
    const [y, m] = dataThrough.split("-").map(Number);
    const now = new Date();
    return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  }, [dataThrough]);

  const dataThroughLabel = useMemo(() => {
    if (!dataThrough) return null;
    const ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const [y, m] = dataThrough.split("-").map(Number);
    return `${ABBR[m - 1]} ${y}`;
  }, [dataThrough]);

  const showProvinceChips =
    ["calendar", "fiscal", "regional"].includes(reportPage) &&
    chipProvinces.length > 0 &&
    !(reportPage === "regional" && selectedFlow === "all" && foundReports.length === 0);

  const showScopeControls =
    (foundReports.length > 0 || dbRows.length > 0 || customerData.eventStats.length > 0) &&
    !(fileName !== null && selectedFlow === "paste");

  const channelScopeLabel =
    channelScope === "events"
      ? "Events channel"
      : channelScope === "bd"
        ? "BusinessDevelopment channel"
        : "Events + BusinessDevelopment";

  const allPages: { id: ReportPage; label: string }[] = [
    { id: "comparison", label: "Comparison" },
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "revenue", label: "Revenue" },
    { id: "calendar", label: "Calendar" },
    { id: "fiscal",   label: "BD Fiscal" },
    { id: "regional", label: "Regional" },
    { id: "data", label: "All Codes" },
  ];

  const pages = allPages.filter(p => {
    const needsLooker = ["overview", "performance", "revenue", "data"].includes(p.id);
    if (needsLooker && foundReports.length === 0) return false;
    if (p.id === "comparison" && selectedFlow !== "compare") return false;
    if (p.id === "regional" && selectedFlow === "paste") return false;
    return true;
  });

  useEffect(() => {
    if (selectedFlow === "compare") {
      setReportPage("comparison");
    }
  }, [selectedFlow]);

  // Redirect to first visible page when current page is not in pages
  useEffect(() => {
    const visibleIds = new Set(pages.map(p => p.id));
    if (pages.length > 0 && !visibleIds.has(reportPage)) {
      setReportPage(pages[0].id);
    }
  }, [foundReports.length, selectedFlow, reportPage, setReportPage]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col" id="report-dashboard">

      {/* Sticky page navigation */}
      <div className="shrink-0 bg-white border-b border-[#e5e5e5] px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setReportPage(page.id)}
            className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 ${
              foundReports.length > 0 && page.id === "calendar"
                ? "border-l border-l-[#b9d3c8]"
                : foundReports.length > 0 && page.id === "fiscal"
                  ? "-ml-1"
                : ""
            } ${
              foundReports.length > 0 && ["calendar", "fiscal"].includes(page.id)
                ? reportPage === page.id
                  ? "bg-[#1a3d2f] border-[#e7bd27] text-white"
                  : "bg-[#2b5346] border-[#2b5346] text-white hover:bg-[#1f4739]"
                : reportPage === page.id
                  ? "border-[#2b5346] text-[#2b5346]"
                  : "border-transparent text-[#3d3d3d] hover:text-[#1a1a1a]"
            }`}
            style={{ transition: "color 150ms var(--ease-out), border-color 150ms var(--ease-out), background-color 150ms var(--ease-out)" }}
          >
            {page.label}
            {page.id === "data" && scopedMissingCodes.length > 0 && (
              <span className="min-w-[16px] h-4 px-1 bg-[#850b0b] text-white text-[8px] font-bold rounded-full flex items-center justify-center font-mono shrink-0">
                {scopedMissingCodes.length}
              </span>
            )}
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

      {/* Channel scope (Events / BD / All) — visible on all pages whenever there is data */}
      {showScopeControls && (
        <div className="shrink-0 px-4 py-2 bg-white border-b border-[#ececec]">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10.5px] font-semibold text-[#1a1a1a]">Channel scope</p>
              <p className="text-[9.5px] font-mono text-[#888] mt-0.5">
                {`Showing ${channelScopeLabel}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {codeSourceBreakdown && (
                <button
                  type="button"
                  onClick={() => setShowSourceModal(true)}
                  className="text-[9.5px] font-mono text-[#2b5346] underline decoration-[#2b5346]/30 underline-offset-2 hover:text-[#1a3d2f] cursor-pointer"
                >
                  {codeSourceBreakdown.uploadedCodes.length + codeSourceBreakdown.staticCodes.length} codes ·{" "}
                  {codeSourceBreakdown.staticCodes.length} from DB
                </button>
              )}
              <div className="flex items-center bg-[#f5f5f3] border border-[#e5e5e5] rounded-full p-0.5 select-none">
                {[
                  { id: "events" as const, label: "Events" },
                  { id: "bd" as const, label: "BD" },
                  { id: "all" as const, label: "All" },
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setChannelScope(option.id);
                      setActiveProvince(null);
                      if (option.id !== "events") { setEvOverride(false); setCalEvStrict(false); }
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-black cursor-pointer transition-colors ${
                      channelScope === option.id
                        ? "bg-[#2b5346] text-white"
                        : "text-[#888] hover:text-[#1a1a1a]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {channelScope === "events" && reportPage === "calendar" && (
            <div className="max-w-6xl mx-auto mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalEvStrict(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-mono font-semibold border transition-colors cursor-pointer ${
                  !calEvStrict
                    ? "bg-[#2b5346] text-white border-[#2b5346]"
                    : "bg-white text-[#888] border-[#e5e5e5] hover:border-[#aaa] hover:text-[#1a1a1a]"
                }`}
              >
                <span>{calEvStrict ? "EV-prefix: off" : "EV-prefix: on"}</span>
              </button>
              <span className="text-[9px] font-mono text-[#aaa] flex items-center gap-1">
                {calEvStrict ? "using strict channel tagging" : "treating all EV-prefix codes as Events"}
                <MetricInfo
                  side="bottom"
                  text="All codes starting with EV are counted as Events by default, regardless of how they were tagged in the database. Toggle off to use strict channel filtering instead (older codes tagged 'BD' will be excluded)."
                />
              </span>
            </div>
          )}
          {channelScope === "events" && reportPage !== "calendar" && hasEvNonEventCodes && (
            <div className="max-w-6xl mx-auto mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEvOverride(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-mono font-semibold border transition-colors cursor-pointer ${
                  evOverride
                    ? "bg-[#e7bd27] text-[#1a1a1a] border-[#e7bd27]"
                    : "bg-white text-[#888] border-[#e5e5e5] hover:border-[#aaa] hover:text-[#1a1a1a]"
                }`}
              >
                <span>{evOverride ? "EV-prefix: on" : "EV-prefix: off"}</span>
              </button>
              <span className="text-[9px] font-mono text-[#aaa] flex items-center gap-1">
                count all EV-prefix codes as Events
                <MetricInfo
                  side="bottom"
                  text="Codes from 2024 and earlier weren't always tagged 'Events' in the database — they may be excluded from Events scope. Toggle this on to include every code starting with EV, regardless of how it was tagged."
                />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Province chip — visible only on Calendar/Fiscal, plus Regional analysis views */}
      {showProvinceChips && (
        <div className="shrink-0 px-4 py-1.5 bg-white border-b border-[#ececec] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] shrink-0">Province</span>
          <button
            onClick={() => setActiveProvince(null)}
            className="shrink-0 text-[9px] font-mono px-2.5 py-1 rounded-full border transition-colors cursor-pointer"
            style={activeProvince === null
              ? { backgroundColor: "#2b5346", color: "white", borderColor: "#2b5346" }
              : { backgroundColor: "white", color: "#888", borderColor: "#e8e8e8" }}
          >
            All
          </button>
          {chipProvinces.map(p => (
            <button
              key={p}
              onClick={() => setActiveProvince(prev => prev === p ? null : p)}
              className="shrink-0 text-[9px] font-mono px-2.5 py-1 rounded-full border transition-colors cursor-pointer"
              style={activeProvince === p
                ? { backgroundColor: chipProvColor(p), color: "white", borderColor: chipProvColor(p) }
                : { backgroundColor: "white", color: chipProvColor(p), borderColor: "#e8e8e8" }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Data source bar — only relevant in BD-only mode (Calendar/Fiscal visible) */}
      {(foundReports.length === 0 || ["calendar", "fiscal"].includes(reportPage)) && <div className="shrink-0 px-4 py-2 bg-[#f8f7f5] border-b border-[#ececec]">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <Database className="w-3.5 h-3.5 shrink-0 text-[#a1a1a1]" />
          {customerFileName ? (
            <>
              <span className="text-[10.5px] font-semibold font-mono text-[#1a1a1a]">{customerFileName}</span>
              <span className="text-[8.5px] font-mono text-[#2b5346] bg-[#eef4f1] px-2 py-0.5 rounded-full">your data</span>
              {dataThroughLabel && (
                <span
                  className={`text-[8.5px] font-mono px-2 py-0.5 rounded-full shrink-0 border ${
                    dataAgeMonths > 3
                      ? "text-[#c9a000] bg-[#fffbeb] border-[#f5e09a]"
                      : "text-[#a1a1a1] bg-[#f5f5f3] border-[#e5e5e5]"
                  }`}
                >
                  data through {dataThroughLabel}
                  {dataAgeMonths > 3 ? " · consider uploading newer data" : ""}
                </span>
              )}
              <span className="text-[9px] font-mono text-[#a1a1a1]">
                View: {channelScopeLabel}
              </span>
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
              {dataThroughLabel && (
                <span
                  className={`text-[8.5px] font-mono px-2 py-0.5 rounded-full shrink-0 border ${
                    dataAgeMonths > 3
                      ? "text-[#c9a000] bg-[#fffbeb] border-[#f5e09a]"
                      : "text-[#a1a1a1] bg-[#f5f5f3] border-[#e5e5e5]"
                  }`}
                >
                  data through {dataThroughLabel}
                  {dataAgeMonths > 3 ? " · consider uploading newer data" : ""}
                </span>
              )}
              <span className="text-[9px] font-mono text-[#a1a1a1]">
                View: {channelScopeLabel}
              </span>
            </>
          )}
          {["calendar", "fiscal"].includes(reportPage) && (
            <span className="text-[9px] font-mono text-[#888]">
              Calendar and Fiscal use the Exportable Client List—a separate file from Client LTV.
            </span>
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
            foundReports={scopedFoundReports}
            summary={scopedSummary}
            customerData={scopedCustomerData}
            selectedFlow={selectedFlow}
            activeProvince={activeProvince}
            onProvinceChange={setActiveProvince}
          />
        )}

        {reportPage === "calendar" && (
          <CalendarTab
            customerData={scopedCustomerData}
            rawPastedCodes={scopedRawPastedCodes}
            foundReports={scopedFoundReports}
            selectedFlow={selectedFlow}
            staticLoading={staticLoading}
            staticError={staticError}
            customerFileName={customerFileName}
            isLoadingCustomer={isLoadingCustomer}
            onCustomerFile={onCustomerFile}
            onClearCustomer={onClearCustomer}
            activeProvince={activeProvince}
            onProvinceChange={setActiveProvince}
            onCompareFamily={onCompareFamily}
          />
        )}

        {reportPage === "comparison" && (
          <ComparisonTab
            foundReports={scopedFoundReports}
            editionLabels={editionLabels}
            rawPastedCodes={scopedRawPastedCodes}
            eventStats={scopedCustomerData.eventStats}
          />
        )}

        {reportPage === "overview" && (
          <OverviewTab
            foundReports={scopedFoundReports}
            summary={scopedSummary}
            fileName={fileName}
            dbRowCount={scopedDbRows.length}
            portfolioHealth={scopedPortfolioHealth}
            selectedFlow={selectedFlow}
            userPersona={userPersona}
            businessDevelopmentCodes={scopedBusinessDevelopmentCodes}
            eventName={eventName}
            eventDate={eventDate}
            onNavigate={setReportPage}
          />
        )}

        {reportPage === "performance" && (
          <PerformanceTab
            foundReports={scopedFoundReports}
            summary={scopedSummary}
            channelSummary={scopedChannelSummary}
          />
        )}

        {reportPage === "revenue" && (
          <RevenueTab
            summary={scopedSummary}
            foundReports={scopedFoundReports}
            channelSummary={scopedChannelSummary}
          />
        )}

        {reportPage === "regional" && (
          <RegionalTab
            dbRows={scopedDbRows}
            foundReports={scopedFoundReports}
            selectedFlow={selectedFlow}
            userPersona={userPersona}
            eventStats={scopedCustomerData.eventStats}
            onUploadLooker={foundReports.length === 0 ? (onResetToLookerUpload ?? onReset) : undefined}
            activeProvince={activeProvince}
            onNavigate={setReportPage}
            channelScope={channelScope}
          />
        )}

        {reportPage === "data" && (
          <DataTab
            foundReports={scopedFoundReports}
            uniqueChannels={scopedUniqueChannels}
            dbRows={scopedDbRows}
            fileName={fileName}
            selectedFlow={selectedFlow}
            onSwitchToExplorer={() => setActiveTab("explorer")}
            missingCodes={scopedMissingCodes}
            uniqueDbCodes={scopedUniqueDbCodes}
            rawPastedCodes={scopedRawPastedCodes}
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

      {/* Code source breakdown modal — full-DB upload mode only */}
      {showSourceModal && codeSourceBreakdown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setShowSourceModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#ececec] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Code data sources</p>
                <p className="text-[10px] font-mono text-[#888] mt-0.5">
                  {codeSourceBreakdown.uploadedCodes.length + codeSourceBreakdown.staticCodes.length} total codes · full database mode
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSourceModal(false)}
                className="text-[#aaa] hover:text-[#1a1a1a] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10.5px] font-semibold text-[#1a1a1a] uppercase tracking-wider">From your Client LTV upload</p>
                  <span className="text-[9.5px] font-mono bg-[#eef4f1] text-[#2b5346] px-2 py-0.5 rounded-full font-semibold">
                    {codeSourceBreakdown.uploadedCodes.length} codes
                  </span>
                </div>
                {codeSourceBreakdown.uploadedCodes.length === 0 ? (
                  <p className="text-[9.5px] font-mono text-[#aaa]">None</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {codeSourceBreakdown.uploadedCodes.map(code => (
                      <span key={code} className="text-[9px] font-mono px-2 py-0.5 bg-[#f5f5f3] border border-[#e5e5e5] rounded text-[#3d3d3d]">
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="h-px bg-[#ececec]" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10.5px] font-semibold text-[#1a1a1a] uppercase tracking-wider">From built-in BD database</p>
                  <span className="text-[9.5px] font-mono bg-[#fdf6e3] text-[#b8860b] px-2 py-0.5 rounded-full font-semibold">
                    {codeSourceBreakdown.staticCodes.length} codes
                  </span>
                </div>
                {codeSourceBreakdown.staticCodes.length === 0 ? (
                  <p className="text-[9.5px] font-mono text-[#aaa]">None — your file covered all BD codes</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {codeSourceBreakdown.staticCodes.map(code => (
                      <span key={code} className="text-[9px] font-mono px-2 py-0.5 bg-[#fdf6e3] border border-[#f0e0a0] rounded text-[#7a5f00]">
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
