/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { DiscountCodeData } from "../types";
import { 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  Database,
  Eye,
  AlertCircle
} from "lucide-react";
import { getFuzzySuggestions } from "../utils/fuzzy";

interface DataExplorerProps {
  dbRows: DiscountCodeData[];
  fileName: string | null;
}

export default function DataExplorer({ dbRows, fileName }: DataExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const allCodes = useMemo(() => dbRows.map(r => r.discount_code), [dbRows]);

  // First 20 codes in the database for instant verification preview
  const first20Rows = useMemo(() => {
    return dbRows.slice(0, 20);
  }, [dbRows]);

  // Check columns detected in the first uploaded dataset row
  const detectedColumns = useMemo(() => {
    const defaultCols = [
      "discount_code",
      "Province",
      "total_discount_used",
      "Sum LTV 3",
      "Sum LTV 6",
      "Sum LTV 12",
      "Avg LTV 3",
      "Avg LTV 6",
      "Avg LTV 12",
      "Signups",
      "Paying cx",
      "Conversion"
    ];
    
    if (dbRows.length === 0) return defaultCols.map(c => ({ name: c, detected: false }));
    
    const firstRow = dbRows[0];
    const keys = Object.keys(firstRow);
    
    return defaultCols.map(col => {
      let detected = false;
      if (col === "Conversion") {
        detected = keys.includes("Conversion") || keys.includes("calculatedConversion") || true;
      } else if (col === "Province") {
        detected = keys.includes("Province") || keys.includes("province");
      } else {
        detected = keys.includes(col);
      }
      return { name: col, detected };
    });
  }, [dbRows]);

  // Handle Search in Dataset
  const searchResult = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return null;

    const exactMatch = dbRows.find(r => r.discount_code.toUpperCase() === q);
    const partials = dbRows.filter(r => 
      r.discount_code.toUpperCase().includes(q) && r.discount_code.toUpperCase() !== q
    );

    const hasAnyMatch = !!exactMatch || partials.length > 0;
    const suggestions = !hasAnyMatch ? getFuzzySuggestions(searchQuery, allCodes, 5) : [];

    return {
      exactMatch,
      partials: partials.slice(0, 8),
      suggestions,
      searched: q
    };
  }, [searchQuery, dbRows, allCodes]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans" id="data-explorer-main-panel">
      
      {/* LEFT COLUMN: Data Loaded successfully & Column checker */}
      <div className="xl:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-2xs gap-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" id="explorer-success-check-icon" />
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-tight">
              Dataset Loaded Successfully
            </h3>
          </div>
          
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl mt-3">
            <span className="text-[10px] font-bold text-slate-450 uppercase font-mono block">Active Catalog Scope</span>
            <p className="text-2xl font-black font-sans text-slate-900 mt-1">
              {dbRows.length.toLocaleString()} <span className="text-xs font-semibold text-slate-500 font-sans">Active Records</span>
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1.5 truncate">
              File SOURCE: {fileName || "Pre-loaded Corporate Database"}
            </p>
          </div>

          <div className="mt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono block mb-2.5">
              Detected Schema Headers
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5" id="detected-columns-grid">
              {detectedColumns.map((col) => (
                <div key={col.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={`text-[10.5px] font-bold ${col.detected ? "text-emerald-600" : "text-rose-500"}`}>
                    {col.detected ? "✓" : "✗"}
                  </span>
                  <span className="font-mono text-[11px] truncate text-slate-650" title={col.name}>{col.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 leading-normal font-sans">
          Validation is processed fully client-side inside this secure internal corporate dashboard framework.
        </div>
      </div>

      {/* RIGHT COLUMN: Search Dataset & Suggestions */}
      <div className="xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-2xs gap-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase">
                <Database className="w-4 h-4 text-emerald-600" />
                Query Database Registry
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5 animate-pulse">
                Verify individual code records. Returns exact matched fields, substrings, and near suggestions.
              </p>
            </div>
          </div>

          {/* Interactive Search Field */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="explorer-search-input"
              type="text"
              placeholder="Type to search codes (e.g. 'MODERN', 'SPRUCE', 'EVMODERN26')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-4 py-2 text-xs rounded-lg border border-slate-250 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Search Outputs Panel */}
          {searchResult ? (
            <div className="space-y-3 animate-fade-in" id="dataset-search-outputs">
              {/* Scenario 1: Exact Match Found */}
              {searchResult.exactMatch && (
                <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded">
                      Exact Match Found
                    </span>
                    <span className="text-[10px] font-sans font-semibold text-slate-500">
                      Channel: {searchResult.exactMatch.channel}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <strong className="text-sm font-mono text-slate-900">{searchResult.exactMatch.discount_code}</strong>
                    <div className="text-right text-xs text-slate-650 font-sans">
                      <span>Paying / Signups: </span>
                      <strong className="font-mono text-slate-900 font-bold">
                        {searchResult.exactMatch["Paying cx"]} / {searchResult.exactMatch.Signups}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Scenario 2: Partial/Contains Matches */}
              {searchResult.partials.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-2 font-mono">
                    Matching Substrings ({searchResult.partials.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" id="partial-matches-grid">
                    {searchResult.partials.map((row, index) => (
                      <button
                        key={`${row.discount_code}-${row.Province || "ON"}-${index}`}
                        onClick={() => setSearchQuery(row.discount_code)}
                        className="p-2 border border-slate-200 rounded-lg text-left hover:border-emerald-500 hover:bg-emerald-50/10 transition text-xs flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-mono font-bold text-slate-700 truncate">{row.discount_code}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenario 3: No Match & Fuzzy Suggestions */}
              {!searchResult.exactMatch && searchResult.partials.length === 0 && (
                <div className="bg-amber-50/50 border border-amber-150 p-3.5 rounded-lg space-y-2">
                  <div className="flex items-start gap-2 text-amber-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold font-sans">No exact match located for "{searchResult.searched}"</p>
                      <p className="text-[11px] text-slate-550 mt-0.5 leading-relaxed font-sans">
                        Please review the coupon identifier or load a different catalog. Suggestions below:
                      </p>
                    </div>
                  </div>

                  {searchResult.suggestions.length > 0 ? (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-450 mb-1 font-mono">
                        Did you mean:
                      </p>
                      <div className="flex flex-wrap gap-1" id="fuzzy-suggestions-row">
                        {searchResult.suggestions.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setSearchQuery(code)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-200 text-xs font-mono font-bold text-amber-800 rounded transition cursor-pointer shadow-3xs"
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-450 font-mono italic">No near recommendations matched this query.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* First 20 Raw rows preview look */
            <div className="space-y-2" id="database-snippet-preview">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  Catalog Preview (First 20 Indices)
                </h4>
                <p className="text-[9.5px] text-slate-450 font-mono">Showing file catalog entries 1 to 20</p>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[155px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-55/65 border-b border-slate-200 text-slate-500 font-mono">
                      <th className="py-1 px-3 w-10 text-center">Row</th>
                      <th className="py-1 px-3">discount_code</th>
                      <th className="py-1 px-3">Province</th>
                      <th className="py-1 px-3 text-right">Signups</th>
                      <th className="py-1 px-3 text-right">Paying cx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-650">
                    {first20Rows.map((row, idx) => (
                      <tr key={row.discount_code + "-" + idx} className="hover:bg-slate-55/5 pb-1">
                        <td className="py-1 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-1 px-3 font-semibold text-slate-800">{row.discount_code}</td>
                        <td className="py-1 px-3">{row.Province || "ON"}</td>
                        <td className="py-1 px-3 text-right">{row.Signups.toLocaleString()}</td>
                        <td className="py-1 px-3 text-right">{row["Paying cx"].toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action Link to help debug inputs */}
        <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[10px] font-sans">
          <span className="text-slate-450">Use the sidebar list to modify the query list.</span>
          <button 
            type="button"
            onClick={() => setSearchQuery("MODERN")} 
            className="text-emerald-800 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Try demo search "MODERN" <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

    </div>
  );
}
