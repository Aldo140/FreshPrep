/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertCircle, 
  AlertTriangle, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Copy, 
  Edit, 
  HelpCircle, 
  RefreshCw, 
  Sparkles, 
  Trash2, 
  Zap,
  CheckCircle,
  ThumbsUp,
  X
} from "lucide-react";
import { getFuzzySuggestionsWithConfidence, FuzzySuggestionResult } from "../utils/fuzzy";

interface MissingCodesSectionProps {
  missingCodes: string[];
  allDbCodes: string[];
  rawPastedCodes: string[];
  foundReports: any[];
  onApplyCorrections: (corrections: Record<string, string>) => void;
}

export default function MissingCodesSection({ 
  missingCodes, 
  allDbCodes = [], 
  rawPastedCodes = [],
  foundReports = [],
  onApplyCorrections 
}: MissingCodesSectionProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Correction selection states
  // selectionType: 'none' | 'suggest' | 'custom'
  const [selectionType, setSelectionType] = useState<Record<string, "none" | "suggest" | "custom">>({});
  // selectedValue: stores the selected suggestion code
  const [selectedValue, setSelectedValue] = useState<Record<string, string>>({});
  // customValue: stores the manually entered code
  const [customValue, setCustomValue] = useState<Record<string, string>>({});

  // Compute fuzzy recommendations with confidence rating for each missing code
  const codeSuggestions = useMemo(() => {
    if (allDbCodes.length === 0) return {};
    const suggestions: Record<string, FuzzySuggestionResult[]> = {};
    
    missingCodes.forEach((code) => {
      suggestions[code] = getFuzzySuggestionsWithConfidence(code, allDbCodes, 3);
    });
    
    return suggestions;
  }, [missingCodes, allDbCodes]);

  // Copy individual missing code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // State handles for selections
  const handleSelectSuggestion = (code: string, suggestion: string) => {
    setSelectionType((prev) => ({ ...prev, [code]: "suggest" }));
    setSelectedValue((prev) => ({ ...prev, [code]: suggestion }));
  };

  const handleSelectNone = (code: string) => {
    setSelectionType((prev) => ({ ...prev, [code]: "custom" }));
    if (customValue[code] === undefined) {
      setCustomValue((prev) => ({ ...prev, [code]: "" }));
    }
  };

  const handleResetCode = (code: string) => {
    setSelectionType((prev) => ({ ...prev, [code]: "none" }));
    setSelectedValue((prev) => ({ ...prev, [code]: "" }));
    setCustomValue((prev) => ({ ...prev, [code]: "" }));
  };

  // Accept All High Confidence Matches
  const handleAcceptAllHighConfidence = () => {
    const updatedType = { ...selectionType };
    const updatedValue = { ...selectedValue };

    missingCodes.forEach((code) => {
      const suggestions = codeSuggestions[code] || [];
      if (suggestions.length > 0) {
        const topSuggestion = suggestions[0];
        if (topSuggestion.tier === "High") {
          updatedType[code] = "suggest";
          updatedValue[code] = topSuggestion.code;
        }
      }
    });

    setSelectionType(updatedType);
    setSelectedValue(updatedValue);
  };

  // Compute active corrections queue list
  const activeCorrections = useMemo(() => {
    const list: Array<{ 
      original: string; 
      replacement: string; 
      confidence: string; 
      score: number | null;
      tier: "High" | "Medium" | "Low" | "Manual";
    }> = [];

    missingCodes.forEach((code) => {
      const type = selectionType[code] || "none";
      if (type === "suggest") {
        const val = selectedValue[code];
        if (val) {
          const suggestions = codeSuggestions[code] || [];
          const match = suggestions.find((s) => s.code === val);
          list.push({
            original: code,
            replacement: val,
            confidence: match ? `${match.score}%` : "Fuzzy Match",
            score: match ? match.score : null,
            tier: match ? match.tier : "Medium"
          });
        }
      } else if (type === "custom") {
        const val = customValue[code]?.trim();
        if (val) {
          list.push({
            original: code,
            replacement: val.toUpperCase(),
            confidence: "Manual Edit",
            score: null,
            tier: "Manual"
          });
        }
      }
    });

    return list;
  }, [missingCodes, selectionType, selectedValue, customValue, codeSuggestions]);

  // Statistics
  const submittedCount = rawPastedCodes.length;
  const matchedCount = foundReports.length;
  const unmatchedCount = missingCodes.length;
  const matchRate = submittedCount > 0 ? (matchedCount / submittedCount) * 100 : 0;

  // Staged Statistics projection
  const projectedMatched = matchedCount + activeCorrections.length;
  const projectedUnmatched = Math.max(0, unmatchedCount - activeCorrections.length);
  const projectedMatchRate = submittedCount > 0 ? (projectedMatched / submittedCount) * 100 : 0;

  // Apply Action Trigger
  const handleApply = () => {
    const correctionMapping: Record<string, string> = {};
    activeCorrections.forEach((corr) => {
      correctionMapping[corr.original] = corr.replacement;
    });

    if (Object.keys(correctionMapping).length === 0) {
      alert("No code replacements have been finalized. Select a suggestion or type a manual correction first.");
      return;
    }

    onApplyCorrections(correctionMapping);

    // Reset selection states
    setSelectionType({});
    setSelectedValue({});
    setCustomValue({});
  };

  if (missingCodes.length === 0) {
    return null;
  }

  // Count high confidence matches available in list
  const highConfidenceCount = missingCodes.filter((code) => {
    const suggestions = codeSuggestions[code] || [];
    return suggestions.length > 0 && suggestions[0].tier === "High";
  }).length;

  return (
    <div id="unmatched-corrections-panel" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden font-sans space-y-0">
      
      {/* SECTION HEADER */}
      <div className="p-5 border-b border-[#e78a58]/30 bg-gradient-to-r from-[#fef3ed]/40 via-[#fef3ed]/10 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#fef3ed] text-[#e78a58] border border-[#e78a58]/30 shrink-0">
            <Zap className="w-5 h-5 text-[#e78a58] animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              Unmatched Promo Codes Sandbox ({missingCodes.length})
            </h3>
            <p className="text-xs text-slate-505 mt-1 max-w-2xl leading-relaxed">
              We identified codes that aren't registered in your database sheet. Use the spelling debugger below to align tracking parameters and correct spelling, whitespace, or transposition differences immediately.
            </p>
          </div>
        </div>
        
        {highConfidenceCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleAcceptAllHighConfidence}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 hover:shadow transition cursor-pointer w-full md:w-auto shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e7bd27] shrink-0" />
            Accept All ({highConfidenceCount}) High-Confidence Matches
          </motion.button>
        )}
      </div>

      {/* SUMMARY STATISTICS BANNER */}
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-205 grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y-0 lg:divide-x divide-slate-200">
        
        <div className="flex flex-col justify-center py-1">
          <span className="text-[10px] font-bold text-slate-400 select-none uppercase tracking-widest block">Submitted Codes</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-black text-slate-800">{submittedCount}</span>
            <span className="text-[9.5px] text-slate-400">distinct total</span>
          </div>
        </div>

        <div className="flex flex-col justify-center py-1 pl-0 lg:pl-5">
          <span className="text-[10px] font-bold text-slate-400 select-none uppercase tracking-widest block">Matched Codes</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-black text-emerald-600">{matchedCount}</span>
            {activeCorrections.length > 0 && (
              <motion.span 
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xs text-emerald-700 font-extrabold"
              >
                → {projectedMatched}
              </motion.span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center py-1 pl-0 lg:pl-5">
          <span className="text-[10px] font-bold text-slate-400 select-none uppercase tracking-widest block">Unmatched Codes</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-black text-rose-600">{unmatchedCount}</span>
            {activeCorrections.length > 0 && (
              <motion.span 
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xs text-slate-450 font-bold"
              >
                → {projectedUnmatched}
              </motion.span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center py-1 pl-0 lg:pl-5">
          <span className="text-[10px] font-bold text-slate-400 select-none uppercase tracking-widest block">Current Match Rate</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-lg sm:text-xl font-black ${matchRate >= 80 ? "text-emerald-600" : matchRate >= 50 ? "text-[#e78a58]" : "text-rose-500"}`}>
              {matchRate.toFixed(1)}%
            </span>
            {activeCorrections.length > 0 && (
              <motion.div 
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-1 shrink-0"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[9.5px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded shrink-0">
                  {projectedMatchRate.toFixed(1)}% Projected
                </span>
              </motion.div>
            )}
          </div>
        </div>

      </div>

      {/* AUTO FORMAT CHIP BANNER */}
      <div className="bg-[#fef3ed]/35 border-b border-[#e78a58]/40 px-5 py-2.5 flex items-center justify-between text-[11px] text-[#9b4a1c]">
        <p className="flex items-center gap-1.5 leading-relaxed font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#e78a58] shrink-0" />
          <span><strong className="font-bold">Automated Spellcheck Active:</strong> Case mismatches, surrounding spacing, and common separators (dashes/underscores) are pre-aligned and matched silently. Only major typographic differences require verification below.</span>
        </p>
      </div>

      {/* TWO COLUMN WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-200">
        
        {/* CARDS LISTING - LEFT COLUMN */}
        <div className="xl:col-span-7 p-4 sm:p-5 space-y-4 max-h-[420px] md:max-h-[580px] overflow-y-auto bg-slate-50/40">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450 block mb-2 select-none">
            Verification Queue ({missingCodes.length} codes)
          </span>

          <div className="space-y-3.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {missingCodes.map((code) => {
                const suggestions = codeSuggestions[code] || [];
                const type = selectionType[code] || "none";
                const currentSuggVal = selectedValue[code] || "";
                const currentCustomVal = customValue[code] || "";

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    key={code} 
                    id={`unmatched-card-${code}`}
                    className={`p-4 rounded-xl border transition-all ${
                      type !== "none" 
                        ? "bg-emerald-50/15 border-emerald-400 shadow-3xs" 
                        : "bg-white border-slate-200 hover:border-slate-350"
                    }`}
                  >
                    {/* Card Title Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-850 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg break-all">
                          {code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(code)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
                          title="Copy original code key"
                        >
                          {copiedCode === code ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 justify-between sm:justify-start w-full sm:w-auto">
                        {type === "suggest" && (
                          <span className="text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3 shrink-0" /> Linked to {currentSuggVal}
                          </span>
                        )}
                        {type === "custom" && currentCustomVal.trim() && (
                          <span className="text-[10px] bg-sky-100 border border-sky-205 text-sky-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Edit className="w-2.5 h-2.5 shrink-0" /> Set to: {currentCustomVal.toUpperCase()}
                          </span>
                        )}
                        {type === "none" && (
                          <span className="text-[9.5px] bg-rose-50 text-rose-700/80 font-bold px-2 py-0.5 rounded-lg border border-rose-100/40 uppercase font-mono">
                            Unresolved
                          </span>
                        )}
                        
                        {type !== "none" && (
                          <button
                            type="button"
                            onClick={() => handleResetCode(code)}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer ml-auto sm:ml-0"
                            title="Clear selection"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Radio options */}
                    <div className="space-y-1.5 font-sans">
                      {/* Suggestions mapping */}
                      {suggestions.length > 0 ? (
                        suggestions.map((sugg) => {
                          const isItemSelected = type === "suggest" && currentSuggVal === sugg.code;
                          return (
                            <motion.button
                              whileHover={{ scale: 1.005 }}
                              whileTap={{ scale: 0.99 }}
                              key={sugg.code}
                              type="button"
                              onClick={() => handleSelectSuggestion(code, sugg.code)}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 cursor-pointer ${
                                isItemSelected
                                  ? "bg-[#2b5346]/10 border-[#2b5346] text-[#2b5346] font-bold"
                                  : "bg-slate-50/50 hover:bg-slate-105 border-slate-150 text-slate-705"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isItemSelected ? "border-[#2b5346] bg-[#2b5346] text-white" : "border-slate-350 bg-white"
                                }`}>
                                  {isItemSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="font-mono text-[11px] font-bold">{sugg.code}</span>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 text-[10px]">
                                <span className="text-slate-400">Confidence:</span>
                                <span className={`font-black px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                  sugg.tier === "High"
                                    ? "bg-[#eef4f1] text-[#2b5346]"
                                    : sugg.tier === "Medium"
                                      ? "bg-[#fef3ed] text-[#9b4a1c]"
                                      : "bg-slate-100 text-slate-600"
                                }`}>
                                  {sugg.score}% ({sugg.tier})
                                </span>
                              </div>
                            </motion.button>
                          );
                        })
                      ) : (
                        <div className="p-2 border border-slate-150 rounded-lg bg-slate-50 text-[11px] text-slate-500 text-center italic">
                          No fuzzy suggestions matched above low-similarity threshold
                        </div>
                      )}

                      {/* Radio Button 4 - Custom Correction / None of These */}
                      <motion.button
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => handleSelectNone(code)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                          type === "custom"
                            ? "bg-[#2b5346]/10 border-[#2b5346] text-[#2b5346] font-bold"
                            : "bg-slate-50/50 hover:bg-slate-105 border-slate-150 text-slate-705"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            type === "custom" ? "border-[#2b5346] bg-[#2b5346] text-white" : "border-slate-350 bg-white"
                          }`}>
                            {type === "custom" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="font-sans text-[11px] text-slate-750">None of These / Custom Correction</span>
                        </div>
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono shrink-0">
                          Manual Revision
                        </span>
                      </motion.button>

                      {/* Manual Input field show only when custom option is checked */}
                      {type === "custom" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2 text-slate-800 bg-[#eef4f1]/40 p-3 rounded-lg border border-[#2b5346]/20 space-y-1.5 font-sans"
                        >
                          <label className="text-[9.5px] font-black text-[#2b5346] uppercase block tracking-wider">
                            Type Corrected Voucher Name:
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={currentCustomVal}
                              onChange={(e) => setCustomValue((prev) => ({ ...prev, [code]: e.target.value }))}
                              placeholder="e.g. EXTRAVOUCHER20"
                              className="w-full px-3 py-2 bg-white border border-[#2b5346]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b5346]/20 text-xs font-mono font-bold uppercase tracking-wider text-slate-850"
                            />
                          </div>
                        </motion.div>
                      )}

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* REVISION QUEUE & APPLY WORKSPACE - RIGHT COLUMN */}
        <div className="xl:col-span-12 xl:col-start-8 p-4 sm:p-5 flex flex-col justify-between bg-white space-y-5">
          <div className="space-y-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450 block select-none">
              Active Correction Queue ({activeCorrections.length} ready)
            </span>

            {activeCorrections.length === 0 ? (
              <div className="border border-dashed border-slate-205 rounded-2xl p-8 text-center text-slate-450 space-y-3 bg-slate-50/20 my-1 md:my-5">
                <HelpCircle className="w-10 h-10 mx-auto text-slate-305" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Pending Selection</p>
                  <p className="text-[10.5px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Select a high-speed fuzzy suggestion key on the left or enter custom corrections. They will queue up here to replace your sheet immediately.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                <div className="max-h-[280px] overflow-y-auto">
                  <table className="w-full border-collapse text-left font-sans text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wide select-none">
                        <th className="p-2.5">Original</th>
                        <th className="p-2.5">→ Replacement</th>
                        <th className="p-2.5 text-right font-mono">Confidence</th>
                        <th className="p-2.5 text-center">Undo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence initial={false}>
                        {activeCorrections.map((corr) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -25 }}
                            transition={{ duration: 0.16 }}
                            key={corr.original} 
                            className="hover:bg-slate-50"
                          >
                            <td className="p-2.5 font-mono text-slate-650 max-w-[100px] sm:max-w-[124px] truncate" title={corr.original}>
                              {corr.original}
                            </td>
                            <td className="p-2.5 font-mono text-slate-900 font-bold max-w-[100px] sm:max-w-[124px] truncate" title={corr.replacement}>
                              {corr.replacement}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold shrink-0">
                              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                corr.tier === "High"
                                  ? "text-[#2b5346] bg-[#eef4f1]"
                                  : corr.tier === "Medium"
                                    ? "text-[#9b4a1c] bg-[#fef3ed]"
                                    : corr.tier === "Low"
                                      ? "text-slate-600 bg-slate-100"
                                      : "text-[#2b5346] bg-[#eef4f1]"
                              }`}>
                                {corr.confidence}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleResetCode(corr.original)}
                                className="p-1 rounded text-rose-500 hover:text-white hover:bg-rose-500 transition cursor-pointer"
                                title="Remove from correction queue"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTON WRAPPER */}
          <div className="pt-4 border-t border-slate-150 space-y-3 shrink-0">
            {activeCorrections.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-850 leading-relaxed font-sans shadow-3xs flex items-start gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Corrective Impact Recalculated:</span> Applying these {activeCorrections.length} correction{activeCorrections.length === 1 ? "" : "s"} will bolster your located records rate from <span className="font-bold underline">{matchRate.toFixed(1)}%</span> to a projected <span className="font-bold underline text-emerald-700 text-xs">{projectedMatchRate.toFixed(1)}%</span> instantly with full KPI alignment.
                </div>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: activeCorrections.length > 0 ? 1.01 : 1 }}
              whileTap={{ scale: activeCorrections.length > 0 ? 0.98 : 1 }}
              type="button"
              onClick={handleApply}
              disabled={activeCorrections.length === 0}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-tight transition shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                activeCorrections.length > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50 hover:shadow-md"
                  : "bg-slate-100 text-slate-400 border border-slate-205 cursor-not-allowed shadow-none"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Apply Selected Corrections &amp; Recalculate Reports
            </motion.button>
          </div>

        </div>

      </div>

    </div>
  );
}
