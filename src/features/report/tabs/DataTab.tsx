import React from "react";
import { AlertCircle, Database, ArrowRight } from "lucide-react";
import { AnalyzedCodeReport, DiscountCodeData } from "../../../types";
import DetailedTable from "../../../components/DetailedTable";
import DataExplorer from "../../../components/DataExplorer";

interface DataTabProps {
  foundReports: AnalyzedCodeReport[];
  uniqueChannels: string[];
  dbRows: DiscountCodeData[];
  fileName: string | null;
  onSwitchToExplorer: () => void;
}

const TIERS = [
  { rating: "Strong",    color: "#2b5346", bg: "#eef4f1", border: "rgba(43,83,70,0.25)"  },
  { rating: "Good",      color: "#3d7060", bg: "#f0f7f4", border: "rgba(61,112,96,0.25)" },
  { rating: "Average",   color: "#8a6f00", bg: "#fdf8e1", border: "rgba(231,189,39,0.35)"},
  { rating: "Weak",      color: "#9b4a1c", bg: "#fff4ec", border: "rgba(231,138,88,0.35)"},
  { rating: "Poor",      color: "#850b0b", bg: "#fff4f4", border: "rgba(133,11,11,0.25)" },
] as const;

export function DataTab({ foundReports, uniqueChannels, dbRows, fileName, onSwitchToExplorer }: DataTabProps): React.ReactElement {
  const pendingDiscount = foundReports.filter(r => r.total_discount_used === 0 && r.calculatedConversion > 0);

  const tierCounts = TIERS.map(t => ({
    ...t,
    count: foundReports.filter(r => r.performanceRating === t.rating).length,
  })).filter(t => t.count > 0);

  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1a1a1a]">Data</h2>
          <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">
            {foundReports.length} matched code{foundReports.length !== 1 ? "s" : ""} · {dbRows.length.toLocaleString()} total records in database
          </p>
        </div>
        <button
          onClick={onSwitchToExplorer}
          className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-[#2b5346] hover:bg-[#eef4f1] px-3 py-1.5 rounded-lg border border-[#2b5346]/20 transition-colors cursor-pointer"
        >
          Raw explorer
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Performance distribution strip */}
      {tierCounts.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm px-5 py-4">
          <p className="text-[9.5px] font-semibold text-[#a1a1a1] uppercase tracking-wider font-mono mb-3">
            Performance Distribution
          </p>
          <div className="flex flex-wrap gap-2">
            {tierCounts.map(t => (
              <div
                key={t.rating}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ backgroundColor: t.bg, borderColor: t.border }}
              >
                <span className="text-[18px] font-bold font-mono leading-none" style={{ color: t.color }}>
                  {t.count}
                </span>
                <div>
                  <p className="text-[11px] font-semibold leading-none" style={{ color: t.color }}>{t.rating}</p>
                  <p className="text-[9px] text-[#a1a1a1] font-mono mt-0.5">
                    {t.rating === "Strong" ? "≥40%" : t.rating === "Good" ? "30–40%" : t.rating === "Average" ? "20–30%" : t.rating === "Weak" ? "10–20%" : t.rating === "Poor" ? "<10%" : "data pending"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending discount callout */}
      {pendingDiscount.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-[#e7bd27]/40 bg-[#fdf8e1]">
          <AlertCircle className="w-3.5 h-3.5 text-[#8a6f00] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#8a6f00] leading-relaxed">
            <strong>{pendingDiscount.length} code{pendingDiscount.length > 1 ? "s" : ""}</strong> show
            {pendingDiscount.length === 1 ? "s" : ""} $0 discount but{" "}
            {pendingDiscount.length === 1 ? "has" : "have"} active conversions — Looker Studios hasn't
            logged their spend data yet. Efficiency ratio is excluded from their scores until data is
            available.
            {pendingDiscount.length <= 5 && (
              <span className="font-mono ml-1">
                ({pendingDiscount.map(c => c.discount_code).join(", ")})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Main table */}
      <DetailedTable reports={foundReports} channels={uniqueChannels} />

      {/* Source file explorer */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#f0f0f0]">
          <Database className="w-3.5 h-3.5 text-[#2b5346]" />
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Source File Explorer</h3>
            <p className="text-[10px] text-[#a1a1a1] font-mono">
              {dbRows.length.toLocaleString()} total rows · {fileName ?? "no file"}
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
