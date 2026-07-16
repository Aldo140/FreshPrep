import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Database, MapPin, Search, TrendingUp, Upload, Users, X } from "lucide-react";
import { AnalyzedCodeReport, AnalysisFlow, DiscountCodeData, UserPersona, ReportPage } from "../../../types";
import { EventStats, ProvinceTotals } from "../../../hooks/useCustomerData";
import { useEventSchedule } from "../../../hooks/useEventSchedule";
import ProvinceIntelligence from "../components/ProvinceIntelligence";
import { TAB_RELEVANCE } from "../../../config/flowRelevance";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
  NS: "#5a5a5a", NB: "#888",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#2b5346";

const PROV_FULL: Record<string, string> = {
  BC: "British Columbia", AB: "Alberta", ON: "Ontario",
  QC: "Quebec", SK: "Saskatchewan", MB: "Manitoba",
  NS: "Nova Scotia", NB: "New Brunswick",
};
// Label ink on strip segments: gold needs dark text, the greens/rusts need white
const segText = (p: string) => (p === "AB" ? "#3a2e00" : "#fff");

function fiscalYear(monthKey: string): string {
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5, 7));
  return `FY${m >= 7 ? y + 1 : y}`;
}
function fyRange(fy: string): string {
  const end = Number(fy.slice(2));
  return `Jul ${end - 1} – Jun ${end}`;
}
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatMonthKey(mk: string): string {
  if (!mk || mk.length < 7) return "—";
  return `${MONTH_ABBR[Number(mk.slice(5, 7)) - 1]} ${mk.slice(0, 4)}`;
}

