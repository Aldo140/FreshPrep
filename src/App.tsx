/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
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

// Types
import { DiscountCodeData } from "./types";

// Parsing utilities
import { 
  generateAnalysisReport, 
  exportToExcelFile, 
  exportToCSVFile, 
  parsePastedCodes, 
  parseSpreadsheetFile,
  FileValidationResult 
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

export default function App() {
  // Core States
  const [dbRows, setDbRows] = useState<DiscountCodeData[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileValidation, setFileValidation] = useState<FileValidationResult | null>(null);
  
  // Reporting States
  const [activeTab, setActiveTab2] = useState<"report" | "explorer">("report");
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasReportGenerated, setHasReportGenerated] = useState(false);

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

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Unique codes available inside the uploaded spreadsheet
  const uniqueDbCodes = useMemo(() => {
    if (dbRows.length === 0) return [];
    return Array.from(
      new Set(dbRows.map((r) => r.discount_code.trim().toUpperCase()))
    ).filter(Boolean).sort();
  }, [dbRows]);

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
    return generateAnalysisReport(dbRows, rawPastedCodes);
  }, [dbRows, rawPastedCodes]);

  const { foundReports, missingCodes, summary, channelSummary } = reportResults;

  // Extract all unique channels from matched list for sub-breakdowns
  const uniqueChannels = useMemo(() => {
    const list = foundReports.map(item => item.channel);
    return Array.from(new Set(list))
      .filter((c): c is string => typeof c === "string" && c.length > 0)
      .sort();
  }, [foundReports]);

  // Handle uploaded spreadsheet file
  const processUploadedFile = async (file: File) => {
    try {
      const result = await parseSpreadsheetFile(file);
      setDbRows(result.dbRows);
      setFileValidation(result.validation);
      setFileName(file.name);
      setHasReportGenerated(false);
      setSelectedFlow("paste"); // default focus
    } catch (err: any) {
      alert(`Error reading file: ${err?.message || "Verify document format (XLSX, XLS, CSV, TSV) and retry."}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  const triggerBrowsingInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

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
    setDbRows([]);
    setFileName(null);
    setFileValidation(null);
    setHasReportGenerated(false);
    setRawPastedCodes([]);
    setInputText("");
    setSelectedCompareCodes([]);
    setCompareSearch("");
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
    <div id="saas-applet-root" className="flex flex-col h-screen w-full bg-[#fbfdfa] text-slate-800 overflow-hidden font-sans selection:bg-emerald-150 selection:text-emerald-950">
      
      {/* Top Banner Navigation Row */}
      <header id="app-global-nav" className="min-h-15 py-2.5 md:py-0 md:h-15 bg-white border-b border-emerald-100 flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 shrink-0 z-40 shadow-2xs gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold shadow-xs shrink-0">
            <BarChart3 className="w-5 h-5 text-emerald-50" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 uppercase truncate">
                Fresh Prep <span className="text-emerald-700 font-extrabold font-sans">Event Intelligence</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] bg-emerald-50 text-emerald-800 font-bold uppercase rounded-md tracking-wider border border-emerald-100 shrink-0">
                PRO PORTAL
              </span>
            </div>
            {fileName && (
              <p className="text-[9.5px] sm:text-[10px] font-mono text-emerald-850 font-bold leading-none mt-0.5 truncate max-w-full">
                ACTIVE REPOSITORY: {fileName} ({dbRows.length.toLocaleString()} records loaded)
              </p>
            )}
          </div>
        </div>

        {/* Action Controls for reporting or file swaps */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end md:self-auto w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth shrink-0" id="app-global-nav-actions">
          {dbRows.length > 0 && (
            <button
              id="reset-workspace-top-btn"
              onClick={handleResetWorkspace}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 transition cursor-pointer border border-emerald-100 shrink-0"
              title="Upload another spreadsheet and discard current dataset"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="hidden sm:inline">Upload Another Database</span>
              <span className="sm:hidden">Reset DB</span>
            </button>
          )}

          {hasReportGenerated && foundReports.length > 0 && (
            <>
              <button
                id="export-xlsx-btn"
                onClick={handleExportToExcel}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition cursor-pointer shrink-0"
                title="Export dynamic multi-sheet reports to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline font-sans">Export Excel</span>
                <span className="sm:hidden font-sans">Excel</span>
              </button>

              <button
                id="export-pdf-btn"
                onClick={() => setIsPrintPreview(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-slate-900 hover:bg-black text-white transition border border-slate-950 cursor-pointer shadow-3xs shrink-0"
              >
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Print Report</span>
                <span className="sm:hidden">Print</span>
              </button>

              <button
                id="export-csv-btn"
                onClick={handleExportToCSV}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-150 text-slate-700 transition border border-slate-200 cursor-pointer shadow-3xs shrink-0"
              >
                <Download className="w-4 h-4 text-slate-500 shrink-0" />
                <span>CSV Output</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Container Core Router */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0" id="analysis-main-viewport">
        
        {/* LAUNCH STATE: Display Upload Area & Instructions exclusively */}
        {dbRows.length === 0 ? (
          <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-4 sm:py-10 md:py-16 flex flex-col items-center justify-center bg-slate-50/50" id="launch-screen">
            <div className="w-full max-w-2xl bg-white border border-emerald-100/75 p-4 sm:p-6 md:p-10 rounded-2xl shadow-sm space-y-5 sm:space-y-8 animate-fade-in">
              
              {/* Fresh Prep Header and greeting */}
              <div className="text-center space-y-1.5 sm:space-y-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto shadow-3xs">
                  <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tight family-display">
                  Campaign Voucher Audit Hub
                </h2>
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                  A modern, high-fidelity business intelligence terminal built for marketing and BD teams to audit campaign conversions, lifetime values, and localized performance.
                </p>
              </div>

              {/* UPLOAD DRAGZONE */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv,.tsv"
                  className="hidden"
                  id="excel-file-uploader"
                />

                <div
                  id="drag-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerBrowsingInput}
                  className={`border-3 border-dashed rounded-xl p-4 sm:p-8 text-center cursor-pointer flex flex-col items-center justify-center min-h-[120px] sm:min-h-[160px] transition-all duration-300 ${
                    isDragOver
                      ? "border-emerald-600 bg-emerald-50/40 scale-99"
                      : "border-slate-200 hover:border-emerald-500 bg-emerald-50/5 hover:bg-emerald-50/10"
                  }`}
                >
                  <FileSpreadsheet className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    <span className="hidden sm:inline">Drag and drop your coupon report here, or </span>
                    <span className="text-emerald-700 underline font-black hover:text-emerald-850">Click to browse &amp; upload</span>
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">
                    Accepts Excel (.xlsx, .xls), Comma-separated (.csv), and Tab-separated (.tsv) lists
                  </p>
                </div>
              </div>

              {/* REFINED SUPPORTED FILE TYPES AND BRIEF INSTRUCTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-455 font-mono">
                    Supported Formats & Mapping
                  </h4>
                  <div className="flex flex-wrap gap-1.5" id="format-tags-list">
                    {["CSV Separated", "XLSX Workbook", "XLS Spreadsheet", "TSV Separated"].map(fmt => (
                      <span key={fmt} className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-50 text-emerald-850 text-[9.5px] sm:text-[10px] font-bold rounded-md border border-emerald-100">
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-sans leading-relaxed">
                    Our dynamic validation engine auto-maps column header variations (e.g., <em>"promo code"</em>, <em>"Signups"</em>, <em>"Paying cx"</em>) instantly.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-455 font-mono">
                    Quick Operational Guide
                  </h4>
                  <ul className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-[11px] text-slate-500 leading-normal font-sans">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded bg-emerald-50 text-emerald-700 font-bold font-mono text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Export campaign registry rows from server databases to xlsx or tsv.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded bg-emerald-50 text-emerald-700 font-bold font-mono text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>System auto-audits file integrity and highlights required key indicators.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded bg-emerald-50 text-emerald-700 font-bold font-mono text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Filter, compare selected segments, or analyze complete directories instantly.</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        ) : !hasReportGenerated ? (
          
          /* VALIDATED STATE AND WIZARD FLOW SELECTOR */
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/50 flex flex-col items-center gap-4 sm:gap-6" id="wizard-screen">
            
            {/* Validation indicators block */}
            <div className="w-full max-w-4xl bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-5">
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                    Data File Integrity Verification
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-normal font-medium mt-0.5">
                    Live structural blueprint test for <strong className="font-mono text-emerald-805">{fileName}</strong> ({dbRows.length.toLocaleString()} total rows loaded)
                  </p>
                </div>
                <button
                  onClick={handleResetWorkspace}
                  className="px-3 py-1.5 self-start sm:self-auto text-xs text-rose-600 bg-rose-50 border border-rose-100 font-bold rounded-lg hover:bg-rose-100/60 cursor-pointer transition shrink-0"
                >
                  ✕ Unload spreadsheet
                </button>
              </div>

              {/* SUCCESS / ERROR INDICATOR CARD */}
              {fileValidation?.isValid ? (
                <div className="bg-emerald-50/60 border border-emerald-250 p-3.5 sm:p-4 rounded-xl flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 flex-shrink-0 mt-0.5 animate-pulse">
                    <CheckCircle2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-[11px] sm:text-[12px] font-extrabold uppercase text-emerald-950 tracking-wider font-mono">
                      STRUCTURAL BLUEPRINT AUDIT PASSED
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-700 font-medium leading-relaxed mt-1">
                      Success! All mandatory performance dimensions are mapped. The data registry is ready for dynamic generation. Choose your preferred analysis flow below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50/50 border border-rose-250 p-3.5 sm:p-4 rounded-xl flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800 flex-shrink-0 mt-0.5">
                    <XCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-rose-700" />
                  </div>
                  <div>
                    <h4 className="text-[11px] sm:text-[12px] font-extrabold uppercase text-rose-950 tracking-wider font-mono">
                      BLUEPRINT AUDIT FAILED - STRUCTURE BROKEN
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-700 font-medium leading-relaxed mt-1">
                      Critical mapping error: The file is missing mandatory column headers required to generate campaign intelligence. Please revise your spreadsheet headers to align with the database.
                    </p>
                  </div>
                </div>
              )}

              {/* COLUMNS MATRIX */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                
                {/* Required Columns List */}
                <div className="bg-slate-50 border border-slate-205 p-3 sm:p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-bold text-[10.5px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-mono">
                      Required Columns
                    </h5>
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-450 bg-slate-200 px-1.5 py-0.5 rounded">
                      Must be present
                    </span>
                  </div>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {[
                      { key: "discount_code", label: "discount_code (Voucher ID)" },
                      { key: "Signups", label: "Signups (Registrations)" },
                      { key: "Paying cx", label: "Paying cx (Acquisitions)" },
                      { key: "Conversion", label: "Conversion (Success % - can auto-compute)" }
                    ].map((col) => {
                      const detected = fileValidation?.requiredFound.includes(col.key);
                      return (
                        <li key={col.key} className="flex items-center justify-between bg-white border border-slate-150 p-1.5 sm:p-2 rounded-lg gap-2">
                          <span className="font-mono text-[10.5px] sm:text-[11px] font-bold text-slate-800 truncate" title={col.label}>{col.label}</span>
                          {detected ? (
                            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                              ✓ Found
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-rose-800 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-100 shrink-0">
                              ✗ Missing
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Optional Columns List */}
                <div className="bg-slate-50 border border-slate-205 p-3 sm:p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-bold text-[10.5px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-mono">
                      Optional Columns Found
                    </h5>
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-450 bg-slate-200 px-1.5 py-0.5 rounded">
                      Enriches reports
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "channel", label: "Channel" },
                      { key: "Province", label: "Province/Region" },
                      { key: "total_discount_used", label: "Discount Used" },
                      { key: "Sum LTV 12", label: "Sum LTV 12" },
                      { key: "Avg LTV 12", label: "Avg LTV 12" }
                    ].map(col => {
                      const detected = fileValidation?.optionalFound.includes(col.key);
                      return (
                        <span 
                          key={col.key}
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-semibold border ${
                            detected 
                              ? "bg-emerald-50/40 text-emerald-900 border-emerald-200" 
                              : "bg-slate-150/40 text-slate-400 border-slate-200 text-line-through decoration-slate-350"
                          }`}
                        >
                          {col.label}: {detected ? "Available" : "N/A"}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[9.5px] sm:text-[10px] text-slate-450 mt-3 sm:mt-4 leading-relaxed font-sans font-medium">
                    Optional insights such as LTV vectors or regional provincial metrics unlock deep geographical drill-down parameters within active reports automatically.
                  </p>
                </div>

              </div>

            </div>

            {/* WIZARD CHOICE BLOCK */}
            {fileValidation?.isValid && (
              <div className="w-full max-w-4xl space-y-3.5 sm:space-y-4">
                <h3 className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-slate-400 text-center">
                  Select Campaign Audit Objective
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  
                  {/* CHOICE 1 CARD */}
                  <div 
                    onClick={() => setSelectedFlow("paste")}
                    className={`p-4 sm:p-5 rounded-2xl border text-left cursor-pointer transition-all ${
                      selectedFlow === "paste"
                        ? "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500"
                        : "bg-white/80 hover:bg-white border-slate-200 hover:border-emerald-350 shadow-3xs"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg border ${selectedFlow === "paste" ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        <Clipboard className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider">
                        Specific Vouchers
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Examine a curated list of marketing event coupon codes with side-by-side matching.
                    </p>
                  </div>

                  {/* CHOICE 2 CARD */}
                  <div 
                    onClick={() => {
                      setSelectedFlow("all");
                      // Automatically compile all if option clicked
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border text-left cursor-pointer transition-all ${
                      selectedFlow === "all"
                        ? "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500"
                        : "bg-white/80 hover:bg-white border-slate-200 hover:border-emerald-350 shadow-3xs"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg border ${selectedFlow === "all" ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        <Database className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider">
                        Entire Portfolio
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Instantly aggregate all <strong className="text-slate-800">{uniqueDbCodes.length}</strong> distinctive event codes found inside this sheet.
                    </p>
                  </div>

                  {/* CHOICE 3 CARD */}
                  <div 
                    onClick={() => setSelectedFlow("compare")}
                    className={`p-4 sm:p-5 rounded-2xl border text-left cursor-pointer transition-all ${
                      selectedFlow === "compare"
                        ? "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500"
                        : "bg-white/80 hover:bg-white border-slate-200 hover:border-emerald-350 shadow-3xs"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg border ${selectedFlow === "compare" ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        <Scale className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider">
                        Code Comparison
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Interactively check off multiple vouchers and build a direct comparative index timeline.
                    </p>
                  </div>

                </div>

                {/* COLLAPSIBLE OPERATION SHEET BASED ON SELECTED FLOW */}
                <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
                  
                  {selectedFlow === "paste" && (
                    <div className="space-y-3.5 sm:space-y-4 animate-fade-in" id="panel-paste-flow">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase">
                          Option 1: Paste Target Voucher Identifiers
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Paste your list (any spaces, commas, or line breaks will be auto-normalized).
                        </p>
                      </div>

                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="e.g.&#10;FPFREEMEALS&#10;GA75BRAND18&#10;EVSHIPYARDS20"
                        className="w-full h-32 sm:h-36 font-mono text-xs border border-slate-205 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 select-text font-semibold animate-fade-in"
                      />

                      {/* Text Cleaner & Line Normalization Formatter component */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-3 font-sans shadow-3xs animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[10.5px] uppercase font-mono font-bold text-slate-550 tracking-wider flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                            Live Code Cleaner &amp; Line Formatter
                          </span>
                          <span className="text-[9px] sm:text-[9.5px] bg-slate-200 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded tracking-wide shrink-0">
                            Paste Assistant
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 md:gap-1.5">
                          <button
                            type="button"
                            onClick={handleFormatCleanEmpty}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[9.5px] sm:text-[10.5px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg cursor-pointer transition flex items-center gap-0.5 sm:gap-1"
                            title="Remove completely blank or whitespace-only lines"
                          >
                            🧹 Erase Blank Lines
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleFormatStripComments}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[9.5px] sm:text-[10.5px] font-bold bg-white hover:bg-slate-105 border border-slate-200 text-slate-700 rounded-lg cursor-pointer transition flex items-center gap-0.5 sm:gap-1"
                            title="Remove lines starting with #, //, or -- comments"
                          >
                            💬 Strip Comment Lines
                          </button>

                          <button
                            type="button"
                            onClick={handleFormatUppercase}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[9.5px] sm:text-[10.5px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg cursor-pointer transition flex items-center gap-0.5 sm:gap-1"
                            title="Make all codes uppercase to match standard structure"
                          >
                            🔤 Match Casing (UPPER)
                          </button>

                          <button
                            type="button"
                            onClick={handleFormatAlphaSort}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[9.5px] sm:text-[10.5px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg cursor-pointer transition flex items-center gap-0.5 sm:gap-1"
                            title="Sort promo codes alphabetically"
                          >
                            🔀 Sort Alphabetically
                          </button>
                        </div>

                        {/* Keyword Filter / Line Eraser inline control */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200/50">
                          <label className="text-[10px] font-extrabold text-slate-550 shrink-0 uppercase tracking-wide">
                            Erase lines containing:
                          </label>
                          <div className="relative flex-1 flex flex-col sm:flex-row gap-1.5 w-full font-sans">
                            <input
                              type="text"
                              value={eraseKeyword}
                              onChange={(e) => setEraseKeyword(e.target.value)}
                              placeholder="e.g. 'expired', 'test', 'error', 'ignore'"
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 font-mono font-medium"
                            />
                            <button
                              type="button"
                              onClick={handleEraseLinesContaining}
                              disabled={!eraseKeyword.trim()}
                              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight transition cursor-pointer shrink-0 ${
                                eraseKeyword.trim()
                                  ? "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100/50"
                                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              }`}
                            >
                              ✕ Erase Matching Lines
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <span className="text-[11px] sm:text-[11.5px] self-start sm:self-auto text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-md font-mono font-bold">
                          {normalizedPastedCodes.length} distinctive code{normalizedPastedCodes.length === 1 ? "" : "s"} parsed
                        </span>
                        
                        <div className="flex gap-2 self-end sm:self-auto">
                          {inputText && (
                            <button
                              onClick={() => setInputText("")}
                              className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-150 font-bold rounded-lg text-slate-700 cursor-pointer transition shadow-3xs"
                            >
                              Clear Text
                            </button>
                          )}
                          <button
                            onClick={handleCompileSpecificCodes}
                            disabled={normalizedPastedCodes.length === 0}
                            className={`px-4 sm:px-5 py-2 rounded-lg font-bold text-xs shadow-3xs transition cursor-pointer flex items-center gap-1.5 ${
                              normalizedPastedCodes.length > 0
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Compile Targeted Report
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFlow === "all" && (
                    <div className="space-y-4 text-center py-4 animate-fade-in animate-duration-200" id="panel-all-flow">
                      <div className="max-w-md mx-auto space-y-2">
                        <Database className="w-10 h-10 text-emerald-600 mx-auto" />
                        <h4 className="text-xs font-black text-slate-950 uppercase tracking-wide">
                          Option 2: Active Portfolio Audit Directory
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-sans">
                          A comprehensive audit executing performance grading and average customer LTV profiles on every one of the <strong className="text-indigo-950 font-bold">{uniqueDbCodes.length} individual coupon codes</strong> captured in the database sheet.
                        </p>
                      </div>

                      <div className="pt-4 max-w-xs mx-auto">
                        <button
                          onClick={handleCompilePortfolio}
                          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Generate Full Portfolio Digest
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedFlow === "compare" && (
                    <div className="space-y-4 animate-fade-in" id="panel-compare-flow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase">
                            Option 3: Multi-Voucher Benchmarking Module
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Search and select at least 2 distinct codes to view side-by-side timeline and lifetime stats.
                          </p>
                        </div>

                        {/* Search filter input */}
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={compareSearch}
                            onChange={(e) => setCompareSearch(e.target.value)}
                            placeholder="Type to filter codes..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                          />
                        </div>
                      </div>

                      {/* Code checklist select box */}
                      <div className="border border-slate-205 rounded-xl bg-slate-50/25 p-3">
                        <div className="flex gap-2.5 mb-2.5 font-mono text-[10px] font-bold">
                          <button onClick={handleSelectAllCompare} className="text-emerald-700 hover:underline cursor-pointer">
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
                                    ? "bg-emerald-50/50 border-emerald-300 text-emerald-950 font-black font-mono" 
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-mono"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCompareCode(code)}
                                  className="accent-emerald-700 w-3.5 h-3.5"
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
                          className={`w-full sm:w-auto px-5 py-2 rounded-lg font-bold text-xs shadow-3xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            selectedCompareCodes.length >= 2
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          Compare selected codes
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        ) : (
          
          /* REPORT COMPILED VIEWPORT */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-5 select-text" id="report-dashboard">
            
            {/* Tab switch row */}
            <div className="flex border-b border-emerald-100 gap-6 shrink-0 select-none pb-2 items-center justify-between" id="workspace-tabs-strip">
              <div className="flex gap-4">
                <button
                  id="report-tab-btn"
                  onClick={() => setActiveTab2("report")}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
                    activeTab === "report"
                      ? "text-emerald-850 border-b-2 border-emerald-700 font-extrabold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  📊 Performance report dashboard
                </button>
                <button
                  id="explorer-tab-btn"
                  onClick={() => setActiveTab2("explorer")}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
                    activeTab === "explorer"
                      ? "text-emerald-850 border-b-2 border-emerald-700 font-extrabold"
                      : "text-slate-400 hover:text-slate-705"
                  }`}
                >
                  🔍 Source Data Registry
                </button>
              </div>

              {/* Reset view linkage */}
              <button
                onClick={handleResetWorkspace}
                className="text-[11px] text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Upload different database
              </button>
            </div>

            {/* TAB: EXPLORER SOURCE REGISTRY */}
            {activeTab === "explorer" ? (
              <div id="dynamic-explorer-dashboard" className="space-y-5 animate-fade-in">
                <DataExplorer dbRows={dbRows} fileName={fileName} />
              </div>
            ) : (
              
              /* TAB: GENERATED REPORT DASHBOARD */
              <div id="dynamic-reporting-dashboard" className="space-y-6">
                
                {/* 1. PORTFOLIO HEALTH SUMMARY WIDGET */}
                <section id="portfolio-health-summary" className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-3xs animate-fade-in font-sans">
                  <div className="border-b border-slate-100 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Executive Portfolio Health Summary
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Unified performance categorization indices mapping campaign strengths and yields
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold border border-emerald-100">
                        {foundReports.length} Codes Audited
                      </span>
                    </div>
                  </div>

                  {/* Healthy indicators grid */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    
                    {/* Stat 1 */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-mono">
                        Codes Analyzed
                      </p>
                      <p className="text-lg font-black text-slate-900 font-display">
                        {portfolioHealth?.total}
                      </p>
                      <p className="text-[9px] text-slate-450 font-medium">Mapped coupon targets</p>
                    </div>

                    {/* Stat 2 */}
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-850 font-mono">
                        Strong Codes
                      </p>
                      <p className="text-lg font-black text-emerald-700 font-display">
                        {portfolioHealth?.strong}
                      </p>
                      <p className="text-[9px] text-emerald-600 font-semibold">&ge; 40% conversion</p>
                    </div>

                    {/* Stat 3 */}
                    <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl space-y-1 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-850 font-mono">
                        Average Codes
                      </p>
                      <p className="text-lg font-black text-amber-700 font-display">
                        {portfolioHealth?.average}
                      </p>
                      <p className="text-[9px] text-amber-600 font-semibold">20-39% conversion</p>
                    </div>

                    {/* Stat 4 */}
                    <div className="p-3 bg-rose-50/30 border border-rose-100 rounded-xl space-y-1 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-850 font-mono">
                        Weak Codes
                      </p>
                      <p className="text-lg font-black text-rose-700 font-display">
                        {portfolioHealth?.weak}
                      </p>
                      <p className="text-[9px] text-rose-600 font-semibold">&lt; 20% conversion</p>
                    </div>

                    {/* Stat 5 */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-mono">
                        Portfolio Conv
                      </p>
                      <p className="text-lg font-black text-indigo-750 font-display">
                        {summary.blendedConversionRate.toFixed(1)}%
                      </p>
                      <p className="text-[9px] text-slate-450 font-medium font-sans">Cohort input blended</p>
                    </div>

                    {/* Stat 6 */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-mono">
                        Portfolio LTV
                      </p>
                      <p className="text-lg font-black text-emerald-800 font-display">
                        ${Math.round(summary.averageLTV12).toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-450 font-medium font-sans">Mean 12M customer LTV</p>
                    </div>

                  </div>
                </section>

                {/* 2. PRIMARY KPI metrics cards */}
                <section id="kpi-cards-section">
                  <DashboardMetrics summary={summary} />
                </section>

                {/* 3. KEY FINDINGS SECTION */}
                <section id="key-findings-section" className="animate-fade-in bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
                  <KeyFindingsSection reports={foundReports} summary={summary} />
                </section>

                {/* 4. VISUAL METRICS AND SMART WIDGET PANEL */}
                <section id="charts-visualizers-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Performance Chart */}
                  <div className="lg:col-span-8 flex flex-col justify-between">
                    <PerformanceChart reports={foundReports} channels={channelSummary} />
                  </div>

                  {/* Portfolio summary helper replacement */}
                  <div className="lg:col-span-4 flex flex-col">
                    <PortfolioSummaryWidget summary={summary} reports={foundReports} channels={channelSummary} />
                  </div>

                </section>

                {/* 5. PROVINCE INTELLIGENCE SECTION Automatically embedded in generated reports! */}
                <section id="report-province-section" className="bg-white border border-slate-205 rounded-2xl p-6 shadow-xs">
                  <div className="mb-4">
                    <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-800">
                      📍 Geographical Demographics Breakdown
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Geographic segment performance automatically compiled from province fields.
                    </p>
                  </div>
                  <ProvinceIntelligence dbRows={dbRows} foundReports={foundReports} />
                </section>

                {/* 5.5 UNMATCHED VOUCHER NOTIFICATIONS & CORRECTION WORKFLOW */}
                {missingCodes.length > 0 && (
                  <section id="report-missing-codes-section">
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
                  </section>
                )}

                {/* 6. DETAILED DATA TABLE breakdown */}
                <section id="report-details-section">
                  <DetailedTable reports={foundReports} channels={uniqueChannels} />
                </section>

              </div>
            )}

            {/* Base operational footer */}
            <footer id="saas-footer" className="text-center text-[10px] text-slate-400 font-mono py-4 border-t border-slate-200 mt-auto shrink-0 flex items-center justify-between">
              <span>Fresh Prep Campaign Intelligence &copy; {new Date().getFullYear()}</span>
              <span>Validated 100% Client-Side inside secure sandboxed event layers.</span>
            </footer>

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
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
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
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-850 rounded-lg transition shadow-2xs font-sans cursor-pointer flex items-center gap-2"
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
                  <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900">
                    EVENT CODE AUDIT EXECUTIVE PERFORMANCE SUMMARY
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-1">
                    Analysis Compiled: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-zinc-900 text-white font-mono font-bold text-[10px] rounded">
                    INTERNAL CONFIDENTIAL
                  </span>
                  <p className="text-[10px] font-mono mt-2 text-zinc-500">Fresh Prep Event Intelligence Report</p>
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
                  <div className="flex justify-between border-b pb-1 text-emerald-800">
                    <dt className="font-medium">Vouchers Located in Export:</dt>
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
                    <dd className="font-mono text-zinc-800">{fileName || "Staged CSV/XLSX Export"}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <dt className="text-zinc-650">Total File Records:</dt>
                    <dd className="font-mono font-bold text-zinc-800">{dbRows.length.toLocaleString()}</dd>
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
                      <td className="py-1 px-2 text-right font-mono font-bold text-emerald-800">{r.efficiencyRatio.toFixed(1)}x</td>
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
