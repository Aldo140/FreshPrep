/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
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

  return (
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
              <p className="text-sm font-medium text-[#1a1a1a] truncate">{fileState.fileName}</p>
              <p className="text-xs text-[#a1a1a1] font-mono">{fileState.dbRows.length.toLocaleString()} records loaded</p>
            </div>
          </div>
          <button
            onClick={onReset}
            className="shrink-0 flex items-center gap-1.5 text-xs text-[#3d3d3d] hover:text-[#1a1a1a] cursor-pointer font-medium"
            style={{ transition: 'color 150ms var(--ease-out)' }}
          >
            <RefreshCw className="w-3 h-3" />
            Replace
          </button>
        </div>

        {/* Status banner */}
        {fileState.fileValidation?.isValid ? (
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
                const ok = fileState.fileValidation?.requiredFound.includes(col.key);
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
                const ok = fileState.fileValidation?.optionalFound.includes(col.key);
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
      {fileState.fileValidation?.isValid && (
        <div className="w-full max-w-4xl space-y-4 sm:space-y-5">
          <h3 className="text-xs font-semibold text-[#3d3d3d] text-center uppercase tracking-wider">
            Choose your analysis
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">

            {/* OPTION 1: Specific Codes */}
            <div
              onClick={() => actions.setSelectedFlow("paste")}
              className={`p-5 sm:p-6 rounded-xl border text-left cursor-pointer ${
                state.selectedFlow === "paste"
                  ? "bg-white border-[#2b5346] shadow-lg ring-2 ring-[#2b5346] ring-opacity-30"
                  : "bg-white border-slate-300 hover:border-[#2b5346] shadow hover:shadow-md"
              }`}
              style={{ transition: 'box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-lg border ${
                  state.selectedFlow === "paste"
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
              onClick={() => actions.setSelectedFlow("all")}
              className={`p-5 sm:p-6 rounded-xl border text-left cursor-pointer ${
                state.selectedFlow === "all"
                  ? "bg-white border-[#2b5346] shadow-lg ring-2 ring-[#2b5346] ring-opacity-30"
                  : "bg-white border-slate-300 hover:border-[#2b5346] shadow hover:shadow-md"
              }`}
              style={{ transition: 'box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-lg border ${
                  state.selectedFlow === "all"
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
                Analyze all <strong className="text-slate-800">{fileState.uniqueDbCodes.length}</strong> unique codes in your dataset.
              </p>
            </div>

            {/* OPTION 3: Compare */}
            <div
              onClick={() => actions.setSelectedFlow("compare")}
              className={`p-5 sm:p-6 rounded-xl border text-left cursor-pointer ${
                state.selectedFlow === "compare"
                  ? "bg-white border-[#2b5346] shadow-lg ring-2 ring-[#2b5346] ring-opacity-30"
                  : "bg-white border-slate-300 hover:border-[#2b5346] shadow hover:shadow-md"
              }`}
              style={{ transition: 'box-shadow 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-lg border ${
                  state.selectedFlow === "compare"
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

            {state.selectedFlow === "paste" && (
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
                  value={state.inputText}
                  onChange={(e) => actions.setInputText(e.target.value)}
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
                      onClick={() => actions.setInputText(formatting.cleanEmptyLines(state.inputText))}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition"
                      title="Remove empty lines"
                    >
                      Remove Blanks
                    </button>

                    <button
                      type="button"
                      onClick={() => actions.setInputText(formatting.stripComments(state.inputText))}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition"
                      title="Remove comment lines"
                    >
                      Strip Comments
                    </button>

                    <button
                      type="button"
                      onClick={() => actions.setInputText(formatting.toUppercase(state.inputText))}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition"
                      title="Normalize to uppercase"
                    >
                      Uppercase All
                    </button>

                    <button
                      type="button"
                      onClick={() => actions.setInputText(formatting.sortAlphabetically(state.inputText))}
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
                        value={state.eraseKeyword}
                        onChange={(e) => actions.setEraseKeyword(e.target.value)}
                        placeholder="e.g. 'expired', 'test'"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2b5346] focus:border-[#2b5346]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          actions.setInputText(formatting.eraseLinesContaining(state.inputText, state.eraseKeyword));
                          actions.setEraseKeyword("");
                        }}
                        disabled={!state.eraseKeyword.trim()}
                        className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight transition cursor-pointer shrink-0 ${
                          state.eraseKeyword.trim()
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
                    {state.normalizedPastedCodes.length} code{state.normalizedPastedCodes.length === 1 ? "" : "s"} loaded
                  </span>

                  <div className="flex gap-2 self-end sm:self-auto">
                    {state.inputText && (
                      <button
                        onClick={() => actions.setInputText("")}
                        className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => actions.compileSpecificCodes()}
                      disabled={state.normalizedPastedCodes.length === 0}
                      className={`px-4 sm:px-5 py-2 rounded-lg font-semibold text-xs cursor-pointer inline-flex items-center gap-2 ${
                        state.normalizedPastedCodes.length > 0
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

            {state.selectedFlow === "all" && (
              <div className="space-y-4 py-4" id="panel-all-flow">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="w-6 h-6 text-[#2b5346]" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Full Dataset Analysis
                    </h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Analyze all <strong className="font-semibold text-slate-800">{fileState.uniqueDbCodes.length} codes</strong> in your dataset automatically. This creates a comprehensive performance profile for each code.
                  </p>
                </div>

                <div className="pt-4 max-w-xs mx-auto">
                  <button
                    onClick={() => actions.compilePortfolio(fileState.uniqueDbCodes)}
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

            {state.selectedFlow === "compare" && (
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
                      value={state.compareSearch}
                      onChange={(e) => actions.setCompareSearch(e.target.value)}
                      placeholder="Type to filter codes..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2b5346] focus:border-[#2b5346] font-sans"
                    />
                  </div>
                </div>

                {/* Code checklist select box */}
                <div className="border border-slate-205 rounded-xl bg-slate-50/25 p-3">
                  <div className="flex gap-2.5 mb-2.5 font-mono text-[10px] font-bold">
                    <button onClick={() => actions.selectAllCompareCodes(fileState.uniqueDbCodes)} className="text-[#2b5346] hover:underline cursor-pointer">
                      [Select All]
                    </button>
                    <button onClick={() => actions.clearCompareCodes()} className="text-slate-500 hover:underline cursor-pointer">
                      [Select None]
                    </button>
                    <span className="text-slate-400 ml-auto lowercase">
                      showing {state.filteredCompareCodes.length} of {fileState.uniqueDbCodes.length} codes
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {state.filteredCompareCodes.map(code => {
                      const isChecked = state.selectedCompareCodes.includes(code);
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
                            onChange={() => actions.toggleCompareCode(code)}
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
                    {state.selectedCompareCodes.length} codes selected for comparison (need &ge; 2)
                  </span>

                  <button
                    onClick={() => actions.compileComparison()}
                    disabled={state.selectedCompareCodes.length < 2}
                    className={`w-full sm:w-auto px-5 py-2 rounded-lg font-bold text-xs shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 ${
                      state.selectedCompareCodes.length >= 2
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
  );
}
