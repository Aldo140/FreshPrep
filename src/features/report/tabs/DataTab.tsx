import React, { useState } from "react";
import { AlertCircle, Database, ArrowRight, Info, ChevronDown, X } from "lucide-react";
import { AnalyzedCodeReport, DiscountCodeData, AnalysisFlow } from "../../../types";
import DetailedTable from "../../../components/DetailedTable";
import DataExplorer from "../../../components/DataExplorer";

interface DataTabProps {
  foundReports: AnalyzedCodeReport[];
  uniqueChannels: string[];
  dbRows: DiscountCodeData[];
  fileName: string | null;
  selectedFlow: AnalysisFlow;
  onSwitchToExplorer: () => void;
}

const TIERS = [
  { rating: "Strong",  color: "#2b5346", bg: "#eef4f1", barColor: "#2b5346", border: "rgba(43,83,70,0.3)",   range: "≥40%"  },
  { rating: "Good",    color: "#3d7060", bg: "#f0f7f4", barColor: "#3d7060", border: "rgba(61,112,96,0.3)",  range: "30–40%"},
  { rating: "Average", color: "#c9a000", bg: "#fdf8e1", barColor: "#e7bd27", border: "rgba(231,189,39,0.4)", range: "20–30%"},
  { rating: "Weak",    color: "#9b4a1c", bg: "#fff4ec", barColor: "#e78a58", border: "rgba(231,138,88,0.4)", range: "10–20%"},
  { rating: "Poor",    color: "#850b0b", bg: "#fff4f4", barColor: "#850b0b", border: "rgba(133,11,11,0.3)",  range: "<10%"  },
] as const;

