/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
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
  Wrench,
} from "lucide-react";
import { FileUploadState } from "../../hooks/useFileUpload";
import { AnalysisState, AnalysisActions } from "../../hooks/useAnalysis";
import { CodeFormattingActions } from "../../hooks/useCodeFormatting";

interface WizardFlowProps {
  fileState: FileUploadState;
  analysis: { state: AnalysisState; actions: AnalysisActions };
  formatting: CodeFormattingActions;
  onReset: () => void;
}

export function WizardFlow({ fileState, analysis, formatting, onReset }: WizardFlowProps): React.ReactElement {
  const { state, actions } = analysis;
  const [showColumns, setShowColumns] = useState(false);
  const [showTextTools, setShowTextTools] = useState(false);

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

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 bg-[#f8f7f5] flex flex-col items-center gap-4"
      id="wizard-screen"
    >
      {/* ── Compact file bar ─────────────────────────────────────── */}
      <div
        className="w-full max-w-4xl"
        style={{ opacity: 0, animation: "slideUp 180ms var(--ease-out) forwards" }}
      >
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#eef4f1] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#2b5346]" />
            </div>
            {isValid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2b5346] shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-[#850b0b] shrink-0" />
            )}
            <span className="text-sm font-medium text-[#1a1a1a] font-mono truncate">
              {fileState.fileName}
            </span>
            <span className="text-[#e5e5e5]">·</span>
            <span className="text-xs text-[#a1a1a1] shrink-0">
              {fileState.dbRows.length.toLocaleString()} records
            </span>
            <button
              onClick={() => setShowColumns(v => !v)}
              className="text-[10px] font-mono text-[#2b5346] hover:underline shrink-0 flex items-center gap-0.5 cursor-pointer"
            >
              {totalDetected} columns
              {showColumns ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <div className="flex-1" />
          <button
            onClick={onReset}
            className="shrink-0 flex items-center gap-1.5 text-xs text-[#a1a1a1] hover:text-[#1a1a1a] cursor-pointer font-medium"
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
          className="w-full max-w-4xl bg-white rounded-2xl border border-[#e5e5e5] shadow-sm overflow-hidden"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  flow: "paste" as const,
                  icon: <Clipboard className="w-4 h-4" />,
                  label: "Specific Codes",
                  sub: "Analyze a custom list you paste in",
                },
                {
                  flow: "all" as const,
                  icon: <Database className="w-4 h-4" />,
                  label: "Full Dataset",
                  sub: `All ${fileState.uniqueDbCodes.length.toLocaleString()} unique codes`,
                },
                {
                  flow: "compare" as const,
                  icon: <Scale className="w-4 h-4" />,
                  label: "Compare Codes",
                  sub: "Side-by-side comparison",
                },
              ].map(({ flow, icon, label, sub }) => {
                const active = state.selectedFlow === flow;
                return (
                  <button
                    key={flow}
                    onClick={() => actions.setSelectedFlow(flow)}
                    className={`text-left px-4 py-3.5 rounded-xl border cursor-pointer flex items-center gap-3 ${
                      active
                        ? "bg-[#2b5346] border-[#2b5346] shadow-md"
                        : "bg-[#f8f7f5] border-[#e5e5e5] hover:border-[#2b5346]/40 hover:bg-white"
                    }`}
                    style={{ transition: "background-color 150ms var(--ease-out), border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)" }}
                  >
                    <span className={active ? "text-white/80" : "text-[#2b5346]"}>
                      {icon}
                    </span>
                    <span>
                      <span className={`block text-xs font-semibold ${active ? "text-white" : "text-[#1a1a1a]"}`}>
                        {label}
                      </span>
                      <span className={`block text-[10px] mt-0.5 ${active ? "text-white/60" : "text-[#a1a1a1]"}`}>
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
                <textarea
                  value={state.inputText}
                  onChange={e => actions.setInputText(e.target.value)}
                  placeholder={"Paste promo codes here — one per line\n\nFPFREEMEALS\nGA75BRAND18\nEVSHIPYARDS20"}
                  className="w-full h-40 font-mono text-sm border border-[#e5e5e5] rounded-xl p-4 bg-[#f8f7f5] focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-transparent focus:bg-white resize-none placeholder:text-[#c8c8c8]"
                  style={{ transition: "background-color 150ms var(--ease-out)" }}
                />

                <div className="flex items-center justify-between gap-3">
                  {/* Code count + tools toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#2b5346] bg-[#eef4f1] border border-[#2b5346]/20 px-2.5 py-1 rounded font-mono">
                      {state.normalizedPastedCodes.length} {state.normalizedPastedCodes.length === 1 ? "code" : "codes"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTextTools(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-[#a1a1a1] hover:text-[#3d3d3d] cursor-pointer font-medium px-2 py-1 rounded hover:bg-[#f8f7f5]"
                      style={{ transition: "color 150ms var(--ease-out)" }}
                    >
                      <Wrench className="w-3 h-3" />
                      Clean up
                      {showTextTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
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
                      onClick={actions.compileSpecificCodes}
                      disabled={state.normalizedPastedCodes.length === 0}
                      className={`px-5 py-2 rounded-lg font-semibold text-xs cursor-pointer inline-flex items-center gap-2 ${
                        state.normalizedPastedCodes.length > 0
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

                {/* Text tools — collapsed by default */}
                {showTextTools && (
                  <div className="bg-[#f8f7f5] border border-[#e5e5e5] rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "Remove blanks", fn: () => actions.setInputText(formatting.cleanEmptyLines(state.inputText)) },
                        { label: "Strip comments", fn: () => actions.setInputText(formatting.stripComments(state.inputText)) },
                        { label: "Uppercase all", fn: () => actions.setInputText(formatting.toUppercase(state.inputText)) },
                        { label: "Sort A → Z", fn: () => actions.setInputText(formatting.sortAlphabetically(state.inputText)) },
                      ].map(({ label, fn }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={fn}
                          className="px-3 py-2 text-xs font-medium bg-white hover:bg-[#eef4f1] border border-[#e5e5e5] text-[#3d3d3d] rounded-lg cursor-pointer"
                          style={{ transition: "background-color 150ms var(--ease-out)" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-[#e5e5e5]">
                      <span className="text-[10px] font-semibold text-[#a1a1a1] uppercase tracking-wide shrink-0 font-mono">
                        Remove lines with:
                      </span>
                      <input
                        type="text"
                        value={state.eraseKeyword}
                        onChange={e => actions.setEraseKeyword(e.target.value)}
                        placeholder="expired, test, …"
                        className="flex-1 px-3 py-1.5 border border-[#e5e5e5] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-transparent bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          actions.setInputText(formatting.eraseLinesContaining(state.inputText, state.eraseKeyword));
                          actions.setEraseKeyword("");
                        }}
                        disabled={!state.eraseKeyword.trim()}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                          state.eraseKeyword.trim()
                            ? "bg-[#ffd0d0] border border-[#850b0b]/20 text-[#850b0b] hover:bg-[#ffb8b8]"
                            : "bg-[#f8f7f5] text-[#a1a1a1] border border-[#e5e5e5] cursor-not-allowed"
                        }`}
                        style={{ transition: "background-color 150ms var(--ease-out)" }}
                      >
                        Erase
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ALL flow */}
            {state.selectedFlow === "all" && (
              <div className="flex flex-col items-center py-4 gap-4" id="panel-all-flow">
                <p className="text-sm text-[#3d3d3d] text-center max-w-sm leading-relaxed">
                  Analyze all <strong className="text-[#1a1a1a]">{fileState.uniqueDbCodes.length.toLocaleString()} codes</strong> in your dataset. This creates a full performance profile for every code.
                </p>
                <button
                  onClick={() => actions.compilePortfolio(fileState.uniqueDbCodes)}
                  className="px-6 py-2.5 rounded-lg bg-[#2b5346] hover:bg-[#0d3a2f] text-white font-semibold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
                  style={{ transition: "background-color 150ms var(--ease-out), transform 100ms var(--ease-out)" }}
                  onMouseDown={pressMd}
                  onMouseUp={pressUp}
                  onMouseLeave={pressUp}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analyze All Codes
                </button>
              </div>
            )}

            {/* COMPARE flow */}
            {state.selectedFlow === "compare" && (
              <div className="space-y-4" id="panel-compare-flow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-[#3d3d3d]">
                    Select 2 or more codes to compare side-by-side.
                  </p>
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#a1a1a1]" />
                    <input
                      type="text"
                      value={state.compareSearch}
                      onChange={e => actions.setCompareSearch(e.target.value)}
                      placeholder="Filter codes…"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-[#f8f7f5] border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2b5346] focus:border-[#2b5346]"
                    />
                  </div>
                </div>

                <div className="border border-[#e5e5e5] rounded-xl bg-[#f8f7f5]/50 p-3">
                  <div className="flex items-center gap-3 mb-2.5 font-mono text-[10px] font-bold">
                    <button onClick={() => actions.selectAllCompareCodes(fileState.uniqueDbCodes)} className="text-[#2b5346] hover:underline cursor-pointer">
                      Select all
                    </button>
                    <button onClick={() => actions.clearCompareCodes()} className="text-[#a1a1a1] hover:underline cursor-pointer">
                      Clear
                    </button>
                    <span className="text-[#a1a1a1] ml-auto normal-case font-normal">
                      {state.filteredCompareCodes.length} of {fileState.uniqueDbCodes.length} shown
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {state.filteredCompareCodes.map(code => {
                      const checked = state.selectedCompareCodes.includes(code);
                      return (
                        <label
                          key={code}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer select-none ${
                            checked
                              ? "bg-[#eef4f1] border-[#2b5346] text-[#1a1a1a] font-semibold font-mono"
                              : "bg-white border-[#e5e5e5] text-[#3d3d3d] font-mono hover:border-[#2b5346]/30"
                          }`}
                          style={{ transition: "border-color 100ms var(--ease-out), background-color 100ms var(--ease-out)" }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => actions.toggleCompareCode(code)}
                            className="accent-[#2b5346] w-3.5 h-3.5 shrink-0"
                          />
                          <span className="truncate">{code}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#a1a1a1] font-mono">
                    {state.selectedCompareCodes.length} selected — need at least 2
                  </span>
                  <button
                    onClick={actions.compileComparison}
                    disabled={state.selectedCompareCodes.length < 2}
                    className={`px-5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
                      state.selectedCompareCodes.length >= 2
                        ? "bg-[#2b5346] hover:bg-[#0d3a2f] text-white shadow-sm"
                        : "bg-[#e5e5e5] text-[#a1a1a1] cursor-not-allowed"
                    }`}
                    style={{ transition: "background-color 150ms var(--ease-out), transform 100ms var(--ease-out)" }}
                    onMouseDown={pressMd}
                    onMouseUp={pressUp}
                    onMouseLeave={pressUp}
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

      {/* Invalid file state */}
      {!isValid && fileState.fileValidation && (
        <div
          className="w-full max-w-4xl bg-white rounded-2xl border border-[#e5e5e5] shadow-sm px-6 py-8 text-center"
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

    </div>
  );
}
