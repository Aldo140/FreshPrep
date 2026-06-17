import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, Database, ArrowRight, Info, ChevronDown, X, Maximize2, TrendingUp, Users, Target, Search } from "lucide-react";
import { AnalyzedCodeReport, DiscountCodeData, AnalysisFlow } from "../../../types";
import DetailedTable from "../components/DetailedTable";
import DataExplorer from "../components/DataExplorer";

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

// ── Full-screen analytics overlay ────────────────────────────────────────────
function FullscreenView({ reports, onClose }: { reports: AnalyzedCodeReport[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const tierRefs  = useRef<Record<string, HTMLDivElement | null>>({});

  const TIER_META: Record<string, { color: string; range: string }> = {
    Strong:  { color: "#2b5346", range: "≥ 40% conv" },
    Good:    { color: "#3d7060", range: "30–40% conv" },
    Average: { color: "#c9a000", range: "20–30% conv" },
    Weak:    { color: "#c87a3c", range: "10–20% conv" },
    Poor:    { color: "#c84040", range: "< 10% conv"  },
  };
  const TIER_ORDER = ["Strong", "Good", "Average", "Weak", "Poor"];

  // Ring constants
  const R = 38, CX = 48, CY = 48, CIRC = 2 * Math.PI * R; // ≈ 238.8

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const q        = search.trim().toLowerCase();
  const filtered = q ? reports.filter(r => r.discount_code.toLowerCase().includes(q)) : reports;
  const grouped  = TIER_ORDER
    .map(tier => ({ tier, codes: filtered.filter(r => r.performanceRating === tier).sort((a, b) => b.calculatedConversion - a.calculatedConversion) }))
    .filter(g => g.codes.length > 0);

  const total    = reports.length;
  const avgConv  = total > 0 ? reports.reduce((s, r) => s + r.calculatedConversion, 0) / total : 0;
  const aboveTgt = reports.filter(r => r.calculatedConversion >= 40).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#f8f7f5" }}>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, backgroundColor: "#ffffff", borderBottom: "1px solid #ebebea", boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
        {/* FreshPrep accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg,#1e3d31 0%,#2b5346 40%,#4d8970 75%,#86b09e 100%)" }} />

        <div className="px-8 py-4 flex items-center gap-5 flex-wrap">
          {/* Identity */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4f1", border: "1px solid rgba(43,83,70,0.18)" }}>
              <Maximize2 className="w-4 h-4 text-[#2b5346]" />
            </div>
            <div>
              <p className="text-[7.5px] font-mono uppercase tracking-[0.22em] text-[#b0b0b0]">FreshPrep · Code Intelligence</p>
              <h1 className="text-[19px] font-black text-[#0f0f0f] leading-none tracking-tight mt-0.5">
                {total} Codes
                <span className="text-[12px] font-normal text-[#b8b8b8] ml-2.5 tracking-normal">full screen</span>
              </h1>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-9 shrink-0 bg-[#ebebea]" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[300px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-[#c0c0c0]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Filter codes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl font-mono text-[11.5px] focus:outline-none"
              style={{ background: "#f5f5f3", border: "1px solid #e4e4e2", color: "#1a1a1a", caretColor: "#2b5346" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#c0c0c0] hover:text-[#888] transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="hidden lg:flex items-center gap-8 shrink-0 ml-2">
            {[
              { v: `${avgConv.toFixed(1)}%`, l: "avg conversion",   green: false },
              { v: String(aboveTgt),          l: "above 40% target", green: true  },
            ].map(({ v, l, green }) => (
              <div key={l} className="text-right">
                <p className="text-[20px] font-black font-mono leading-none" style={{ color: green ? "#2b5346" : "#1a1a1a" }}>{v}</p>
                <p className="text-[7px] font-mono uppercase tracking-wider mt-1 text-[#b8b8b8]">{l}</p>
              </div>
            ))}
          </div>

          {/* Portfolio bar */}
          <div className="hidden xl:flex flex-col gap-1.5 shrink-0">
            <div className="flex h-2 w-28 rounded-full overflow-hidden bg-[#ebebea]">
              {TIER_ORDER.map(t => {
                const n = reports.filter(r => r.performanceRating === t).length;
                return n ? <div key={t} style={{ width: `${(n / total) * 100}%`, backgroundColor: TIER_META[t]?.color ?? "#888" }} /> : null;
              })}
            </div>
            <div className="flex gap-2.5">
              {TIER_ORDER.filter(t => reports.some(r => r.performanceRating === t)).map(t => (
                <button key={t}
                  onClick={() => tierRefs.current[t]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="text-[7.5px] font-mono cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: TIER_META[t]?.color ?? "#888" }}
                >
                  {reports.filter(r => r.performanceRating === t).length}&nbsp;{t}
                </button>
              ))}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[11.5px] cursor-pointer ml-auto transition-colors hover:bg-[#f0f0ee] bg-[#f5f5f3] text-[#3d3d3d] border border-[#e4e4e2]"
          >
            <X className="w-3.5 h-3.5" />
            Close
            <span className="hidden sm:inline font-mono text-[8.5px] opacity-40 ml-0.5">Esc</span>
          </button>
        </div>
      </div>

      {/* ── TIER JUMP NAV ────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, backgroundColor: "#f2f2f0", borderBottom: "1px solid #e8e8e6" }}>
        <div className="flex items-center gap-2 px-8 py-2.5 overflow-x-auto">
          {TIER_ORDER.filter(t => grouped.some(g => g.tier === t)).map(tier => {
            const count = grouped.find(g => g.tier === tier)?.codes.length ?? 0;
            const { color } = TIER_META[tier];
            return (
              <button key={tier}
                onClick={() => tierRefs.current[tier]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-[10.5px] font-semibold cursor-pointer transition-all hover:opacity-90"
                style={{ backgroundColor: color + "14", color, border: `1.5px solid ${color}35` }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {tier}
                <span className="opacity-50 text-[9px]">{count}</span>
              </button>
            );
          })}
          {q && (
            <span className="text-[10px] font-mono ml-3 shrink-0 text-[#b0b0b0]">
              {filtered.length} of {total} shown
            </span>
          )}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#f8f7f5" }}>
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#e8e8e6] flex items-center justify-center shadow-sm">
              <Search className="w-7 h-7 text-[#d8d8d8]" />
            </div>
            <div className="text-center">
              <p className="font-mono text-[14px] font-semibold text-[#888]">No codes match</p>
              <p className="font-mono text-[11px] mt-1 text-[#c0c0c0]">"{search}"</p>
            </div>
            <button onClick={() => setSearch("")} className="text-[11px] font-mono cursor-pointer px-4 py-1.5 rounded-lg text-[#2b5346] border border-[#2b5346]/25 bg-[#eef4f1]">
              Clear filter
            </button>
          </div>
        ) : (
          <div className="px-8 py-10 flex flex-col gap-14 max-w-[1500px] mx-auto">
            {grouped.map(({ tier, codes }) => {
              const { color, range } = TIER_META[tier] ?? { color: "#888", range: "" };
              const tierAvg = codes.reduce((s, r) => s + r.calculatedConversion, 0) / codes.length;

              return (
                <div key={tier} ref={el => { tierRefs.current[tier] = el; }}>

                  {/* Tier heading */}
                  <div className="flex items-end gap-5 mb-7">
                    <div>
                      <p className="text-[8.5px] font-mono uppercase tracking-[0.2em] mb-1.5" style={{ color: color + "99" }}>{range}</p>
                      <h2 className="text-[24px] font-black tracking-tight leading-none" style={{ color }}>{tier}</h2>
                    </div>
                    <div className="mb-1 px-3 py-1 rounded-full font-mono text-[10px] font-semibold" style={{ backgroundColor: color + "12", color, border: `1.5px solid ${color}30` }}>
                      {codes.length} code{codes.length !== 1 ? "s" : ""}
                    </div>
                    <p className="mb-1 text-[11px] font-mono" style={{ color: color + "77" }}>
                      avg&nbsp;{tierAvg.toFixed(1)}%
                    </p>
                    <div className="flex-1 mb-2 h-px" style={{ background: `linear-gradient(to right, ${color}35, transparent)` }} />
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {codes.map((r, idx) => {
                      const convFrac = Math.min(r.calculatedConversion / 80, 1);
                      const dashLen  = convFrac * CIRC;
                      const aboveT   = r.calculatedConversion >= 40;
                      const glowId   = `rg-${tier}-${idx}`;

                      return (
                        <div
                          key={`${r.discount_code}-${r.Province ?? ""}-${idx}`}
                          className="rounded-2xl flex flex-col overflow-hidden bg-white"
                          style={{
                            border: "1px solid #eaeae8",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                            transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.transform   = "translateY(-4px)";
                            el.style.boxShadow   = `0 0 0 1.5px ${color}88, 0 12px 32px ${color}20, 0 4px 12px rgba(0,0,0,0.08)`;
                            el.style.borderColor = color + "60";
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.transform   = "translateY(0)";
                            el.style.boxShadow   = "0 1px 4px rgba(0,0,0,0.05)";
                            el.style.borderColor = "#eaeae8";
                          }}
                        >
                          {/* Tier top strip */}
                          <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}66)` }} />

                          <div className="px-4 pt-4 pb-3 flex flex-col gap-3 flex-1">
                            {/* Code name + grade */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono font-black text-[11px] text-[#0f0f0f] leading-tight break-all">{r.discount_code}</p>
                                {r.Province && r.Province !== "ON" && (
                                  <span className="mt-1 inline-block text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-[#f5f5f3] text-[#a0a0a0] border border-[#e8e8e8]">
                                    {r.Province}
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[13px] font-mono text-white" style={{ backgroundColor: color }}>
                                {r.performanceGrade}
                              </div>
                            </div>

                            {/* SVG circular progress ring */}
                            <div className="flex flex-col items-center py-1">
                              <svg width="96" height="96" viewBox={`0 0 ${CX * 2} ${CY * 2}`}>
                                <defs>
                                  <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor={color} stopOpacity="0.10" />
                                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                                  </radialGradient>
                                </defs>
                                <circle cx={CX} cy={CY} r={R + 12} fill={`url(#${glowId})`} />
                                {/* Track */}
                                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f0f0ee" strokeWidth="5.5" />
                                {/* Arc */}
                                <circle cx={CX} cy={CY} r={R} fill="none"
                                  stroke={color} strokeWidth="5.5"
                                  strokeLinecap="round"
                                  strokeDasharray={`${dashLen} ${CIRC}`}
                                  transform={`rotate(-90 ${CX} ${CY})`}
                                  style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
                                />
                                <text x={CX} y={CY - 3} textAnchor="middle"
                                  fontSize="16" fontWeight="900" fill={color} fontFamily="monospace">
                                  {r.calculatedConversion.toFixed(1)}
                                </text>
                                <text x={CX} y={CY + 13} textAnchor="middle"
                                  fontSize="10.5" fontWeight="700" fontFamily="monospace"
                                  fill={color} fillOpacity="0.55">
                                  %
                                </text>
                              </svg>
                              <p className="text-[7.5px] font-mono -mt-0.5" style={{ color: aboveT ? color : "#c8c8c8" }}>
                                {aboveT ? "✓ on target" : `−${(40 - r.calculatedConversion).toFixed(1)}% gap`}
                              </p>
                            </div>

                            {/* Stats 2×2 */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#f2f2f0]">
                              {[
                                { l: "Paying",  v: String(r["Paying cx"]) },
                                { l: "Signups", v: String(r.Signups) },
                                { l: "LTV 12M", v: `$${r["Avg LTV 12"].toFixed(0)}` },
                                { l: "LTV 3M",  v: `$${r["Avg LTV 3"].toFixed(0)}` },
                              ].map(({ l, v }) => (
                                <div key={l} className="pt-1">
                                  <p className="text-[7px] font-mono uppercase tracking-wide leading-none text-[#c8c8c8]">{l}</p>
                                  <p className="text-[12px] font-bold font-mono leading-snug mt-0.5 text-[#1a1a1a]">{v}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Channel footer */}
                          <div className="px-4 py-2.5 border-t border-[#f5f5f3] bg-[#fafafa]">
                            <p className="text-[8.5px] font-mono truncate text-[#b0b0b0]">{r.channel}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="h-14" />
          </div>
        )}
      </div>
    </div>
  );
}

export function DataTab({ foundReports, uniqueChannels, dbRows, fileName, selectedFlow, onSwitchToExplorer }: DataTabProps): React.ReactElement {
  const [expandedTier,    setExpandedTier]    = useState<string | null>(null);
  const [fullscreenOpen,  setFullscreenOpen]  = useState(false);

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

      {/* Full-screen modal */}
      {fullscreenOpen && <FullscreenView reports={foundReports} onClose={() => setFullscreenOpen(false)} />}

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1a1a1a]">Data</h2>
          <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">
            {total} matched code{total !== 1 ? "s" : ""} · {dbRows.length.toLocaleString()} total records in database
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {total > 0 && (
            <button
              onClick={() => setFullscreenOpen(true)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1a1a1a] hover:bg-[#f0f0f0] px-3 py-1.5 rounded-lg border border-[#e8e8e8] bg-white transition-colors cursor-pointer shadow-sm"
            >
              <Maximize2 className="w-3 h-3" />
              Full Screen View
            </button>
          )}
          {selectedFlow === "paste" && (
            <button
              onClick={() => document.getElementById("source-file-explorer")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2b5346] hover:bg-[#eef4f1] px-3 py-1.5 rounded-lg border border-[#2b5346]/20 transition-colors cursor-pointer"
            >
              Raw explorer
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
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
      <div id="source-file-explorer" className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
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