export function DataTab({ foundReports, uniqueChannels, dbRows, fileName, selectedFlow, onSwitchToExplorer }: DataTabProps): React.ReactElement {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  const total = foundReports.length;
  const withDiscount = foundReports.filter(r => r.total_discount_used !== 0).length;
  const discountCoverage = total > 0 ? withDiscount / total : 0;
  const discountAbsent = discountCoverage < 0.2;

  const pendingDiscount = foundReports.filter(r => r.total_discount_used === 0 && r.calculatedConversion > 0);

  const tierCounts = TIERS.map(t => ({
    ...t,
    count: foundReports.filter(r => r.performanceRating === t.rating).length,
    pct: total > 0 ? Math.round(foundReports.filter(r => r.performanceRating === t.rating).length / total * 100) : 0,
    codes: foundReports
      .filter(r => r.performanceRating === t.rating)
      .sort((a, b) => b.calculatedConversion - a.calculatedConversion),
  })).filter(t => t.count > 0);

  const expandedData = expandedTier ? tierCounts.find(t => t.rating === expandedTier) : null;

  return (
    <div className="p-5 flex flex-col gap-4 max-w-6xl mx-auto w-full">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1a1a1a]">Data</h2>
          <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">
            {total} matched code{total !== 1 ? "s" : ""} · {dbRows.length.toLocaleString()} total records in database
          </p>
        </div>
        {selectedFlow === "paste" && (
          <button
            onClick={onSwitchToExplorer}
            className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-[#2b5346] hover:bg-[#eef4f1] px-3 py-1.5 rounded-lg border border-[#2b5346]/20 transition-colors cursor-pointer"
          >
            Raw explorer
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Performance distribution card ───────────────────── */}
      {tierCounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">

          {/* Stacked proportion bar — top edge */}
          <div className="flex h-1.5">
            {tierCounts.map(t => (
              <button
                key={t.rating}
                onClick={() => setExpandedTier(expandedTier === t.rating ? null : t.rating)}
                className="h-full transition-[width] duration-500 hover:opacity-80 cursor-pointer"
                style={{ width: `${t.pct}%`, backgroundColor: t.barColor }}
                title={`${t.rating}: ${t.count} codes`}
              />
            ))}
          </div>

          <div className="px-5 py-4">
            <p className="text-[9px] font-semibold text-[#c8c8c8] uppercase tracking-widest font-mono mb-3.5">
              Performance Distribution — click a tier to see its codes
            </p>

            {/* Tier chips — clickable */}
            <div className="flex flex-wrap gap-2">
              {tierCounts.map(t => {
                const isActive = expandedTier === t.rating;
                return (
                  <button
                    key={t.rating}
                    onClick={() => setExpandedTier(isActive ? null : t.rating)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer text-left"
                    style={{
                      backgroundColor: isActive ? t.bg : "#fafafa",
                      borderColor: isActive ? t.border : "#e8e8e8",
                      boxShadow: isActive ? `0 0 0 2px ${t.border}` : "none",
                    }}
                  >
                    <span
                      className="text-[22px] font-bold font-mono leading-none tabular-nums"
                      style={{ color: isActive ? t.color : "#3d3d3d" }}
                    >
                      {t.count}
                    </span>
                    <div className="text-left">
                      <p
                        className="text-[12px] font-semibold leading-tight"
                        style={{ color: isActive ? t.color : "#3d3d3d" }}
                      >
                        {t.rating}
                      </p>
                      <p className="text-[9px] text-[#b8b8b8] font-mono mt-0.5">
                        {t.range} · {t.pct}%
                      </p>
                    </div>
                    <ChevronDown
                      className="w-3 h-3 ml-1 transition-transform"
                      style={{
                        color: isActive ? t.color : "#c8c8c8",
                        transform: isActive ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Expanded code list */}
            {expandedData && (
              <div className="mt-4 rounded-xl border border-[#ececec] overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ backgroundColor: expandedData.bg, borderBottom: `1px solid ${expandedData.border}` }}
                >
                  <p className="text-[10px] font-semibold font-mono uppercase tracking-wider" style={{ color: expandedData.color }}>
                    {expandedData.count} {expandedData.rating} codes · {expandedData.range} conversion
                  </p>
                  <button
                    onClick={() => setExpandedTier(null)}
                    className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: expandedData.color }} />
                  </button>
                </div>
                <div className="p-3 flex flex-wrap gap-2 bg-white">
                  {expandedData.codes.map(r => (
                    <div
                      key={`${r.discount_code}-${r.Province ?? ""}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#ebebeb] bg-[#fafafa]"
                    >
                      <span className="font-mono font-bold text-[12px] text-[#1a1a1a]">{r.discount_code}</span>
                      {r.Province && r.Province !== "ON" && (
                        <span className="text-[9px] text-[#a1a1a1] font-mono bg-[#f0f0f0] px-1 rounded">{r.Province}</span>
                      )}
                      <span
                        className="text-[11px] font-mono font-semibold"
                        style={{ color: expandedData.color }}
                      >
                        {r.calculatedConversion.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-[#c0c0c0] font-mono">{r["Paying cx"]}/{r.Signups}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Spend data notice ───────────────────────────────── */}
      {pendingDiscount.length > 0 && (
        discountAbsent ? (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-[#e8e8e8] bg-[#f8f7f5]">
            <Info className="w-3.5 h-3.5 text-[#a1a1a1] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#3d3d3d] leading-relaxed">
              Spend data (discount used, efficiency ratio) is not present in this dataset — those columns
              are hidden. Conversion rates and LTV are unaffected.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-[#e7bd27]/40 bg-[#fdf8e1]">
            <AlertCircle className="w-3.5 h-3.5 text-[#8a6f00] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#8a6f00] leading-relaxed">
              <strong>{pendingDiscount.length} code{pendingDiscount.length > 1 ? "s" : ""}</strong> show
              {pendingDiscount.length === 1 ? "s" : ""} $0 discount but have active conversions —
              Looker Studios hasn't logged their spend yet. Efficiency is excluded from their scores.
              {pendingDiscount.length <= 5 && (
                <span className="font-mono ml-1">({pendingDiscount.map(c => c.discount_code).join(", ")})</span>
              )}
            </p>
          </div>
        )
      )}

      {/* ── Main table ──────────────────────────────────────── */}
      <DetailedTable reports={foundReports} channels={uniqueChannels} hideSpendCols={discountAbsent} />

      {/* ── Source file explorer ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#f2f2f2]">
          <Database className="w-3.5 h-3.5 text-[#2b5346]" />
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Source File Explorer</h3>
            <p className="text-[10px] text-[#a1a1a1] font-mono">
              {dbRows.length.toLocaleString()} rows · {fileName ?? "no file loaded"}
            </p>
          </div>
        </div>
        <div className="p-5">
          <DataExplorer dbRows={dbRows} fileName={fileName} />
        </div>
      </div>
    </div>
  );
}
