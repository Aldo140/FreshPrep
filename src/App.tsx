/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  BarChart3, 
  RefreshCw, 
  FileText, 
  Download, 
  FileSpreadsheet,
  Upload,
  Clipboard,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingUp,
  Search,
  Database,
  Users,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Sliders,
  Scale
} from "lucide-react";

// Parsing utilities
import {
  generateAnalysisReport,
  exportToExcelFile,
  exportToCSVFile,
  parsePastedCodes,
} from "./utils/fileParser";

// Components
import DashboardMetrics from "./components/DashboardMetrics";
import PerformanceChart from "./components/PerformanceChart";
import DetailedTable from "./components/DetailedTable";
import DataExplorer from "./components/DataExplorer";
import KeyFindingsSection from "./components/KeyFindingsSection";
import PortfolioSummaryWidget from "./components/PortfolioSummaryWidget";
import ProvinceIntelligence from "./components/ProvinceIntelligence";
import MissingCodesSection from "./components/MissingCodesSection";
import { MetricTooltip } from "./components/DesignSystem";
import { useFileUpload } from "./hooks/useFileUpload";
import { UploadFlow } from "./features/upload/UploadFlow";

export default function App() {
  // Upload flow hook (powers the UploadFlow component)
  const fileUpload = useFileUpload();

  // Reporting States
  const [activeTab, setActiveTab2] = useState<"report" | "explorer">("report");
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasReportGenerated, setHasReportGenerated] = useState(false);
  const [reportPage, setReportPage] = useState<"overview"|"performance"|"revenue"|"regional"|"data"|"issues">("overview");

  // Wizard Selection Logic for Options 1, 2, or 3
  const [selectedFlow, setSelectedFlow] = useState<"paste" | "all" | "compare">("paste");

  // Flow inputs
  const [inputText, setInputText] = useState("");
  const [compareSearch, setCompareSearch] = useState("");
  const [selectedCompareCodes, setSelectedCompareCodes] = useState<string[]>([]);
  const [eraseKeyword, setEraseKeyword] = useState("");

  // Text cleaner/formatting actions
  const handleFormatCleanEmpty = () => {
    const lines = inputText.split("\n");
    const cleaned = lines.filter(line => line.trim().length > 0);
    setInputText(cleaned.join("\n"));
  };

  const handleFormatStripComments = () => {
    const lines = inputText.split("\n");
    const cleaned = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith("#") && 
             !trimmed.startsWith("//") && 
             !trimmed.startsWith("--") && 
             !trimmed.startsWith("/*");
    });
    setInputText(cleaned.join("\n"));
  };

  const handleFormatUppercase = () => {
    setInputText(inputText.toUpperCase());
  };

  const handleEraseLinesContaining = () => {
    if (!eraseKeyword.trim()) return;
    const lines = inputText.split("\n");
    const query = eraseKeyword.trim().toUpperCase();
    const cleaned = lines.filter(line => !line.toUpperCase().includes(query));
    setInputText(cleaned.join("\n"));
    setEraseKeyword("");
  };

  const handleFormatAlphaSort = () => {
    const lines = inputText.split("\n").filter(l => l.trim().length > 0);
    lines.sort((a, b) => a.localeCompare(b));
    setInputText(lines.join("\n"));
  };

  // 1. Unique codes available inside the uploaded spreadsheet (from hook)
  const uniqueDbCodes = fileUpload.state.uniqueDbCodes;

  // Derived filtered compare list
  const filteredCompareCodes = useMemo(() => {
    const query = compareSearch.trim().toUpperCase();
    if (!query) return uniqueDbCodes.slice(0, 80); // limit to a practical view list
    return uniqueDbCodes.filter(c => c.includes(query));
  }, [uniqueDbCodes, compareSearch]);

  // Clean pasted/input state whenever requested
  const normalizedPastedCodes = useMemo(() => {
    return parsePastedCodes(inputText);
  }, [inputText]);

  // Active compiled analysis reports
  const [rawPastedCodes, setRawPastedCodes] = useState<string[]>([]);

  const reportResults = useMemo(() => {
    return generateAnalysisReport(fileUpload.state.dbRows, rawPastedCodes);
  }, [fileUpload.state.dbRows, rawPastedCodes]);

  const { foundReports, missingCodes, summary, channelSummary } = reportResults;

  // Extract all unique channels from matched list for sub-breakdowns
  const uniqueChannels = useMemo(() => {
    const list = foundReports.map(item => item.channel);
    return Array.from(new Set(list))
      .filter((c): c is string => typeof c === "string" && c.length > 0)
      .sort();
  }, [foundReports]);

  // Compile Report Trigger Actions
  const handleCompileSpecificCodes = () => {
    if (normalizedPastedCodes.length === 0) {
      alert("Please enter or paste at least one discount code to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setRawPastedCodes(normalizedPastedCodes);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasReportGenerated(true);
      setActiveTab2("report");
    }, 450);
  };

  const handleCompilePortfolio = () => {
    if (uniqueDbCodes.length === 0) return;
    setIsAnalyzing(true);
    setRawPastedCodes(uniqueDbCodes);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasReportGenerated(true);
      setActiveTab2("report");
    }, 450);
  };

  const handleCompileComparison = () => {
    if (selectedCompareCodes.length < 2) {
      alert("Please select at least 2 distinct promo codes to compare side-by-side.");
      return;
    }
    setIsAnalyzing(true);
    setRawPastedCodes(selectedCompareCodes);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasReportGenerated(true);
      setActiveTab2("report");
    }, 450);
  };

  // State Resets
  const handleResetWorkspace = () => {
    fileUpload.actions.reset();
    setHasReportGenerated(false);
    setRawPastedCodes([]);
    setInputText("");
    setSelectedCompareCodes([]);
    setCompareSearch("");
    setReportPage("overview");
  };

  const handleToggleCompareCode = (code: string) => {
    if (selectedCompareCodes.includes(code)) {
      setSelectedCompareCodes(selectedCompareCodes.filter(c => c !== code));
    } else {
      setSelectedCompareCodes([...selectedCompareCodes, code]);
    }
  };

  const handleSelectAllCompare = () => {
    setSelectedCompareCodes(uniqueDbCodes);
  };

  const handleSelectNoneCompare = () => {
    setSelectedCompareCodes([]);
  };

  // Export handlers
  const handleExportToExcel = () => {
    if (!hasReportGenerated || foundReports.length === 0) return;
    exportToExcelFile(summary, foundReports, missingCodes);
  };

  const handleExportToCSV = () => {
    if (!hasReportGenerated || foundReports.length === 0) return;
    exportToCSVFile(foundReports);
  };

  // Calculate Portfolio Health counts dynamically
  const portfolioHealth = useMemo(() => {
    if (!hasReportGenerated || foundReports.length === 0) return null;
    const total = foundReports.length;
    const strong = foundReports.filter(r => r.calculatedConversion >= 40).length;
    const average = foundReports.filter(r => r.calculatedConversion >= 20 && r.calculatedConversion < 40).length;
    const weak = foundReports.filter(r => r.calculatedConversion < 20).length;
    return { total, strong, average, weak };
  }, [foundReports, hasReportGenerated]);

  return (
    <div id="saas-applet-root" className="flex flex-col h-screen w-full bg-[#f8f7f5] text-[#1a1a1a] overflow-hidden font-sans selection:bg-[#eef4f1] selection:text-[#2b5346]">
      
      {/* Premium Research-Grade Header */}
      <header
        id="app-global-nav"
        className="h-14 bg-[#2b5346] flex items-center justify-between px-6 sm:px-8 shrink-0 z-40"
      >
        {/* Wordmark */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
            alt="FreshPrep"
            className="h-6 w-auto shrink-0"
            style={{ filter: 'brightness(0) invert(1)' }}
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

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {fileUpload.state.dbRows.length > 0 && (
            <button
              id="reset-workspace-top-btn"
              onClick={handleResetWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
              style={{ transition: 'background-color 150ms var(--ease-out)' }}
              title="Upload a different dataset"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">New Dataset</span>
            </button>
          )}

          {hasReportGenerated && foundReports.length > 0 && (
            <>
              <button
                id="export-xlsx-btn"
                onClick={handleExportToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-[#2b5346] hover:bg-white/90 cursor-pointer"
                style={{ transition: 'background-color 150ms var(--ease-out), transform 100ms var(--ease-out)' }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>

              <button
                id="export-pdf-btn"
                onClick={() => setIsPrintPreview(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                style={{ transition: 'background-color 150ms var(--ease-out)' }}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                id="export-csv-btn"
                onClick={handleExportToCSV}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                style={{ transition: 'background-color 150ms var(--ease-out)' }}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>CSV</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Container Core Router */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0" id="analysis-main-viewport">
        
        {/* LAUNCH STATE: Asymmetric split layout */}
        {fileUpload.state.dbRows.length === 0 ? (
          <UploadFlow state={fileUpload.state} actions={fileUpload.actions} />
        ) : !hasReportGenerated ? (
          
          /* VALIDATED STATE AND WIZARD FLOW SELECTOR */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8f7f5] flex flex-col items-center gap-4 sm:gap-6" id="wizard-screen">
            
            {/* Validation card */}
            <div className="w-full max-w-4xl bg-white border border-[#e5e5e5] rounded-xl shadow-sm overflow-hidden" style={{ opacity: 0, animation: 'slideUp 200ms var(--ease-out) forwards' }}>

              {/* File info bar */}
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#f8f7f5]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#eef4f1] flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-[#2b5346]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1a1a1a] truncate">{fileUpload.state.fileName}</p>
                    <p className="text-xs text-[#a1a1a1] font-mono">{fileUpload.state.dbRows.length.toLocaleString()} records loaded</p>
                  </div>
                </div>
                <button
                  onClick={handleResetWorkspace}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-[#3d3d3d] hover:text-[#1a1a1a] cursor-pointer font-medium"
                  style={{ transition: 'color 150ms var(--ease-out)' }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Replace
                </button>
              </div>

              {/* Status banner */}
              {fileUpload.state.fileValidation?.isValid ? (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-[#eef4f1]">
                  <CheckCircle2 className="w-4 h-4 text-[#2b5346] shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-[#2b5346]">File structure valid</span>
                    <span className="text-xs text-[#3d3d3d] ml-2">All required columns detected. Choose an analysis below.</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-[#ffd0d0]">
                  <XCircle className="w-4 h-4 text-[#850b0b] shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-[#850b0b]">Missing required columns</span>
                    <span className="text-xs text-[#3d3d3d] ml-2">Update your file and re-upload.</span>
                  </div>
                </div>
              )}

              {/* Column chips */}
              <div className="px-5 py-4 space-y-4">

                {/* Required */}
                <div>
                  <p className="text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wider font-mono mb-2">Required</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "discount_code", label: "Promo Code" },
                      { key: "Signups",        label: "Signups" },
                      { key: "Paying cx",      label: "Customers" },
                      { key: "Conversion",     label: "Conversion Rate" },
                    ].map(col => {
                      const ok = fileUpload.state.fileValidation?.requiredFound.includes(col.key);
                      return (
                        <span
                          key={col.key}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={ok
                            ? { backgroundColor: '#eef4f1', color: '#2b5346', borderColor: 'rgba(43,83,70,0.2)' }
                            : { backgroundColor: '#ffd0d0', color: '#850b0b', borderColor: 'rgba(133,11,11,0.2)' }
                          }
                        >
                          {ok
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />
                          }
                          {col.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Optional */}
                <div>
                  <p className="text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wider font-mono mb-2">
                    Optional <span className="text-[#a1a1a1] normal-case font-normal">— enables regional + LTV breakdowns</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "channel",              label: "Channel" },
                      { key: "Province",             label: "Province" },
                      { key: "total_discount_used",  label: "Discount" },
                      { key: "Sum LTV 12",           label: "LTV 12m" },
                      { key: "Avg LTV 12",           label: "Avg LTV" },
                    ].map(col => {
                      const ok = fileUpload.state.fileValidation?.optionalFound.includes(col.key);
                      return (
                        <span
                          key={col.key}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={ok
                            ? { backgroundColor: '#f8f7f5', color: '#3d3d3d', borderColor: '#e5e5e5' }
                            : { backgroundColor: '#f8f7f5', color: '#a1a1a1', borderColor: '#e5e5e5' }
                          }
                        >
                          {ok
                            ? <CheckCircle2 className="w-3 h-3 text-[#2b5346]" />
                            : <span className="w-3 h-3 rounded-full border border-[#e5e5e5] inline-block" />
                          }
                          {col.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* WIZARD CHOICE BLOCK */}
            {fileUpload.state.fileValidation?.isValid && (
              <div className="w-full max-w-4xl space-y-4 sm:space-y-5">
                <h3 className="text-xs font-semibold text-[#3d3d3d] text-center uppercase tracking-wider">
                  Choose your analysis
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  
                  {/* OPTION 1: Specific Codes */}
                  <div
                    onClick={() => setSelectedFlow("paste")}
                    className={`p-5 sm:p-6 rounded-xl border text-left cursor-pointer ${
                      selectedFlow === "paste"
                        ? "bg-white border-[#2b5346] shadow-lg ring-2 ring-[#2b5346] ring-opacity-30"
                        : "bg-white border-slate-300 hover:border-[#2b5346] shadow hover:shadow-md"
                    }`}
                    style={{ transition: 'box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg border ${
                        selectedFlow === "paste"
                          ? "bg-[#2b5346] text-white border-[#0d3a2f]"
                          : "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20"
                      }`} style={{ transition: 'background-color 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}>
                        <Clipboard className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Specific Codes
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Analyze a custom list of promotion codes you paste in.
                    </p>
                  </div>

                  {/* OPTION 2: All Codes */}
                  <div
                    onClick={() => {
                      setSelectedFlow("all");
                    }}
                    className={`p-5 sm:p-6 rounded-xl border text-left cursor-pointer ${
                      selectedFlow === "all"
                        ? "bg-white border-[#2b5346] shadow-lg ring-2 ring-[#2b5346] ring-opacity-30"
                        : "bg-white border-slate-300 hover:border-[#2b5346] shadow hover:shadow-md"
                    }`}
                    style={{ transition: 'box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg border ${
                        selectedFlow === "all"
                          ? "bg-[#2b5346] text-white border-[#0d3a2f]"
                          : "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20"
                      }`} style={{ transition: 'background-color 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}>
                        <Database className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Full Dataset
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Analyze all <strong className="text-slate-800">{uniqueDbCodes.length}</strong> unique codes in your dataset.
                    </p>
                  </div>

                  {/* OPTION 3: Compare */}
                  <div
                    onClick={() => setSelectedFlow("compare")}
                    className={`p-5 sm:p-6 rounded-xl border text-left cursor-pointer ${
                      selectedFlow === "compare"
                        ? "bg-white border-[#2b5346] shadow-lg ring-2 ring-[#2b5346] ring-opacity-30"
                        : "bg-white border-slate-300 hover:border-[#2b5346] shadow hover:shadow-md"
                    }`}
                    style={{ transition: 'box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg border ${
                        selectedFlow === "compare"
                          ? "bg-[#2b5346] text-white border-[#0d3a2f]"
                          : "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20"
                      }`} style={{ transition: 'background-color 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}>
                        <Scale className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Compare Codes
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Build a side-by-side comparison of multiple codes.
                    </p>
                  </div>

                </div>

                {/* COLLAPSIBLE OPERATION SHEET BASED ON SELECTED FLOW */}
                <div className="bg-white border border-slate-300 p-5 sm:p-6 rounded-xl shadow-md">
                  
                  {selectedFlow === "paste" && (
                    <div className="space-y-4 sm:space-y-5" id="panel-paste-flow">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Analyze Specific Codes
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Paste your codes below. We'll auto-clean whitespace and normalize formatting.
                        </p>
                      </div>

                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your promo codes here...&#10;One code per line&#10;&#10;Example:&#10;FPFREEMEALS&#10;GA75BRAND18&#10;EVSHIPYARDS20"
                        className="w-full h-40 sm:h-44 font-mono text-sm border border-slate-300 rounded-lg p-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-transparent resize-none"
                      />

                      {/* Helper Tools */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase font-bold text-slate-700 tracking-wide flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#eef4f1] text-[#2b5346] flex items-center justify-center font-mono font-bold text-xs">T</span>
                            Text Tools
                          </span>
                          <span className="text-xs bg-[#eef4f1] text-[#2b5346] font-semibold px-2 py-1 rounded">
                            Auto Clean
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={handleFormatCleanEmpty}
                            className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition"
                            title="Remove empty lines"
                          >
                            Remove Blanks
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleFormatStripComments}
                            className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition"
                            title="Remove comment lines"
                          >
                            Strip Comments
                          </button>

                          <button
                            type="button"
                            onClick={handleFormatUppercase}
                            className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition"
                            title="Normalize to uppercase"
                          >
                            Uppercase All
                          </button>

                          <button
                            type="button"
                            onClick={handleFormatAlphaSort}
                            className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition"
                            title="Sort alphabetically"
                          >
                            Sort  A→Z
                          </button>
                        </div>

                        {/* Filter lines */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200">
                          <label className="text-xs font-bold text-slate-600 shrink-0 uppercase tracking-wide">
                            Remove lines with:
                          </label>
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={eraseKeyword}
                              onChange={(e) => setEraseKeyword(e.target.value)}
                              placeholder="e.g. 'expired', 'test'"
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-[#2b5346]"
                            />
                            <button
                              type="button"
                              onClick={handleEraseLinesContaining}
                              disabled={!eraseKeyword.trim()}
                              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight transition cursor-pointer shrink-0 ${
                                eraseKeyword.trim()
                                  ? "bg-[#ffd0d0] border border-[#850b0b]/20 text-[#850b0b] hover:bg-[#ffd0d0]/70"
                                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              }`}
                            >
                              ✕ Erase Matching Lines
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                        <span className="text-xs sm:text-sm font-semibold text-[#2b5346] bg-[#eef4f1] border border-[#2b5346]/20 px-3 py-1.5 rounded-lg font-mono">
                          {normalizedPastedCodes.length} code{normalizedPastedCodes.length === 1 ? "" : "s"} loaded
                        </span>
                        
                        <div className="flex gap-2 self-end sm:self-auto">
                          {inputText && (
                            <button
                              onClick={() => setInputText("")}
                              className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={handleCompileSpecificCodes}
                            disabled={normalizedPastedCodes.length === 0}
                            className={`px-4 sm:px-5 py-2 rounded-lg font-semibold text-xs cursor-pointer inline-flex items-center gap-2 ${
                              normalizedPastedCodes.length > 0
                                ? "bg-[#2b5346] hover:bg-[#0d3a2f] text-white shadow-md hover:shadow-lg"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                            style={{ transition: 'background-color 150ms var(--ease-out), transform 100ms var(--ease-out)' }}
                            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                          >
                            <FileText className="w-4 h-4" />
                            Analyze Codes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFlow === "all" && (
                    <div className="space-y-4 py-4" id="panel-all-flow">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-3">
                          <Database className="w-6 h-6 text-[#2b5346]" />
                          <h4 className="text-sm font-bold text-slate-900">
                            Full Dataset Analysis
                          </h4>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Analyze all <strong className="font-semibold text-slate-800">{uniqueDbCodes.length} codes</strong> in your dataset automatically. This creates a comprehensive performance profile for each code.
                        </p>
                      </div>

                      <div className="pt-4 max-w-xs mx-auto">
                        <button
                          onClick={handleCompilePortfolio}
                          className="w-full py-2.5 rounded-lg bg-[#2b5346] hover:bg-[#0d3a2f] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                          style={{ transition: 'background-color 150ms var(--ease-out), transform 100ms var(--ease-out)' }}
                          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Analyze All Codes
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedFlow === "compare" && (
                    <div className="space-y-4 animate-fade-in" id="panel-compare-flow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Compare Multiple Codes
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Select 2+ codes to compare performance metrics side-by-side.
                          </p>
                        </div>

                        {/* Search filter input */}
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={compareSearch}
                            onChange={(e) => setCompareSearch(e.target.value)}
                            placeholder="Type to filter codes..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2b5346] focus:border-[#2b5346] font-sans"
                          />
                        </div>
                      </div>

                      {/* Code checklist select box */}
                      <div className="border border-slate-205 rounded-xl bg-slate-50/25 p-3">
                        <div className="flex gap-2.5 mb-2.5 font-mono text-[10px] font-bold">
                          <button onClick={handleSelectAllCompare} className="text-[#2b5346] hover:underline cursor-pointer">
                            [Select All]
                          </button>
                          <button onClick={handleSelectNoneCompare} className="text-slate-500 hover:underline cursor-pointer">
                            [Select None]
                          </button>
                          <span className="text-slate-400 ml-auto lowercase">
                            showing {filteredCompareCodes.length} of {uniqueDbCodes.length} codes
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                          {filteredCompareCodes.map(code => {
                            const isChecked = selectedCompareCodes.includes(code);
                            return (
                              <label 
                                key={code}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                                  isChecked
                                    ? "bg-[#eef4f1] border-[#2b5346] text-[#1a1a1a] font-black font-mono"
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-mono"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCompareCode(code)}
                                  className="accent-[#2b5346] w-3.5 h-3.5"
                                />
                                <span className="truncate">{code}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {selectedCompareCodes.length} codes selected for comparison (need &ge; 2)
                        </span>

                        <button
                          onClick={handleCompileComparison}
                          disabled={selectedCompareCodes.length < 2}
                          className={`w-full sm:w-auto px-5 py-2 rounded-lg font-bold text-xs shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 ${
                            selectedCompareCodes.length >= 2
                              ? "bg-[#2b5346] hover:bg-[#0d3a2f] text-white"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                          style={{ transition: 'background-color 150ms var(--ease-out), transform 100ms var(--ease-out)' }}
                          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          Compare Codes
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        ) : (
          
          /* REPORT COMPILED VIEWPORT — Multi-page architecture */
          <div className="flex-1 overflow-hidden flex flex-col" id="report-dashboard">

            {/* Sticky page navigation */}
            <div className="shrink-0 bg-white border-b border-[#e5e5e5] px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {([
                { id: 'overview',     label: 'Overview'     },
                { id: 'performance',  label: 'Performance'  },
                { id: 'revenue',      label: 'Revenue'      },
                { id: 'regional',     label: 'Regional'     },
                { id: 'data',         label: 'Data'         },
                ...(missingCodes.length > 0 ? [{ id: 'issues', label: `Issues (${missingCodes.length})` }] : []),
              ] as { id: typeof reportPage; label: string }[]).map(page => (
                <button
                  key={page.id}
                  onClick={() => setReportPage(page.id)}
                  className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer ${
                    reportPage === page.id
                      ? 'border-[#2b5346] text-[#2b5346]'
                      : 'border-transparent text-[#3d3d3d] hover:text-[#1a1a1a]'
                  } ${page.id === 'issues' ? 'text-[#9b4a1c]' : ''}`}
                  style={{ transition: 'color 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
                >
                  {page.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={handleResetWorkspace}
                className="shrink-0 text-[11px] text-[#a1a1a1] hover:text-[#2b5346] font-medium flex items-center gap-1 cursor-pointer ml-2"
                style={{ transition: 'color 150ms var(--ease-out)' }}
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">New dataset</span>
              </button>
            </div>

            {/* Page content — key= triggers fade on page change */}
            <div
              key={reportPage}
              className="flex-1 overflow-y-auto bg-[#f8f7f5]"
              style={{ animation: 'fadeIn 180ms var(--ease-out)' }}
            >

              {/* ── PAGE: OVERVIEW ─────────────────────────────── */}
              {reportPage === 'overview' && (
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
                          {fileUpload.state.fileName && <span className="font-mono">{fileUpload.state.fileName} · </span>}
                          {fileUpload.state.dbRows.length.toLocaleString()} records
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
                        onClick={() => setReportPage(item.page)}
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
              )}

              {/* ── PAGE: PERFORMANCE ──────────────────────────── */}
              {reportPage === 'performance' && (
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
              )}

              {/* ── PAGE: REVENUE ──────────────────────────────── */}
              {reportPage === 'revenue' && (
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
              )}

              {/* ── PAGE: REGIONAL ─────────────────────────────── */}
              {reportPage === 'regional' && (
                <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-[#1a1a1a]">Regional breakdown</h2>
                    <span className="text-[10px] text-[#a1a1a1] font-mono">Performance by province</span>
                  </div>
                  <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-3xs">
                    <ProvinceIntelligence dbRows={fileUpload.state.dbRows} foundReports={foundReports} />
                  </div>
                </div>
              )}

              {/* ── PAGE: DATA ─────────────────────────────────── */}
              {reportPage === 'data' && (
                <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-semibold text-[#1a1a1a]">Data</h2>
                      <span className="text-[10px] text-[#a1a1a1] font-mono">All {foundReports.length} codes</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setActiveTab2("explorer")} className="text-xs font-medium text-[#2b5346] hover:underline cursor-pointer">
                        Raw explorer
                      </button>
                    </div>
                  </div>
                  <DetailedTable reports={foundReports} channels={uniqueChannels} />
                  <div className="bg-white rounded-xl border border-[#e5e5e5] p-4 shadow-3xs">
                    <h3 className="text-xs font-semibold text-[#3d3d3d] mb-3 uppercase tracking-wide">Source explorer</h3>
                    <DataExplorer dbRows={fileUpload.state.dbRows} fileName={fileUpload.state.fileName} />
                  </div>
                </div>
              )}

              {/* ── PAGE: ISSUES ───────────────────────────────── */}
              {reportPage === 'issues' && (
                <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-[#1a1a1a]">Issues</h2>
                    {missingCodes.length > 0 && (
                      <span className="px-2 py-0.5 bg-[#fef3ed] text-[#9b4a1c] text-[10px] font-mono font-bold rounded border border-[#e78a58]/30">
                        {missingCodes.length} unmatched
                      </span>
                    )}
                  </div>

                  {missingCodes.length > 0 ? (
                    <MissingCodesSection
                      missingCodes={missingCodes}
                      allDbCodes={uniqueDbCodes}
                      rawPastedCodes={rawPastedCodes}
                      foundReports={foundReports}
                      onApplyCorrections={(corrections) => {
                        const newCodes = rawPastedCodes.map((code) => {
                          const replacement = corrections[code];
                          return replacement !== undefined ? replacement : code;
                        });
                        const uniqueNewCodes = Array.from(new Set(newCodes));
                        setRawPastedCodes(uniqueNewCodes);
                        setInputText(uniqueNewCodes.join("\n"));
                      }}
                    />
                  ) : (
                    <div className="bg-[#eef4f1] border border-[#2b5346]/20 rounded-xl p-8 text-center">
                      <CheckCircle2 className="w-8 h-8 text-[#2b5346] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[#2b5346]">No issues detected</p>
                      <p className="text-xs text-[#3d3d3d] mt-1">All codes matched. Multi-province duplicates are combined automatically.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <footer id="saas-footer" className="text-[10px] text-[#a1a1a1] font-mono py-4 border-t border-[#e5e5e5] mt-auto flex items-center justify-between px-6 max-w-6xl mx-auto w-full">
                <span>FreshPrep Campaign Intelligence · {new Date().getFullYear()}</span>
                <span>All analysis runs client-side. No data leaves your browser.</span>
              </footer>

            </div>
          </div>
        )}

      </main>

      {/* Target Print Element - Hidden normally, visible during print layout review */}
      {hasReportGenerated && foundReports.length > 0 && (
        <div 
          id="printable-pdf-executive-summary" 
          className={`${
            isPrintPreview 
              ? "fixed inset-0 z-50 bg-slate-100 overflow-y-auto p-4 md:p-8 flex flex-col items-center animate-fade-in" 
              : "hidden"
          } text-black font-sans`}
        >
          {/* On-screen controls header container. Marked with 'no-print' class to hide in final print outputs! */}
          <div className="no-print w-full max-w-4xl bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md font-sans shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Executive Report PDF Export & Print Hub
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Review and format your printable digest. Click <strong>"Confirm & Save/Print"</strong> to trigger the print layout. 
              </p>
            </div>
            <div className="flex gap-2">
              <button
                id="close-preview-btn"
                onClick={() => setIsPrintPreview(false)}
                className="px-4 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-250 hover:bg-slate-50 rounded-lg cursor-pointer transition shadow-3xs"
              >
                ✕ Exit Preview
              </button>
              <button
                id="trigger-print-btn"
                onClick={() => {
                  try {
                    window.print();
                  } catch (err) {
                    alert("Triggering browser print directly from the iframe failed. Please open the app in a new tab first.");
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-850 rounded-lg transition shadow-2xs font-sans cursor-pointer flex items-center gap-2"
              >
                🖨️ Confirm & Save/Print
              </button>
            </div>
          </div>

          {/* Printable Sheet Wrapper */}
          <div className="w-full max-w-4xl bg-white shadow-xl p-6 md:p-12 border border-slate-200 rounded-xl print:p-0 print:border-0 print:shadow-none font-sans select-text">
            <div className="border-b-2 border-zinc-900 pb-5 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <img
                    src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format"
                    alt="FreshPrep"
                    className="h-7 w-auto mb-3"
                    style={{ filter: 'brightness(0)' }}
                  />
                  <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">
                    Campaign Performance Report
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-1">
                    Analysis Compiled: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-zinc-900 text-white font-mono font-bold text-[10px] rounded">
                    INTERNAL CONFIDENTIAL
                  </span>
                  <p className="text-[10px] font-mono mt-2 text-zinc-500">FreshPrep Campaign Intelligence</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 bg-zinc-50 p-5 border border-zinc-200 rounded">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold font-mono">Report Scope & Matches</h2>
                <dl className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <dt className="text-zinc-650">Total Codes Submitted:</dt>
                    <dd className="font-bold font-mono text-zinc-900">{foundReports.length + missingCodes.length}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-blue-800">
                    <dt className="font-medium">Codes Located in Data:</dt>
                    <dd className="font-bold font-mono">{summary.numCodesFound}</dd>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <dt className="font-medium">Missing / Untracked Codes:</dt>
                    <dd className="font-bold font-mono">{summary.numCodesMissing}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold font-mono">Source Metadata</h2>
                <dl className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <dt className="text-zinc-650">Source Filename:</dt>
                    <dd className="font-mono text-zinc-800">{fileUpload.state.fileName || "Staged CSV/XLSX Export"}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <dt className="text-zinc-650">Total File Records:</dt>
                    <dd className="font-mono font-bold text-zinc-800">{fileUpload.state.dbRows.length.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between text-zinc-850">
                    <dt className="text-zinc-650">Execution Engine:</dt>
                    <dd className="font-mono font-semibold">100% Client-Side Web Sandbox</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-sm font-extrabold uppercase border-b border-zinc-950 pb-1.5 mb-3 text-zinc-900 tracking-wide font-mono">
                Key Metrics Overview
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Registrations</p>
                  <p className="text-base font-black text-zinc-900 font-mono mt-1">{summary.totalSignups.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Acquisitions</p>
                  <p className="text-base font-black text-zinc-900 font-mono mt-1">{summary.totalPayingCustomers.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Blended Conversion</p>
                  <p className="text-base font-black text-zinc-900 font-mono mt-1">{summary.blendedConversionRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 font-mono">LTV 12 Combined</p>
                  <p className="text-base font-black text-zinc-900 font-mono mt-1">${summary.totalLTV12.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-zinc-900 font-bold font-mono border-b border-zinc-950 pb-1 mb-2">
                  Leaderboard Performance Assets
                </h2>
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-zinc-600 font-bold">⭐ Highest Scoring Promo Voucher:</dt>
                    <dd className="font-mono text-zinc-950 text-sm mt-0.5 font-bold">
                      {summary.bestOverallScoreCode !== "N/A" ? `${summary.bestOverallScoreCode} (${summary.bestOverallScoreVal}/100)` : "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-650 font-bold">🏆 Best conversion rate:</dt>
                    <dd className="font-mono text-zinc-955 text-sm mt-0.5 font-bold">
                      {summary.topPerformingCodeCode !== "N/A" ? `${summary.topPerformingCodeCode} (${summary.topPerformingCodeVal.toFixed(1)}%)` : "N/A"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="text-xs uppercase tracking-wider text-zinc-900 font-bold font-mono border-b border-zinc-950 pb-1 mb-2">
                  Executive Portfolios
                </h2>
                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-700 leading-relaxed">
                  <li>Optimize focus toward **{summary.bestOverallScoreCode ?? "N/A"}** styled events.</li>
                  <li>Deprecate under-performing codes returning poor customer lifetimes.</li>
                  <li>Verify **{missingCodes.length}** mismatched inputs with source records.</li>
                </ul>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-xs uppercase tracking-wider text-zinc-900 font-bold font-mono border-b border-zinc-950 pb-1 mb-2">
                Performance Breakdown Listing
              </h2>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-800 font-mono font-bold">
                    <th className="py-1 px-1">Rank</th>
                    <th className="py-1 px-2">Discount Code</th>
                    <th className="py-1 px-1 text-center font-mono">Prov</th>
                    <th className="py-1 px-2">Channel</th>
                    <th className="py-1 px-2 text-right">Signups</th>
                    <th className="py-1 px-2 text-right">Paying</th>
                    <th className="py-1 px-2 text-right">Conversion</th>
                    <th className="py-1 px-2 text-right font-bold">Avg LTV 12</th>
                    <th className="py-1 px-2 text-right">Eff. Ratio</th>
                    <th className="py-1 px-1 text-center font-mono">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {foundReports.map((r, idx) => (
                    <tr key={`${r.discount_code}-${r.Province || "ON"}-${idx}`}>
                      <td className="py-1 px-1 font-mono">{idx + 1}</td>
                      <td className="py-1 px-2 font-mono font-bold text-zinc-955">{r.discount_code}</td>
                      <td className="py-1 px-1 font-mono text-center">{r.Province || "ON"}</td>
                      <td className="py-1 px-2 truncate text-zinc-650 max-w-[124px]">{r.channel}</td>
                      <td className="py-1 px-2 text-right font-mono">{r.Signups}</td>
                      <td className="py-1 px-2 text-right font-mono">{r["Paying cx"]}</td>
                      <td className="py-1 px-2 text-right font-mono">{r.calculatedConversion.toFixed(1)}%</td>
                      <td className="py-1 px-2 text-right font-mono font-medium">${r["Avg LTV 12"].toFixed(0)}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-blue-700">{r.efficiencyRatio.toFixed(1)}x</td>
                      <td className="py-1 px-1 text-center font-mono font-bold">{r.performanceGrade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 mt-8 text-center text-[9px] text-zinc-550 font-mono">
              <p>Certified Client-Side Review Audit &bull; Generated via Event Intelligence Platform &bull; Page 1 of 1</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
