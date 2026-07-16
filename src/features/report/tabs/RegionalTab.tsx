import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Database, MapPin, Search, Upload, Users, X } from "lucide-react";
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
        Top {events.length} event{events.length !== 1 ? "s" : ""} · by signups
      </p>
      <div className="flex flex-col gap-1.5">
        {events.map((e, i) => (
          <div key={e.code}>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-4 shrink-0 text-right font-black" style={{ color }}>{i + 1}</span>
              <span className="flex-1 min-w-0 truncate font-black text-[#1a1a1a]">{e.code}</span>
              <span className="shrink-0 text-[#a1a1a1]">{formatMonthKey(e.eventMonth)}</span>
              <span className="w-12 shrink-0 text-right font-black text-[#2b5346]">{e.totalSignups.toLocaleString()}</span>
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
  onUploadLooker?: () => void;
  activeProvince?: string | null;
  onNavigate?: (page: ReportPage) => void;
  channelScope?: string;
}

export function RegionalTab({ dbRows, foundReports, selectedFlow, userPersona, eventStats = [], onUploadLooker, activeProvince, onNavigate, channelScope }: RegionalTabProps): React.ReactElement {
  const relevance = TAB_RELEVANCE.regional[selectedFlow];
  const bdOnly = dbRows.length === 0 && foundReports.length === 0;
  const [codeLookupQuery, setCodeLookupQuery] = useState("");
  const [selectedLookupCode, setSelectedLookupCode] = useState<string | null>(null);
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);

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

    return (
      <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 md:gap-5 max-w-6xl mx-auto w-full">

        {/* ── MOBILE: summary hero strip ── DESKTOP: original header ── */}
        {/* Mobile hero */}
        <div
          className="md:hidden rounded-2xl px-5 py-5 flex flex-col gap-1 animate-slide-up-in"
          style={{ background: "#2b5346" }}
        >
          <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/60">Regional · BD Events Database</p>
          <div className="flex items-end justify-between gap-3 mt-1">
            <div>
              <p
                className="text-[38px] font-black font-mono text-white leading-none animate-num-rise"
                style={{ fontFamily: "DM Mono, monospace" }}
              >
                {grandTotal.toLocaleString()}
              </p>
              <p className="text-[11px] text-white/70 mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                signups across Canada
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className="text-[26px] font-black text-white/90 leading-none"
                style={{ fontFamily: "DM Mono, monospace" }}
              >
                {filteredProvs.length}
              </p>
              <p className="text-[9px] text-white/55 uppercase tracking-wide mt-0.5" style={{ fontFamily: "DM Mono, monospace" }}>
                provinces
              </p>
            </div>
          </div>
          <p className="text-[9px] font-mono text-white/45 mt-2">{dbDateRange}</p>
        </div>

        {/* Desktop header (unchanged) */}
        <div className="hidden md:flex items-end justify-between gap-4 flex-wrap">
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
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all bg-white text-[#2b5346] border-[#d0e8e2] hover:bg-[#eef4f1] shrink-0 tap-scale"
              style={{ minHeight: "44px" }}
            >
              <Upload className="w-3 h-3 shrink-0" />
              Upload Looker file for LTV &amp; conversion
            </button>
          )}
        </div>

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
                          <p className="text-[9px] font-mono text-[#a1a1a1] mt-0.5">
                            {event.code.startsWith("EV") ? "EV-prefix event" : "BD partnership"} · {event.eventMonth || "date unavailable"}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f0ee]">
                  <div className="p-4 flex items-center gap-3">
                    <Users className="w-4 h-4 text-[#2b5346] shrink-0" />
                    <div>
                      <p className="text-lg font-black font-mono text-[#1a1a1a]">{selectedLookupEvent.totalSignups.toLocaleString()}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">total signups</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-[#c9a000] shrink-0" />
                    <div>
                      <p className="text-sm font-black font-mono text-[#1a1a1a]">{formatIsoDate(selectedLookupEvent.firstSignupDate)}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">first signup date</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-[#9b4a1c] shrink-0" />
                    <div>
                      <p className="text-sm font-black font-mono text-[#1a1a1a]">{formatIsoDate(selectedLookupEvent.lastSignupDate)}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">last signup date</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: provColor(selectedLookupEvent.homeProvince) }} />
                    <div>
                      <p className="text-sm font-black font-mono text-[#1a1a1a]">{lookupProvinceRows.length}</p>
                      <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1]">signup provinces</p>
                    </div>
                  </div>
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
                    Peak signup month: {selectedLookupEvent.eventMonth || "unknown"}. Upload Looker LTV data to add conversion and customer value metrics.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── MOBILE: province filter pills (horizontal scroll) ── */}
        {allProvinces.length > 1 && (
          <div className="md:hidden snap-x-scroll no-scrollbar flex gap-2 pb-1">
            {allProvinces.map(p => {
              const isActive = activeProvinces.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProvince(p)}
                  className="snap-start shrink-0 flex items-center gap-1.5 px-3 rounded-full text-[11px] font-black font-mono cursor-pointer tap-scale border transition-all"
                  style={{
                    minHeight: "44px",
                    color: isActive ? "#fff" : provColor(p),
                    backgroundColor: isActive ? provColor(p) : provColor(p) + "14",
                    borderColor: provColor(p) + (isActive ? "ff" : "40"),
                  }}
                  aria-pressed={isActive}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}

        {/* ── MOBILE: province tiles ── DESKTOP: original 2-col grid ── */}

        {/* Mobile tiles */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredProvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white rounded-2xl border border-[#e8e8e8] shadow-sm animate-slide-up-in">
              <MapPin className="w-8 h-8 text-[#d0d0d0]" />
              <p className="text-sm font-semibold text-[#3d3d3d]">No provinces selected</p>
              <p className="text-[10px] font-mono text-[#a1a1a1]">Tap a province pill above to show data</p>
            </div>
          ) : (
            filteredProvs.map(row => {
              const shareW = grandTotal > 0 ? (row.signups / grandTotal) * 100 : 0;
              const PROV_FULL: Record<string, string> = {
                BC: "British Columbia", AB: "Alberta", ON: "Ontario",
                QC: "Quebec", SK: "Saskatchewan", MB: "Manitoba",
                NS: "Nova Scotia", NB: "New Brunswick",
              };
              const fullName = PROV_FULL[row.province] ?? row.province;
              return (
                <div
                  key={row.province}
                  className="bg-white border border-[#e8e8e8] overflow-hidden animate-slide-up-in"
                  style={{ borderRadius: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minHeight: "72px" }}
                >
                  {/* Tile body */}
                  <button
                    type="button"
                    onClick={() => setExpandedProvince(prev => prev === row.province ? null : row.province)}
                    aria-expanded={expandedProvince === row.province}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer tap-scale"
                  >
                    {/* Left: colored square + province abbr */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div
                        className="rounded-[3px]"
                        style={{ width: "12px", height: "12px", backgroundColor: provColor(row.province) }}
                      />
                      <span
                        className="font-black"
                        style={{ fontFamily: "DM Mono, monospace", fontSize: "13px", color: provColor(row.province) }}
                      >
                        {row.province}
                      </span>
                    </div>

                    {/* Center: full name + event count */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[#3d3d3d] truncate"
                        style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px" }}
                      >
                        {fullName}
                      </p>
                      <p
                        className="text-[#a1a1a1] mt-0.5"
                        style={{ fontFamily: "DM Mono, monospace", fontSize: "10px" }}
                      >
                        {row.events} event{row.events !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Right: signup count */}
                    <div className="shrink-0 text-right">
                      <p
                        className="font-black text-[#1a1a1a] leading-none"
                        style={{ fontFamily: "DM Mono, monospace", fontSize: "18px" }}
                      >
                        {row.signups.toLocaleString()}
                      </p>
                      <p
                        className="text-[#a1a1a1] mt-0.5"
                        style={{ fontFamily: "DM Mono, monospace", fontSize: "9px" }}
                      >
                        signups
                      </p>
                    </div>

                    <ChevronDown
                      className="w-4 h-4 shrink-0 text-[#a1a1a1] transition-transform"
                      style={{ transform: expandedProvince === row.province ? "rotate(180deg)" : "none" }}
                    />
                  </button>

                  {/* Full-width progress bar */}
                  <div className="h-[3px] bg-[#f0f0f0] w-full">
                    <div
                      className="h-full bar-grow"
                      style={{ width: `${shareW}%`, backgroundColor: provColor(row.province) }}
                    />
                  </div>

                  {expandedProvince === row.province && (
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

        {/* Desktop: original 2-col grid (unchanged) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProvs.map(row => {
            const shareW = grandTotal > 0 ? (row.signups / grandTotal) * 100 : 0;
            return (
              <div key={row.province} className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden self-start">
                <button
                  type="button"
                  onClick={() => setExpandedProvince(prev => prev === row.province ? null : row.province)}
                  aria-expanded={expandedProvince === row.province}
                  className="w-full px-5 py-4 text-left cursor-pointer hover:bg-[#fafaf9] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="font-black text-[13px] font-mono px-2 py-0.5 rounded border"
                      style={{ color: provColor(row.province), borderColor: provColor(row.province) + "40", backgroundColor: provColor(row.province) + "12" }}
                    >
                      {row.province}
                    </span>
                    <span className="flex items-center gap-1.5 text-[9px] font-mono text-[#a1a1a1]">
                      {row.events} event{row.events !== 1 ? "s" : ""}
                      <ChevronDown
                        className="w-3.5 h-3.5 transition-transform"
                        style={{ transform: expandedProvince === row.province ? "rotate(180deg)" : "none" }}
                      />
                    </span>
                  </div>
                  <p className="text-2xl font-black font-mono text-[#1a1a1a] leading-none">{row.signups.toLocaleString()}</p>
                  <p className="text-[9px] font-mono text-[#a1a1a1] mt-1">signups · {shareW.toFixed(0)}% of total</p>
                  <div className="mt-2 h-1 bg-[#eee] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${shareW}%`, backgroundColor: provColor(row.province) }} />
                  </div>
                </button>
                {expandedProvince === row.province && (
                  <TopEventsList
                    events={topEventsByProvince.get(row.province) ?? []}
                    color={provColor(row.province)}
                  />
                )}
              </div>
            );
          })}
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
