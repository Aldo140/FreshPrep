import React, { useMemo, useState } from "react";
import { Database, Upload } from "lucide-react";
import { AnalyzedCodeReport, AnalysisFlow, DiscountCodeData, UserPersona } from "../../../types";
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
}

export function RegionalTab({ dbRows, foundReports, selectedFlow, userPersona, eventStats = [], onUploadLooker }: RegionalTabProps): React.ReactElement {
  const relevance = TAB_RELEVANCE.regional[selectedFlow];
  const bdOnly = dbRows.length === 0 && foundReports.length === 0;

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
            <h2 className="text-[20px] font-black text-[#0f0f0f]">Province × Fiscal Year</h2>
            <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">
              Events and signups per province, broken down by fiscal year · Jul 2024 – Jun 2026
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
            Jul 2024 – Jun 19, 2026
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

        {/* Province filter pills */}
        {allProvinces.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] shrink-0">Province</span>
            {allProvinces.map(p => (
              <button
                key={p}
                onClick={() => toggleProvince(p)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-semibold cursor-pointer border transition-all"
                style={
                  activeProvinces.has(p)
                    ? { backgroundColor: provColor(p), color: "#fff", borderColor: provColor(p) }
                    : { backgroundColor: "white", color: "#a1a1a1", borderColor: "#e5e5e5" }
                }
              >
                {p}
              </button>
            ))}
            {activeProvinces.size < allProvinces.length && (
              <button
                onClick={() => setActiveProvinces(new Set(allProvinces))}
                className="text-[10px] font-mono text-[#2b5346] hover:underline cursor-pointer"
              >
                Show all
              </button>
            )}
          </div>
        )}

        {/* Province × FY table */}
        <div className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fafafa] border-b border-[#f0f0ee] text-[#a1a1a1] font-semibold font-mono uppercase text-[9px]">
                  <th className="py-2.5 px-4 sticky left-0 bg-[#fafafa]">Province</th>
                  {years.map(fy => (
                    <th key={fy} colSpan={2} className="py-2.5 px-3 text-center border-l border-[#f0f0ee]">
                      <div>{fy}</div>
                      <div className="text-[7.5px] font-normal normal-case text-[#c0c0c0] tracking-normal">{fyRange(fy)}</div>
                    </th>
                  ))}
                  {showYTD && years.includes(currentFY) && (
                    <th colSpan={2} className="py-2.5 px-3 text-center border-l border-[#f0f0ee] text-[#2b5346]">
                      <div>YTD</div>
                      <div className="text-[7.5px] font-normal normal-case text-[#a1a1a1] tracking-normal">thru {nowMk.slice(0,7)}</div>
                    </th>
                  )}
                  <th className="py-2.5 px-3 text-center border-l border-[#f0f0ee]">Total Sig.</th>
                </tr>
                <tr className="bg-[#fafafa] border-b border-[#ececec] text-[#c0c0c0] font-mono text-[8px]">
                  <th className="py-1 px-4 sticky left-0 bg-[#fafafa]" />
                  {years.map(fy => (
                    <React.Fragment key={fy}>
                      <th className="py-1 px-3 text-center border-l border-[#f5f5f5]">Ev</th>
                      <th className="py-1 px-3 text-center">Sig</th>
                    </React.Fragment>
                  ))}
                  {showYTD && years.includes(currentFY) && (
                    <>
                      <th className="py-1 px-3 text-center border-l border-[#f5f5f5]">Ev</th>
                      <th className="py-1 px-3 text-center">Sig</th>
                    </>
                  )}
                  <th className="py-1 px-3 border-l border-[#f5f5f5]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f8f8] text-[#3d3d3d]">
                {filteredProvs.map(row => {
                  const fyMap = byProv[row.province] ?? {};
                  const ytd = ytdByProv[row.province] ?? { events: 0, signups: 0 };
                  const shareW = grandTotal > 0 ? (row.signups / grandTotal) * 100 : 0;
                  return (
                    <tr key={row.province} className="hover:bg-[#fafafa]">
                      <td className="py-3 px-4 sticky left-0 bg-white hover:bg-[#fafafa]">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-black text-[12px] font-mono px-1.5 py-0.5 rounded border shrink-0"
                            style={{ color: provColor(row.province), borderColor: provColor(row.province) + "40", backgroundColor: provColor(row.province) + "12" }}
                          >
                            {row.province}
                          </span>
                          <div className="w-16 h-1.5 bg-[#eee] rounded-full overflow-hidden shrink-0">
                            <div className="h-full rounded-full" style={{ width: `${shareW}%`, backgroundColor: provColor(row.province) }} />
                          </div>
                        </div>
                      </td>
                      {years.map(fy => {
                        const cell = fyMap[fy] ?? { events: 0, signups: 0 };
                        return (
                          <React.Fragment key={fy}>
                            <td className="py-3 px-3 text-center font-mono text-[#888] text-[11px] border-l border-[#f5f5f5]">
                              {cell.events > 0 ? cell.events : <span className="text-[#ddd]">—</span>}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-semibold text-[#1a1a1a] text-[11px]">
                              {cell.signups > 0 ? cell.signups.toLocaleString() : <span className="text-[#ddd] font-normal">—</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      {showYTD && years.includes(currentFY) && (
                        <>
                          <td className="py-3 px-3 text-center font-mono text-[#2b5346] text-[11px] border-l border-[#f5f5f5]">
                            {ytd.events > 0 ? ytd.events : <span className="text-[#ddd]">—</span>}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-[#2b5346] text-[11px]">
                            {ytd.signups > 0 ? ytd.signups.toLocaleString() : <span className="text-[#ddd] font-normal">—</span>}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-3 text-center font-mono font-bold text-[#1a1a1a] text-[11px] border-l border-[#f5f5f5]">
                        {row.signups.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 border-[#e5e5e5] bg-[#f8f7f5] text-[11px] font-mono font-bold">
                  <td className="py-2.5 px-4 text-[#a1a1a1] uppercase text-[9px] tracking-wider sticky left-0 bg-[#f8f7f5]">Total</td>
                  {years.map(fy => {
                    const t = totals[fy] ?? { events: 0, signups: 0 };
                    return (
                      <React.Fragment key={fy}>
                        <td className="py-2.5 px-3 text-center text-[#888] border-l border-[#e5e5e5]">{t.events}</td>
                        <td className="py-2.5 px-3 text-center text-[#1a1a1a]">{t.signups.toLocaleString()}</td>
                      </React.Fragment>
                    );
                  })}
                  {showYTD && years.includes(currentFY) && (
                    <>
                      <td className="py-2.5 px-3 text-center text-[#2b5346] border-l border-[#e5e5e5]">{ytdTotal.events}</td>
                      <td className="py-2.5 px-3 text-center text-[#2b5346]">{ytdTotal.signups.toLocaleString()}</td>
                    </>
                  )}
                  <td className="py-2.5 px-3 text-center text-[#1a1a1a] border-l border-[#e5e5e5]">{grandTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="text-[9px] font-mono text-[#c0c0c0] text-center">
          Province attributed by majority of signups per event code · Fiscal year Jul → Jun
        </p>
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

      {/* Province filter pills — same style as Calendar tab */}
      {allProvinces.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] shrink-0">Province</span>
          {allProvinces.map(p => (
            <button
              key={p}
              onClick={() => toggleProvince(p)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-semibold cursor-pointer border transition-all"
              style={
                activeProvinces.has(p)
                  ? { backgroundColor: provColor(p), color: "#fff", borderColor: provColor(p) }
                  : { backgroundColor: "white", color: "#a1a1a1", borderColor: "#e5e5e5" }
                }
            >
              {p}
            </button>
          ))}
          {activeProvinces.size < allProvinces.length && (
            <button
              onClick={() => setActiveProvinces(new Set(allProvinces))}
              className="text-[10px] font-mono text-[#2b5346] hover:underline cursor-pointer"
            >
              Show all
            </button>
          )}
        </div>
      )}

      <ProvinceIntelligence dbRows={dbRows} foundReports={filteredReports} />
    </div>
  );
}
