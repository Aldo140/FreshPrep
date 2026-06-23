import React, { useEffect, useMemo, useState } from "react";
import { Database, Upload } from "lucide-react";
import { AnalyzedCodeReport, AnalysisFlow, DiscountCodeData, UserPersona, ReportPage } from "../../../types";
import { EventStats } from "../../../hooks/useCustomerData";
import ProvinceIntelligence from "../components/ProvinceIntelligence";
import { TAB_RELEVANCE } from "../../../config/flowRelevance";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
  NS: "#5a5a5a", NB: "#888",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#2b5346";

function fiscalYear(monthKey: string): string {
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5, 7));
  return `FY${m >= 7 ? y + 1 : y}`;
}
function fyRange(fy: string): string {
  const end = Number(fy.slice(2));
  return `Jul ${end - 1} – Jun ${end}`;
}

interface RegionalTabProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
  selectedFlow: AnalysisFlow;
  userPersona: UserPersona;
  eventStats?: EventStats[];
  onUploadLooker?: () => void;
  activeProvince?: string | null;
  onNavigate?: (page: ReportPage) => void;
}

export function RegionalTab({ dbRows, foundReports, selectedFlow, userPersona, eventStats = [], onUploadLooker, activeProvince, onNavigate }: RegionalTabProps): React.ReactElement {
  const relevance = TAB_RELEVANCE.regional[selectedFlow];
  const bdOnly = dbRows.length === 0 && foundReports.length === 0;

  // Dynamic date range from eventStats
  const dbDateRange = useMemo(() => {
    const dates = eventStats.map(e => e.eventDate).filter(Boolean).sort();
    if (dates.length === 0) return "BD Events DB";
    const ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const fmt = (d: string) => {
      const [y, m] = d.split("-");
      return `${ABBR[Number(m) - 1]} ${y}`;
    };
    return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
  }, [eventStats]);

  // Fiscal year / YTD constants
  const now = new Date();
  const nowMk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentFY = fiscalYear(nowMk);
  const fyEndMk = `${Number(currentFY.slice(2))}-06`;
  const showYTD = nowMk < fyEndMk;

  // BD-only: aggregate eventStats by province × FY, and YTD
  const bdFYData = useMemo(() => {
    if (!bdOnly || eventStats.length === 0) return { years: [] as string[], byProv: {} as Record<string, Record<string, { events: number; signups: number }>>, ytdByProv: {} as Record<string, { events: number; signups: number }>, totals: {} as Record<string, { events: number; signups: number }>, ytdTotal: { events: 0, signups: 0 } };

    const yearSet = new Set<string>();
    const byProv: Record<string, Record<string, { events: number; signups: number }>> = {};
    const ytdByProv: Record<string, { events: number; signups: number }> = {};

    for (const e of eventStats) {
      const prov = e.homeProvince || "??";
      const fy = fiscalYear(e.eventMonth);
      yearSet.add(fy);
      if (!byProv[prov]) byProv[prov] = {};
      const cell = byProv[prov][fy] ?? { events: 0, signups: 0 };
      byProv[prov][fy] = { events: cell.events + 1, signups: cell.signups + e.totalSignups };

      if (fy === currentFY && e.eventMonth <= nowMk) {
        const ytd = ytdByProv[prov] ?? { events: 0, signups: 0 };
        ytdByProv[prov] = { events: ytd.events + 1, signups: ytd.signups + e.totalSignups };
      }
    }

    const years = Array.from(yearSet).sort();

    // Total per FY (for footer)
    const totals: Record<string, { events: number; signups: number }> = {};
    for (const [, fyMap] of Object.entries(byProv)) {
      for (const [fy, cell] of Object.entries(fyMap)) {
        const t = totals[fy] ?? { events: 0, signups: 0 };
        totals[fy] = { events: t.events + cell.events, signups: t.signups + cell.signups };
      }
    }
    const ytdTotal = Object.values(ytdByProv).reduce((acc, v) => ({ events: acc.events + v.events, signups: acc.signups + v.signups }), { events: 0, signups: 0 });

    return { years, byProv, ytdByProv, totals, ytdTotal };
  }, [bdOnly, eventStats, currentFY, nowMk]);

  // Province list for BD-only mode (sorted by total signups desc)
  const bdProvinceStats = useMemo(() => {
    if (!bdOnly || eventStats.length === 0) return [];
    const map = new Map<string, { events: number; signups: number }>();
    for (const e of eventStats) {
      const prov = e.homeProvince || "??";
      const ex = map.get(prov) ?? { events: 0, signups: 0 };
      map.set(prov, { events: ex.events + 1, signups: ex.signups + e.totalSignups });
    }
    return Array.from(map.entries())
      .map(([province, d]) => ({ province, ...d }))
      .sort((a, b) => b.signups - a.signups);
  }, [bdOnly, eventStats]);

  // Province field can be compound: "AB + BC + ON" — split into individual codes
  const allProvinces = useMemo(() =>
    bdOnly
      ? bdProvinceStats.map(p => p.province)
      : Array.from(
          new Set(
            foundReports.flatMap(r =>
              (r.Province ?? "ON").split("+").map(p => p.trim()).filter(Boolean)
            )
          )
        ).sort(),
    [bdOnly, bdProvinceStats, foundReports],
  );

  const [activeProvinces, setActiveProvinces] = useState<Set<string>>(
    () => new Set(allProvinces),
  );

  // Sync global province chip → local province filter
  useEffect(() => {
    if (activeProvince != null) {
      setActiveProvinces(new Set([activeProvince]));
    } else {
      setActiveProvinces(new Set(allProvinces));
    }
  }, [activeProvince]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleProvince = (p: string) => {
    setActiveProvinces(prev => {
      if (prev.size === 1 && prev.has(p)) return prev;
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  // Include a code if ANY of its provinces is active
  const filteredReports = useMemo(() =>
    foundReports.filter(r => {
      const provs = (r.Province ?? "ON").split("+").map(p => p.trim()).filter(Boolean);
      return provs.some(p => activeProvinces.has(p));
    }),
    [foundReports, activeProvinces],
  );

  // Scope copy
  const isSelected = selectedFlow === "paste";
  const scopeLabel = isSelected
    ? `BD selected codes · ${foundReports.length} code${foundReports.length !== 1 ? "s" : ""}`
    : `BD event dataset · ${foundReports.length} event code${foundReports.length !== 1 ? "s" : ""}`;
  const scopeNote = isSelected
    ? "Province breakdown for your pasted codes only."
    : "Province breakdown across the full loaded BD event dataset.";

  // BD-only mode: province × fiscal year breakdown
  if (bdOnly) {
    const { years, byProv, ytdByProv, totals, ytdTotal } = bdFYData;
    const filteredProvs = bdProvinceStats.filter(p => activeProvinces.has(p.province));
    const grandTotal = bdProvinceStats.reduce((s, p) => s + p.signups, 0);
    const totalEvents = bdProvinceStats.reduce((s, p) => s + p.events, 0);

    return (
      <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Regional · BD Events Database</p>
            <h2 className="text-[20px] font-black text-[#0f0f0f]">Province Summary</h2>
            <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">
              Signups by province · {dbDateRange}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black font-mono text-[#2b5346]">{grandTotal.toLocaleString()}</p>
            <p className="text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wide">total signups</p>
          </div>
        </div>

        {/* Data source bar */}
        <div className="bg-white rounded-xl border border-[#e8e8e8] px-4 py-2.5 flex items-center gap-2.5 shadow-sm flex-wrap">
          <Database className="w-3.5 h-3.5 shrink-0 text-[#a1a1a1]" />
          <span className="text-[11px] font-mono text-[#3d3d3d]">Built-in BD Events DB · {totalEvents} events</span>
          <span className="text-[9px] font-mono text-[#c9a000] bg-[#fffbeb] border border-[#f5e09a] px-2 py-0.5 rounded-full shrink-0">
            {dbDateRange}
          </span>
          {onUploadLooker && (
            <button
              onClick={onUploadLooker}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all bg-white text-[#2b5346] border-[#d0e8e2] hover:bg-[#eef4f1] shrink-0"
            >
              <Upload className="w-3 h-3 shrink-0" />
              Upload Looker file for LTV &amp; conversion
            </button>
          )}
        </div>

        {/* Province signups grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProvs.map(row => {
            const shareW = grandTotal > 0 ? (row.signups / grandTotal) * 100 : 0;
            return (
              <div key={row.province} className="bg-white rounded-xl border border-[#e8e8e8] px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="font-black text-[13px] font-mono px-2 py-0.5 rounded border"
                    style={{ color: provColor(row.province), borderColor: provColor(row.province) + "40", backgroundColor: provColor(row.province) + "12" }}
                  >
                    {row.province}
                  </span>
                  <span className="text-[9px] font-mono text-[#a1a1a1]">{row.events} event{row.events !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-2xl font-black font-mono text-[#1a1a1a] leading-none">{row.signups.toLocaleString()}</p>
                <p className="text-[9px] font-mono text-[#a1a1a1] mt-1">signups · {shareW.toFixed(0)}% of total</p>
                <div className="mt-2 h-1 bg-[#eee] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${shareW}%`, backgroundColor: provColor(row.province) }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Link to BD Fiscal for full breakdown */}
        {onNavigate && (
          <div className="bg-[#eef4f1] border border-[#2b5346]/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#2b5346]">Full fiscal breakdown available in BD Fiscal</p>
              <p className="text-[10px] text-[#3d3d3d] font-mono mt-0.5">Province × year table with YTD comparison and cost analysis</p>
            </div>
            <button
              onClick={() => onNavigate?.("fiscal")}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer bg-[#2b5346] text-white hover:bg-[#1a3d2f]"
              style={{ transition: "background-color 150ms var(--ease-out)" }}
            >
              Open BD Fiscal →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Regional · BD Events</p>
          <h2 className="text-[20px] font-black text-[#0f0f0f]">Province Breakdown</h2>
          <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">{scopeNote}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black font-mono text-[#2b5346]">{filteredReports.length}</p>
          <p className="text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wide">codes in view</p>
        </div>
      </div>

      {/* Data scope bar */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
        <Database className="w-3.5 h-3.5 shrink-0" style={{ color: isSelected ? "#2b5346" : "#a1a1a1" }} />
        <span className="text-[11px] font-mono text-[#3d3d3d]">{scopeLabel}</span>
        {isSelected ? (
          <span className="text-[9px] font-mono text-[#2b5346] bg-[#eef4f1] px-2 py-0.5 rounded-full ml-1 shrink-0">
            your codes
          </span>
        ) : (
          <span className="text-[9px] font-mono text-[#a1a1a1] bg-[#f8f7f5] border border-[#e8e8e8] px-2 py-0.5 rounded-full ml-1 shrink-0">
            full dataset
          </span>
        )}
        {relevance === "partial" && (
          <span className="ml-auto text-[9px] font-mono text-[#c9a000] shrink-0">
            Partial view — go to Full Dataset for complete provincial analysis
          </span>
        )}
      </div>


      <ProvinceIntelligence dbRows={dbRows} foundReports={filteredReports} />
    </div>
  );
}
