/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Clipboard,
  CheckCircle2,
  XCircle,
  Search,
  Database,
  BarChart3,
  Scale,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { FileUploadState } from "../../hooks/useFileUpload";
import { AnalysisState, AnalysisActions } from "../../hooks/useAnalysis";
import { CodeFormattingActions } from "../../hooks/useCodeFormatting";
import { CodeFixerModal, scanCodeInput } from "./components/CodeFixerModal";

interface WizardFlowProps {
  fileState: FileUploadState;
  analysis: { state: AnalysisState; actions: AnalysisActions };
  formatting: CodeFormattingActions;
  onReset: () => void;
  staticBdCodes?: string[];
}

export function WizardFlow({ fileState, analysis, formatting, onReset, staticBdCodes = [] }: WizardFlowProps): React.ReactElement {
  const { state, actions } = analysis;
  const [showColumns, setShowColumns] = useState(false);
  const [showCodeFixer, setShowCodeFixer] = useState(false);

  const isValid = fileState.fileValidation?.isValid;
  const requiredFound = fileState.fileValidation?.requiredFound ?? [];
  const optionalFound = fileState.fileValidation?.optionalFound ?? [];
  const totalDetected = requiredFound.length + optionalFound.length;

  const pressMd = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
  };
  const pressUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.transform = "";
  };

  // Static BD codes as a lookup set for cross-referencing file codes that
  // lack a channel column (the Looker export never includes channel).
  const staticBdSet = useMemo(
    () => new Set(staticBdCodes.map(c => c.toUpperCase())),
    [staticBdCodes],
  );

  // BD codes in the uploaded file: EV-prefix OR explicitly verified by the
  // built-in database. Never trust the uploaded file's channel for this.
  const bdCodeSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of fileState.dbRows) {
      const code = r.discount_code.trim().toUpperCase();
      if (code.startsWith("EV") || staticBdSet.has(code)) {
        s.add(code);
      }
    }
    return s;
  }, [fileState.dbRows, staticBdSet]);

  const bdCodes = useMemo(
    () => fileState.uniqueDbCodes.filter(c => bdCodeSet.has(c.toUpperCase())),
    [fileState.uniqueDbCodes, bdCodeSet],
  );

  // Static-only BD codes: in the static DB but not in the uploaded file
  const fileCodeSet = useMemo(
    () => new Set(fileState.uniqueDbCodes.map(c => c.toUpperCase())),
    [fileState.uniqueDbCodes],
  );
  const staticOnlyBdCodes = useMemo(
    () => staticBdCodes.filter(c => !fileCodeSet.has(c.toUpperCase())),
    [staticBdCodes, fileCodeSet],
  );
  const allLookupCodes = useMemo(
    () => Array.from(new Set([...fileState.uniqueDbCodes, ...staticBdCodes])).sort(),
    [fileState.uniqueDbCodes, staticBdCodes],
  );
  const inputScan = useMemo(
    () => scanCodeInput(state.inputText, allLookupCodes),
    [state.inputText, allLookupCodes],
  );

  const handleAnalyzeSpecificCodes = () => {
    if (inputScan.entries.length === 0) {
      alert("Please enter or paste at least one discount code to analyze.");
      return;
    }
    if (inputScan.hasIssues) {
      setShowCodeFixer(true);
      return;
    }
    actions.compileSpecificCodes(inputScan.entries.map(entry => entry.resolved!).filter(Boolean));
  };

  const bdDisplayCount = state.bdFilter ? bdCodes.length : fileState.uniqueDbCodes.length;

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 bg-[#f8f7f5] flex flex-col items-center gap-5"
      id="wizard-screen"
    >
      {/* ── Compact file bar ─────────────────────────────────────── */}
      <div
        className="w-full max-w-xl"
        style={{ opacity: 0, animation: "slideUp 180ms var(--ease-out) forwards" }}
      >
        <div className="flex items-center gap-3 bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[#eef4f1] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-[#2b5346]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {isValid
                ? <CheckCircle2 className="w-3 h-3 text-[#2b5346] shrink-0" />
                : <XCircle className="w-3 h-3 text-[#850b0b] shrink-0" />
              }
              <span className="text-sm font-semibold text-[#1a1a1a] font-mono truncate">{fileState.fileName}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#a1a1a1] font-mono">{fileState.dbRows.length.toLocaleString()} records</span>
              <span className="text-[#e5e5e5]">·</span>
              <button
                onClick={() => setShowColumns(v => !v)}
                className="text-[10px] font-mono text-[#2b5346] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {totalDetected} columns
                {showColumns ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
            </div>
          </div>
          <button
            onClick={onReset}
            className="shrink-0 flex items-center gap-1.5 text-[11px] text-[#a1a1a1] hover:text-[#1a1a1a] cursor-pointer font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#f8f7f5]"
            style={{ transition: "color 150ms var(--ease-out)" }}
          >
            <RefreshCw className="w-3 h-3" />
            Replace
          </button>
        </div>

        {/* Column detail panel — hidden by default */}
        {showColumns && (
          <div className="mt-3 px-1 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wider font-mono mb-1.5">
                Required
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "discount_code", label: "Promo Code" },
                  { key: "Signups", label: "Signups" },
                  { key: "Paying cx", label: "Customers" },
                  { key: "Conversion", label: "Conversion Rate" },
                ].map(col => {
                  const ok = requiredFound.includes(col.key);
                  return (
                    <span
                      key={col.key}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border"
                      style={
                        ok
                          ? { backgroundColor: "#eef4f1", color: "#2b5346", borderColor: "rgba(43,83,70,0.2)" }
                          : { backgroundColor: "#ffd0d0", color: "#850b0b", borderColor: "rgba(133,11,11,0.2)" }
                      }
                    >
                      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {col.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wider font-mono mb-1.5">
                Optional
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "channel", label: "Channel" },
                  { key: "Province", label: "Province" },
                  { key: "total_discount_used", label: "Discount" },
                  { key: "Sum LTV 12", label: "LTV 12m" },
                  { key: "Avg LTV 12", label: "Avg LTV" },
                  { key: "Total Spend", label: "Total Spend" },
                  { key: "CPA", label: "CPA" },
                ].map(col => {
                  const ok = optionalFound.includes(col.key);
                  return (
                    <span
                      key={col.key}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border"
                      style={{ backgroundColor: "#f8f7f5", color: ok ? "#3d3d3d" : "#a1a1a1", borderColor: "#e5e5e5" }}
                    >
                      {ok
                        ? <CheckCircle2 className="w-2.5 h-2.5 text-[#2b5346]" />
                        : <span className="w-2.5 h-2.5 rounded-full border border-[#e5e5e5] inline-block" />
                      }
                      {col.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main workspace card ───────────────────────────────────── */}
      {isValid && (
        <div
          className="w-full max-w-xl bg-white rounded-2xl border border-[#e5e5e5] shadow-sm overflow-hidden"
          style={{ opacity: 0, animation: "slideUp 200ms var(--ease-out) 60ms forwards" }}
        >

          {/* Event label section */}
          <div className="px-6 pt-6 pb-5 border-b border-[#f0f0f0]">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                Name this report
              </span>
              <span className="text-[10px] text-[#a1a1a1] font-mono">
                optional — one event, a regional batch, a full season
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
              <input
                type="text"
                value={state.eventName}
                onChange={e => actions.setEventName(e.target.value)}
                placeholder="e.g. Night Market June 14 · Fall Alberta Events · Q4 2025 Season"
                className="w-full px-3.5 py-2.5 text-sm border border-[#e5e5e5] rounded-lg bg-[#f8f7f5] focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-transparent focus:bg-white placeholder:text-[#c0c0c0]"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              />
              <input
                type="date"
                value={state.eventDate}
                onChange={e => actions.setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#e5e5e5] rounded-lg bg-[#f8f7f5] focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-transparent focus:bg-white text-[#3d3d3d]"
                style={{ transition: "background-color 150ms var(--ease-out)" }}
              />
            </div>
          </div>

          {/* Mode selection */}
          <div className="px-6 pt-5 pb-4">
            <p className="text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wider font-mono mb-3">
              Choose your analysis
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  flow: "paste" as const,
                  icon: <Clipboard className="w-4 h-4" />,
                  label: "Specific Codes",
                  sub: "Paste a list of your event codes",
                  hint: null as string | null,
                },
                {
                  flow: "all" as const,
                  icon: <Database className="w-4 h-4" />,
                  label: "Full Dataset",
                  sub: `${fileState.uniqueDbCodes.length.toLocaleString()} unique codes`,
                  hint: null as string | null,
                },
                {
                  flow: "compare" as const,
                  icon: <Scale className="w-4 h-4" />,
                  label: "Compare",
                  sub: "Year-over-year event trends",
                  hint: "Multi-edition" as string | null,
                },
              ].map(({ flow, icon, label, sub, hint }) => {
                const active = state.selectedFlow === flow;
                return (
                  <button
                    key={flow}
                    onClick={() => actions.setSelectedFlow(flow)}
                    className={`text-left px-4 py-4 rounded-xl border cursor-pointer flex flex-col gap-2.5 ${
                      active
                        ? "bg-[#2b5346] border-[#2b5346] shadow-md"
                        : "bg-[#f8f7f5] border-[#e5e5e5] hover:border-[#2b5346]/40 hover:bg-white"
                    }`}
                    style={{ transition: "background-color 150ms var(--ease-out), border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)" }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className={active ? "text-white/80" : "text-[#2b5346]"}>{icon}</span>
                      {hint && <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                        active ? "bg-white/15 text-white/70" : "bg-[#f0f0ee] text-[#a1a1a1]"
                      }`}>{hint}</span>}
                    </div>
                    <span>
                      <span className={`block text-[13px] font-bold leading-tight ${active ? "text-white" : "text-[#1a1a1a]"}`}>
                        {label}
                      </span>
                      <span className={`block text-[10px] mt-0.5 leading-snug ${active ? "text-white/60" : "text-[#a1a1a1]"}`}>
                        {sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Analysis panel ──────────────────────────────────── */}
          <div className="border-t border-[#f0f0f0] px-6 py-5">

            {/* PASTE flow */}
            {state.selectedFlow === "paste" && (
              <div className="space-y-4" id="panel-paste-flow">
                <div className="relative">
                  <textarea
                    value={state.inputText}
                    onChange={e => actions.setInputText(e.target.value)}
                    placeholder={"Paste promo codes here — one code per line\n\nFPFREEMEALS\nGA75BRAND18\nEVSHIPYARDS20"}
                    className="w-full h-44 font-mono text-sm border border-[#e5e5e5] rounded-xl p-4 pr-14 bg-[#f8f7f5] focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-transparent focus:bg-white resize-none placeholder:text-[#c8c8c8]"
                    style={{ transition: "background-color 150ms var(--ease-out)" }}
                  />
                  <button
                    type="button"
                    onClick={() => state.inputText.trim() && setShowCodeFixer(true)}
                    disabled={!state.inputText.trim()}
                    className="absolute right-3 top-3 w-9 h-9 rounded-lg border border-[#d0e8e2] bg-white text-[#2b5346] flex items-center justify-center cursor-pointer hover:bg-[#eef4f1] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Scan and fix pasted codes"
                    aria-label="Scan and fix pasted codes"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <p className="absolute right-3 bottom-3 text-[8.5px] font-mono text-[#a1a1a1]">one per line</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {/* Code count + tools toggle */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#2b5346] bg-[#eef4f1] border border-[#2b5346]/20 px-2.5 py-1 rounded font-mono">
                      {inputScan.entries.length} {inputScan.entries.length === 1 ? "code" : "codes"}
                    </span>
                    <span className="text-[9px] font-mono text-[#a1a1a1]">
                      {inputScan.nonEmptyLines} line{inputScan.nonEmptyLines !== 1 ? "s" : ""}
                    </span>
                    {inputScan.hasIssues && state.inputText.trim() && (
                      <button
                        type="button"
                        onClick={() => setShowCodeFixer(true)}
                        className="text-[9px] font-mono font-semibold text-[#9b4a1c] bg-[#fff8f4] border border-[#f0d1c1] px-2 py-1 rounded-lg cursor-pointer"
                      >
                        Review {inputScan.missing.length > 0 ? `${inputScan.missing.length} unmatched` : "cleanup"}
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {state.inputText && (
                      <button
                        onClick={() => actions.setInputText("")}
                        className="px-3 py-2 text-xs font-medium text-[#a1a1a1] hover:text-[#3d3d3d] hover:bg-[#f8f7f5] rounded-lg cursor-pointer"
                        style={{ transition: "color 150ms var(--ease-out)" }}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={handleAnalyzeSpecificCodes}
                      disabled={inputScan.entries.length === 0}
                      className={`px-5 py-2 rounded-lg font-semibold text-xs cursor-pointer inline-flex items-center gap-2 ${
                        inputScan.entries.length > 0
                          ? "bg-[#2b5346] hover:bg-[#0d3a2f] text-white shadow-sm"
                          : "bg-[#e5e5e5] text-[#a1a1a1] cursor-not-allowed"
                      }`}
                      style={{ transition: "background-color 150ms var(--ease-out), transform 100ms var(--ease-out)" }}
                      onMouseDown={pressMd}
                      onMouseUp={pressUp}
                      onMouseLeave={pressUp}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Analyze Codes
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ALL flow */}
            {state.selectedFlow === "all" && (
              <div className="flex flex-col items-center py-4 gap-4" id="panel-all-flow">
                <p className="text-sm text-[#3d3d3d] text-center max-w-sm leading-relaxed">
                  Analyze{" "}
                  <strong className="text-[#1a1a1a]">
                    {bdDisplayCount.toLocaleString()} {state.bdFilter ? "BD event" : ""} codes
                  </strong>
                  {state.bdFilter && staticOnlyBdCodes.length > 0 && (
                    <> + <strong className="text-[#1a1a1a]">{staticOnlyBdCodes.length.toLocaleString()} built-in BD codes</strong></>
                  )}{" "}
                  in your dataset.
                </p>

                {/* BD filter toggle */}
                <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#e5e5e5] bg-[#f8f7f5] cursor-pointer select-none">
                  <div
                    onClick={() => actions.setBdFilter(!state.bdFilter)}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${
                      state.bdFilter ? "bg-[#2b5346]" : "bg-[#d4d4d4]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
                        state.bdFilter ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                  <span className="text-xs text-[#3d3d3d] font-medium">
                    BD codes only
                    <span className="block text-[10px] text-[#a1a1a1] font-normal mt-0.5">
                      EV-prefix + BusinessDevelopment channel ({bdCodes.length.toLocaleString()} codes)
                    </span>
                  </span>
                </label>

                <button
                  onClick={() => actions.compilePortfolio(
                    state.bdFilter
                      ? Array.from(new Set([...bdCodes, ...staticOnlyBdCodes]))
                      : fileState.uniqueDbCodes
                  )}
                  className="px-6 py-2.5 rounded-lg bg-[#2b5346] hover:bg-[#0d3a2f] text-white font-semibold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
                  style={{ transition: "background-color 150ms var(--ease-out), transform 100ms var(--ease-out)" }}
                  onMouseDown={pressMd}
                  onMouseUp={pressUp}
                  onMouseLeave={pressUp}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analyze{state.bdFilter ? " BD" : " All"} Codes
                </button>
              </div>
            )}

            {/* COMPARE flow */}
            {state.selectedFlow === "compare" && (
              <div className="space-y-4" id="panel-compare-flow">
                {/* Purpose copy */}
                <p className="text-[11px] text-[#a1a1a1] font-mono leading-relaxed">
                  Pick multiple editions of the same event — label each year, then compare conversion, volume, and LTV trends.
                </p>

                {/* Search — full width */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a1a1a1]" />
                  <input
                    type="text"
                    value={state.compareSearch}
                    onChange={e => actions.setCompareSearch(e.target.value)}
                    placeholder="Search codes…"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#f8f7f5] border border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2b5346] focus:border-[#2b5346] focus:bg-white"
                    style={{ transition: "background-color 150ms var(--ease-out)" }}
                  />
                </div>

                {/* Code grid */}
                <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2 border-b border-[#f0f0ee] bg-[#fafafa]">
                    <button onClick={() => actions.selectAllCompareCodes(fileState.uniqueDbCodes)} className="text-[10px] font-semibold font-mono text-[#2b5346] hover:underline cursor-pointer">
                      Select all
                    </button>
                    <button onClick={() => actions.clearCompareCodes()} className="text-[10px] font-mono text-[#a1a1a1] hover:underline cursor-pointer">
                      Clear
                    </button>
                    <span className="text-[10px] font-mono text-[#c8c8c8] ml-auto">
                      {state.filteredCompareCodes.length.toLocaleString()} of {fileState.uniqueDbCodes.length.toLocaleString()} shown
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#f0f0f0] max-h-52 overflow-y-auto">
                    {state.filteredCompareCodes.map(code => {
                      const selIdx = state.selectedCompareCodes.indexOf(code);
                      const checked = selIdx !== -1;
                      return (
                        <button
                          key={code}
                          onClick={() => actions.toggleCompareCode(code)}
                          className={`text-left px-3 py-2.5 text-[11px] font-mono cursor-pointer flex items-center gap-2 select-none ${
                            checked
                              ? "bg-[#eef4f1] text-[#1a1a1a] font-semibold"
                              : "bg-white text-[#3d3d3d] hover:bg-[#f8f7f5]"
                          }`}
                          style={{ transition: "background-color 100ms var(--ease-out)" }}
                        >
                          {checked ? (
                            <span className="w-4 h-4 rounded-full bg-[#2b5346] text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                              {selIdx + 1}
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-[#d4d4d4] shrink-0" />
                          )}
                          <span className="truncate">{code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected editions + labels — unified */}
                {state.selectedCompareCodes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[#3d3d3d] uppercase tracking-wider font-mono">
                        {state.selectedCompareCodes.length} edition{state.selectedCompareCodes.length !== 1 ? "s" : ""} selected
                      </span>
                      {state.selectedCompareCodes.length >= 2 && (
                        <span className="text-[9px] font-mono text-[#2b5346] bg-[#eef4f1] border border-[#2b5346]/20 px-1.5 py-0.5 rounded">
                          ready
                        </span>
                      )}
                    </div>
                    {state.selectedCompareCodes.map((code, idx) => (
                      <div key={code} className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#2b5346] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-[10.5px] text-[#3d3d3d] shrink-0 w-28 truncate">{code}</span>
                        <span className="text-[#d4d4d4] shrink-0 text-xs">→</span>
                        <input
                          type="text"
                          value={state.editionLabels[code] ?? code}
                          onChange={e => actions.setEditionLabel(code, e.target.value)}
                          placeholder="e.g. 2022, Year 1, TELUS BC"
                          className="flex-1 px-2.5 py-1.5 text-xs border border-[#e5e5e5] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2b5346] focus:border-[#2b5346] font-mono"
                        />
                        <button
                          onClick={() => actions.toggleCompareCode(code)}
                          className="text-[#c8c8c8] hover:text-[#850b0b] cursor-pointer shrink-0"
                          title="Remove"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action bar */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[10px] font-mono text-[#a1a1a1]">
                    {state.selectedCompareCodes.length < 2
                      ? `select ${Math.max(0, 2 - state.selectedCompareCodes.length)} more to compare`
                      : `${state.selectedCompareCodes.length} editions · ready`
                    }
                  </span>
                  <button
                    onClick={actions.compileComparison}
                    disabled={state.selectedCompareCodes.length < 2}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
                      state.selectedCompareCodes.length >= 2
                        ? "bg-[#2b5346] hover:bg-[#0d3a2f] text-white shadow-sm"
                        : "bg-[#f0f0ee] text-[#c8c8c8] cursor-not-allowed"
                    }`}
                    style={{ transition: "background-color 150ms var(--ease-out), transform 100ms var(--ease-out)" }}
                    onMouseDown={pressMd}
                    onMouseUp={pressUp}
                    onMouseLeave={pressUp}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Compare
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Invalid file state */}
      {!isValid && fileState.fileValidation && (
        <div
          className="w-full max-w-xl bg-white rounded-2xl border border-[#e5e5e5] shadow-sm px-6 py-8 text-center"
          style={{ opacity: 0, animation: "slideUp 200ms var(--ease-out) 60ms forwards" }}
        >
          <XCircle className="w-8 h-8 text-[#850b0b] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1a1a1a] mb-1">Missing required columns</p>
          <p className="text-xs text-[#3d3d3d]">
            This file is missing: {fileState.fileValidation.requiredMissing.join(", ")}. Update the export and re-upload.
          </p>
          <button
            onClick={onReset}
            className="mt-5 px-4 py-2 bg-[#2b5346] text-white text-xs font-medium rounded-lg hover:bg-[#0d3a2f] cursor-pointer inline-flex items-center gap-2"
            style={{ transition: "background-color 150ms var(--ease-out)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Upload a different file
          </button>
        </div>
      )}

      {showCodeFixer && (
        <CodeFixerModal
          rawText={state.inputText}
          allCodes={allLookupCodes}
          onClose={() => setShowCodeFixer(false)}
          onApply={(codes, analyze) => {
            actions.setInputText(codes.join("\n"));
            setShowCodeFixer(false);
            if (analyze) actions.compileSpecificCodes(codes);
          }}
        />
      )}

    </div>
  );
}