function TopEventsList({ events, color }: { events: EventStats[]; color: string }): React.ReactElement {
  const maxSignups = events[0]?.totalSignups ?? 1;
  return (
    <div className="border-t border-[#f0f0ee] px-4 py-3 bg-[#fcfcfb]">
      <p className="text-[8.5px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-2">
        Top {events.length} event{events.length !== 1 ? "s" : ""} · by signups · % = paying conversion
      </p>
      <div className="flex flex-col gap-1.5">
        {events.map((e, i) => (
          <div key={e.code}>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-4 shrink-0 text-right font-black" style={{ color }}>{i + 1}</span>
              <span className="flex-1 min-w-0 truncate font-black text-[#1a1a1a]">{e.code}</span>
              <span className="shrink-0 text-[#a1a1a1]">{formatMonthKey(e.eventMonth)}</span>
              <span className="w-12 shrink-0 text-right font-black text-[#2b5346]">{e.totalSignups.toLocaleString()}</span>
              <span className="w-9 shrink-0 text-right text-[#4d8970]">{(e.conversionRate * 100).toFixed(0)}%</span>
            </div>
            <div className="ml-6 mt-0.5 h-[3px] bg-[#f0f0f0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(e.totalSignups / maxSignups) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatIsoDate(date: string): string {
  if (!date) return "Unknown";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

interface RegionalTabProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
  selectedFlow: AnalysisFlow;
  userPersona: UserPersona;
  eventStats?: EventStats[];
  provinceTotals?: ProvinceTotals;
  onUploadLooker?: () => void;
  activeProvince?: string | null;
  onNavigate?: (page: ReportPage) => void;
  channelScope?: string;
}

export function RegionalTab({ dbRows, foundReports, selectedFlow, userPersona, eventStats = [], provinceTotals = {}, onUploadLooker, activeProvince, onNavigate, channelScope }: RegionalTabProps): React.ReactElement {
  const relevance = TAB_RELEVANCE.regional[selectedFlow];
  const bdOnly = dbRows.length === 0 && foundReports.length === 0;
  const [codeLookupQuery, setCodeLookupQuery] = useState("");
  const [selectedLookupCode, setSelectedLookupCode] = useState<string | null>(null);
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);
  const [hoverProv, setHoverProv] = useState<string | null>(null);
  const eventSchedule = useEventSchedule();

  // Top 10 events per home province, ranked by signups (BD-only drill-down)
  const topEventsByProvince = useMemo(() => {
    const map = new Map<string, EventStats[]>();
    for (const e of eventStats) {
      const prov = e.homeProvince || "??";
      const list = map.get(prov);
      list ? list.push(e) : map.set(prov, [e]);
    }
    for (const [prov, list] of map) {
      map.set(
        prov,
        list
          .sort((a, b) => b.totalSignups - a.totalSignups || a.code.localeCompare(b.code))
          .slice(0, 10),
      );
    }
    return map;
  }, [eventStats]);

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
    const map = new Map<string, { events: number; signups: number; paying: number }>();
    for (const e of eventStats) {
      const prov = e.homeProvince || "??";
      const ex = map.get(prov) ?? { events: 0, signups: 0, paying: 0 };
      map.set(prov, { events: ex.events + 1, signups: ex.signups + e.totalSignups, paying: ex.paying + e.payingSignups });
    }
    return Array.from(map.entries())
      .map(([province, d]) => ({ province, ...d }))
      .sort((a, b) => b.signups - a.signups);
  }, [bdOnly, eventStats]);

  // Related codes: same alpha stem, different year/number suffix (e.g. EVSTAMPEDE10 ↔ EVSTAMPEDE26)
  const codeFamily = (code: string) => code.toUpperCase().replace(/\d+$/, "");
  const relatedCodes = useMemo(() => {
    const sel = selectedLookupCode
      ? eventStats.find(e => e.code === selectedLookupCode)
      : eventStats.find(e => e.code.toUpperCase() === codeLookupQuery.trim().toUpperCase());
    if (!sel) return [];
    const fam = codeFamily(sel.code);
    if (fam.length < 5) return []; // too short a stem → coincidental matches
    return eventStats
      .filter(e => e.code !== sel.code && codeFamily(e.code) === fam)
      .sort((a, b) => a.eventMonth.localeCompare(b.eventMonth));
  }, [selectedLookupCode, codeLookupQuery, eventStats]);

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

  const codeLookupMatches = useMemo(() => {
    const query = codeLookupQuery.trim().toUpperCase();
    if (!query) return [];
    return eventStats
      .filter(event => event.code.toUpperCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.code.toUpperCase().startsWith(query) ? 1 : 0;
        const bStarts = b.code.toUpperCase().startsWith(query) ? 1 : 0;
        return bStarts - aStarts || b.totalSignups - a.totalSignups || a.code.localeCompare(b.code);
      })
      .slice(0, 12);
  }, [codeLookupQuery, eventStats]);

  const selectedLookupEvent = useMemo(() => {
    if (selectedLookupCode) {
      return eventStats.find(event => event.code === selectedLookupCode) ?? null;
    }
    const query = codeLookupQuery.trim().toUpperCase();
    return eventStats.find(event => event.code.toUpperCase() === query) ?? null;
  }, [selectedLookupCode, codeLookupQuery, eventStats]);

  const lookupProvinceRows = useMemo(() => {
    if (!selectedLookupEvent) return [];
    return Object.entries(selectedLookupEvent.signupsByProvince)
      .filter(([province]) => province && province !== "??")
      .sort((a, b) => b[1] - a[1]);
  }, [selectedLookupEvent]);

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
    const grandPaying = bdProvinceStats.reduce((s, p) => s + p.paying, 0);
    const hovered = hoverProv ? bdProvinceStats.find(p => p.province === hoverProv) : null;

    return (
      <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 md:gap-5 max-w-6xl mx-auto w-full">

        {/* ── Hero: national performance ── */}
        <div className="rounded-2xl px-5 py-5 md:px-7 md:py-6 animate-slide-up-in" style={{ background: "#2b5346" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[8px] font-mono uppercase tracking-[0.28em] text-white/40 mb-1.5">Regional · BD Events Database</p>
              <h2 className="text-[22px] md:text-[28px] font-black text-white leading-none tracking-tight">Province Performance</h2>
              <p className="text-[10px] font-mono text-white/40 mt-1">{dbDateRange} · {filteredProvs.length} province{filteredProvs.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-start gap-5 md:gap-7">
              <div>
                <p className="text-[26px] md:text-[34px] font-black font-mono text-[#e7bd27] leading-none tabular-nums">{totalEvents.toLocaleString()}</p>
                <p className="text-[8px] font-mono text-white/35 mt-0.5 uppercase tracking-[0.2em]">events</p>
              </div>
              <div>
                <p className="text-[26px] md:text-[34px] font-black font-mono text-white leading-none tabular-nums animate-num-rise">{grandTotal.toLocaleString()}</p>
                <p className="text-[8px] font-mono text-white/35 mt-0.5 uppercase tracking-[0.2em]">signups</p>
              </div>
              <div>
                <p className="text-[26px] md:text-[34px] font-black font-mono leading-none tabular-nums" style={{ color: "#8fc7ae" }}>{grandPaying.toLocaleString()}</p>
                <p className="text-[8px] font-mono text-white/35 mt-0.5 uppercase tracking-[0.2em]">
                  paying · {grandTotal > 0 ? ((grandPaying / grandTotal) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>
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
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all bg-white text-[#2b5346] border-[#d0e8e2] hover:bg-[#eef4f1] shrink-0 tap-scale"
              style={{ minHeight: "44px" }}
            >
              <Upload className="w-3 h-3 shrink-0" />
              Upload Looker file for LTV
            </button>
          )}
        </div>

        {/* ── Signature: national share strip ── */}
        {grandTotal > 0 && (
          <section className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm px-5 py-4 animate-slide-up-in">
            <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Share of national signups</p>
              <p className="text-[9px] font-mono" style={{ color: hovered ? provColor(hovered.province) : "#c0c0c0" }}>
                {hovered
                  ? `${PROV_FULL[hovered.province] ?? hovered.province} — ${hovered.signups.toLocaleString()} signups · ${hovered.signups > 0 ? ((hovered.paying / hovered.signups) * 100).toFixed(0) : 0}% paying · ${hovered.events} events`
                  : "click a province to open its ranked events below"}
              </p>
            </div>
            <div className="flex w-full h-11 rounded-lg overflow-hidden" style={{ gap: 2 }} role="img" aria-label="Province share of national signups">
              {bdProvinceStats.map(row => {
                const pct = (row.signups / grandTotal) * 100;
                const dimmed = !activeProvinces.has(row.province);
                return (
                  <button
                    key={row.province}
                    type="button"
                    onClick={() => {
                      setExpandedProvince(prev => prev === row.province ? null : row.province);
                      requestAnimationFrame(() =>
                        document.getElementById(`prov-row-${row.province}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
                      );
                    }}
                    onMouseEnter={() => setHoverProv(row.province)}
                    onMouseLeave={() => setHoverProv(null)}
                    className="flex items-center justify-center cursor-pointer transition-opacity min-w-0"
                    style={{
                      flexGrow: row.signups,
                      flexBasis: 0,
                      backgroundColor: provColor(row.province),
                      opacity: dimmed ? 0.3 : hoverProv && hoverProv !== row.province ? 0.65 : 1,
                    }}
                    aria-label={`${PROV_FULL[row.province] ?? row.province}: ${row.signups.toLocaleString()} signups, ${pct.toFixed(0)}% of national`}
                    title={`${row.province} · ${row.signups.toLocaleString()} signups · ${pct.toFixed(0)}%`}
                  >
                    {pct >= 7 && (
                      <span className="text-[10px] font-black font-mono whitespace-nowrap px-1" style={{ color: segText(row.province) }}>
                        {row.province} {pct.toFixed(0)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Code lookup */}
        <section className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0f0ee] bg-[#fafafa]">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Code lookup</p>
            <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5">Find any BD event code</h3>
            <p className="text-[10px] font-mono text-[#888] mt-0.5">
              Search all {eventStats.length.toLocaleString()} codes for timing, signup volume, and province distribution.
            </p>
          </div>

          <div className="p-5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1a1]" />
              <input
                type="text"
                value={codeLookupQuery}
                onChange={event => {
                  setCodeLookupQuery(event.target.value);
                  setSelectedLookupCode(null);
                }}
                placeholder="Search a code, e.g. BDCFTELUSHEALTH or EVSTAMPEDE…"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-sm font-mono text-[#1a1a1a] outline-none focus:border-[#2b5346] focus:bg-white"
              />
              {codeLookupQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setCodeLookupQuery("");
                    setSelectedLookupCode(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[#a1a1a1] hover:text-[#1a1a1a] cursor-pointer"
                  aria-label="Clear code lookup"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {codeLookupQuery.trim() && !selectedLookupEvent && (
              <div className="mt-2 border border-[#e8e8e8] rounded-xl overflow-hidden">
                {codeLookupMatches.length > 0 ? (
                  <div className="divide-y divide-[#f3f3f1] max-h-72 overflow-y-auto">
                    {codeLookupMatches.map(event => (
                      <button
                        key={event.code}
                        type="button"
                        onClick={() => {
                          setSelectedLookupCode(event.code);
                          setCodeLookupQuery(event.code);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-[#f7faf8] cursor-pointer tap-scale"
                        style={{ minHeight: "44px" }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black font-mono text-[#0f0f0f] truncate">{event.code}</p>
                          <p className="text-[9px] font-mono text-[#a1a1a1] mt-0.5 truncate">
                            {eventSchedule[event.code]?.name ?? (event.code.startsWith("EV") ? "EV-prefix event" : "BD partnership")} · {event.eventMonth || "date unavailable"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black font-mono text-[#2b5346]">{event.totalSignups.toLocaleString()}</p>
                          <p className="text-[8px] font-mono uppercase tracking-wide text-[#a1a1a1]">signups</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs font-semibold text-[#3d3d3d]">No matching BD event code.</p>
                    <p className="text-[9px] font-mono text-[#a1a1a1] mt-1">Try a shorter part of the code.</p>
                  </div>
                )}
              </div>
            )}

            {selectedLookupEvent && (
              <div className="mt-4 border border-[#dce9e4] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#eef4f1] border-b border-[#dce9e4] flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black font-mono text-[#0f0f0f]">{selectedLookupEvent.code}</h4>
                      <span className="text-[8.5px] font-black font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#2b5346]/20 text-[#2b5346] bg-white">
                        {selectedLookupEvent.code.startsWith("EV") ? "EV-prefix event" : "BD partnership"}
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-[#668176] mt-1">
                      Complete record from the built-in BD Events DB
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-semibold px-2 py-1 rounded border bg-white"
                    style={{ color: provColor(selectedLookupEvent.homeProvince), borderColor: provColor(selectedLookupEvent.homeProvince) + "40" }}>
                    Home: {selectedLookupEvent.homeProvince}
                  </span>
                </div>

                {/* BD wrap-up spreadsheet metadata: real event name, team, costs */}
                {(() => {
                  const meta = eventSchedule[selectedLookupEvent.code];
                  if (!meta) return null;
                  const spend = meta.totalSpend;
                  const perSignup = spend != null && selectedLookupEvent.totalSignups > 0 ? spend / selectedLookupEvent.totalSignups : null;
                  const perPaying = spend != null && selectedLookupEvent.payingSignups > 0 ? spend / selectedLookupEvent.payingSignups : null;
                  const money = (v: number, dec = 0) => `$${v.toLocaleString("en-CA", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
                  return (
                    <div className="px-4 py-3 border-b border-[#f0f0ee] bg-[#fffdf5]">
                      <p className="text-sm font-black text-[#0f0f0f]">{meta.name}</p>
                      <p className="text-[9px] font-mono text-[#888] mt-0.5">
                        {[meta.date, meta.team ? `Team: ${meta.team}` : null].filter(Boolean).join(" · ") || "BD event wrap-up record"}
                      </p>
                      {spend != null && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-white border border-[#f5e09a] text-[#8a6f00]">{money(spend)} total spend</span>
                          {perSignup != null && (
                            <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-white border border-[#e8e8e8] text-[#3d3d3d]">{money(perSignup, 2)} / signup</span>
                          )}
                          {perPaying != null && (
                            <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-white border border-[#d0e8e2] text-[#2b5346]">{money(perPaying, 2)} / paying customer</span>
                          )}
                        </div>
                      )}
                      <p className="text-[8.5px] font-mono text-[#b0b0b0] mt-1.5">Name, team &amp; costs from the BD event wrap-up spreadsheet</p>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-[#f0f0ee]">
                  <div className="p-4 flex items-center gap-3 bg-white">
                    <Users className="w-4 h-4 text-[#2b5346] shrink-0" />
                    <div>
                      <p className="text-lg font-black font-mono text-[#1a1a1a]">{selectedLookupEvent.totalSignups.toLocaleString()}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">total signups</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3 bg-white">
                    <TrendingUp className="w-4 h-4 text-[#4d8970] shrink-0" />
                    <div>
                      <p className="text-lg font-black font-mono text-[#2b5346]">
                        {selectedLookupEvent.payingSignups.toLocaleString()}
                        <span className="text-[11px] font-bold text-[#4d8970] ml-1.5">{(selectedLookupEvent.conversionRate * 100).toFixed(0)}%</span>
                      </p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">paying · conversion</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3 bg-white">
                    <CalendarDays className="w-4 h-4 text-[#6b8e9f] shrink-0" />
                    <div>
                      <p className="text-lg font-black font-mono text-[#1a1a1a]">{selectedLookupEvent.medianDaysToPay !== null ? Math.round(selectedLookupEvent.medianDaysToPay) : "—"}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">median days to pay</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3 bg-white">
                    <CalendarDays className="w-4 h-4 text-[#c9a000] shrink-0" />
                    <div>
                      <p className="text-sm font-black font-mono text-[#1a1a1a]">{formatIsoDate(selectedLookupEvent.firstSignupDate)}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">first signup date</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3 bg-white">
                    <CalendarDays className="w-4 h-4 text-[#9b4a1c] shrink-0" />
                    <div>
                      <p className="text-sm font-black font-mono text-[#1a1a1a]">{formatIsoDate(selectedLookupEvent.lastSignupDate)}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">last signup date</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3 bg-white">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: provColor(selectedLookupEvent.homeProvince) }} />
                    <div>
                      <p className="text-sm font-black font-mono text-[#1a1a1a]">{lookupProvinceRows.length}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">signup provinces</p>
                    </div>
                  </div>
                </div>

                {/* Status split + pre-existing accounts */}
                <div className="px-4 py-3 border-t border-[#f0f0ee] flex items-center gap-2 flex-wrap">
                  <span className="text-[8.5px] font-mono uppercase tracking-widest text-[#a1a1a1] mr-1">Status today</span>
                  <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-[#eef4f1] text-[#2b5346]">{selectedLookupEvent.statusCounts.active} active</span>
                  <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#8a6f00]">{selectedLookupEvent.statusCounts.paused} paused</span>
                  <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-[#f5f5f4] text-[#5a5a5a]">{selectedLookupEvent.statusCounts.closed} closed</span>
                  {selectedLookupEvent.preExistingAccounts > 0 && (
                    <span className="text-[9px] font-mono text-[#9b4a1c] ml-auto">
                      {selectedLookupEvent.preExistingAccounts} of {selectedLookupEvent.totalSignups} were existing accounts (created 90+ days pre-event)
                    </span>
                  )}
                </div>

                <div className="px-4 py-4 border-t border-[#f0f0ee]">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">Province distribution</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lookupProvinceRows.map(([province, signups]) => {
                      const share = selectedLookupEvent.totalSignups > 0
                        ? (signups / selectedLookupEvent.totalSignups) * 100
                        : 0;
                      return (
                        <div key={province}>
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="font-black" style={{ color: provColor(province) }}>{province}</span>
                            <span className="text-[#3d3d3d]">{signups.toLocaleString()} · {share.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-[#eee] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: provColor(province) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[8.5px] font-mono text-[#b0b0b0] mt-3">
                    Peak signup month: {selectedLookupEvent.eventMonth || "unknown"}. Upload Looker data to add LTV / customer value metrics.
                  </p>
                </div>

                {relatedCodes.length > 0 && (
                  <div className="px-4 py-4 border-t border-[#f0f0ee]">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-2">
                      Event history · {relatedCodes.length} related code{relatedCodes.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-col gap-1">
                      {relatedCodes.map(rc => (
                        <button
                          key={rc.code}
                          type="button"
                          onClick={() => {
                            setSelectedLookupCode(rc.code);
                            setCodeLookupQuery(rc.code);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg text-[10px] font-mono text-left hover:bg-[#f7faf8] cursor-pointer tap-scale"
                        >
                          <span className="flex-1 min-w-0 truncate font-black text-[#2b5346] underline decoration-[#2b5346]/25 underline-offset-2">{rc.code}</span>
                          <span className="shrink-0 text-[#a1a1a1]">{formatMonthKey(rc.eventMonth)}</span>
                          <span className="w-14 shrink-0 text-right font-black text-[#1a1a1a]">{rc.totalSignups.toLocaleString()}</span>
                          <span className="w-10 shrink-0 text-right text-[#4d8970]">{(rc.conversionRate * 100).toFixed(0)}%</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[8.5px] font-mono text-[#b0b0b0] mt-2">
                      Codes sharing the stem “{codeFamily(selectedLookupEvent.code)}” — likely the same recurring event across years.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Province leaderboard (ranked, expandable) ── */}
        <div className="flex flex-col gap-2.5">
          {filteredProvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white rounded-2xl border border-[#e8e8e8] shadow-sm animate-slide-up-in">
              <MapPin className="w-8 h-8 text-[#d0d0d0]" />
              <p className="text-sm font-semibold text-[#3d3d3d]">No provinces selected</p>
              <p className="text-[10px] font-mono text-[#a1a1a1]">Clear the province filter to show data</p>
            </div>
          ) : (
            filteredProvs.map((row, idx) => {
              const isOpen = expandedProvince === row.province;
              const isLeader = idx === 0 && filteredProvs.length > 1;
              const shareOfMax = filteredProvs[0].signups > 0 ? (row.signups / filteredProvs[0].signups) * 100 : 0;
              const sharePct = grandTotal > 0 ? (row.signups / grandTotal) * 100 : 0;
              const convPct = row.signups > 0 ? (row.paying / row.signups) * 100 : 0;
              const bdShare = provinceTotals[row.province]?.all
                ? (provinceTotals[row.province].bd / provinceTotals[row.province].all) * 100
                : null;
              return (
                <div
                  key={row.province}
                  id={`prov-row-${row.province}`}
                  className="bg-white rounded-2xl border overflow-hidden shadow-sm animate-slide-up-in"
                  style={{
                    borderColor: isOpen ? provColor(row.province) + "55" : "#e8e8e8",
                    animationDelay: `${idx * 45}ms`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedProvince(prev => prev === row.province ? null : row.province)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 md:gap-5 px-4 md:px-5 py-3.5 text-left cursor-pointer hover:bg-[#fbfbfa] transition-colors tap-scale"
                  >
                    <span
                      className="shrink-0 w-7 text-right font-black font-mono leading-none"
                      style={{ fontSize: 22, color: isLeader ? "#e7bd27" : "#e0ded9" }}
                    >
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className="font-black text-[13px] font-mono px-1.5 py-0.5 rounded border leading-none"
                          style={{ color: provColor(row.province), borderColor: provColor(row.province) + "40", backgroundColor: provColor(row.province) + "12" }}
                        >
                          {row.province}
                        </span>
                        <span className="text-[12px] font-semibold text-[#3d3d3d] truncate">{PROV_FULL[row.province] ?? row.province}</span>
                        <span className="text-[9px] font-mono text-[#a1a1a1]">
                          {row.events} event{row.events !== 1 ? "s" : ""} · {sharePct.toFixed(0)}% of national
                        </span>
                        {isLeader && (
                          <span className="text-[8px] font-black font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: "#8a6f00", background: "#fdf6dd" }}>
                            top province
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-2 bg-[#f0f0ee] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bar-grow" style={{ width: `${shareOfMax}%`, backgroundColor: provColor(row.province) }} />
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black font-mono text-[#0f0f0f] leading-none" style={{ fontSize: 20 }}>{row.signups.toLocaleString()}</p>
                      <p className="text-[9px] font-mono text-[#4d8970] mt-1">
                        {row.paying.toLocaleString()} paying · {convPct.toFixed(0)}%
                      </p>
                      {bdShare !== null && (
                        <p className="hidden md:block text-[8.5px] font-mono text-[#b0b0b0] mt-0.5">
                          BD = {bdShare.toFixed(1)}% of all {row.province} signups
                        </p>
                      )}
                    </div>

                    <ChevronDown
                      className="w-4 h-4 shrink-0 text-[#a1a1a1] transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                    />
                  </button>

                  {isOpen && (
                    <TopEventsList
                      events={topEventsByProvince.get(row.province) ?? []}
                      color={provColor(row.province)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Link to BD Fiscal for full breakdown */}
        {onNavigate && (
          <div className="bg-[#eef4f1] border border-[#2b5346]/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-[#2b5346]">Full fiscal breakdown available in BD Fiscal</p>
              <p className="text-[10px] text-[#3d3d3d] font-mono mt-0.5">Province × year table with YTD comparison and cost analysis</p>
            </div>
            <button
              onClick={() => onNavigate?.("fiscal")}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer bg-[#2b5346] text-white hover:bg-[#1a3d2f] tap-scale"
              style={{ transition: "background-color 150ms var(--ease-out)", minHeight: "44px" }}
            >
              Open BD Fiscal →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 md:gap-5 max-w-6xl mx-auto w-full">

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


      <ProvinceIntelligence dbRows={dbRows} foundReports={filteredReports} channelScope={channelScope} />
    </div>
  );
}
