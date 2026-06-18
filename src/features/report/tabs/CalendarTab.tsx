import React, { useMemo, useRef, useState } from "react";
import { Loader2, ChevronRight, Upload, X, ChevronDown, ChevronUp, Database } from "lucide-react";
import { EventStats, CustomerDataResult } from "../../../hooks/useCustomerData";
import { AnalyzedCodeReport, AnalysisFlow } from "../../../types";

interface CalendarTabProps {
  customerData: CustomerDataResult;
  rawPastedCodes: string[];
  foundReports: AnalyzedCodeReport[];
  selectedFlow: AnalysisFlow;
  staticLoading: boolean;
  staticError: string | null;
  customerFileName: string | null;
  isLoadingCustomer: boolean;
  onCustomerFile: (file: File) => void;
  onClearCustomer: () => void;
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
  NS: "#5a5a5a", NB: "#888",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

function convGradeColor(rate: number): string {
  if (rate >= 40) return "#2b5346";
  if (rate >= 30) return "#3d7060";
  if (rate >= 20) return "#c9a000";
  return "#9b4a1c";
}

function heatStyle(signups: number, max: number): { bg: string; text: string; subtext: string } {
  if (signups === 0) return { bg: "transparent", text: "#d0d0d0", subtext: "#d0d0d0" };
  const t = Math.pow(signups / max, 0.55);
  const r = Math.round(255 - t * (255 - 43));
  const g = Math.round(255 - t * (255 - 83));
  const b = Math.round(255 - t * (255 - 70));
  return {
    bg: `rgb(${r},${g},${b})`,
    text: t > 0.55 ? "rgba(255,255,255,0.95)" : "#1a1a1a",
    subtext: t > 0.55 ? "rgba(255,255,255,0.6)" : "#888",
  };
}

function generateMonthRange(from: string, to: string): string[] {
  const slots: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    slots.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return slots;
}

function monthLabel(mk: string): string {
  const [, m] = mk.split("-");
  return MONTH_ABBR[Number(m) - 1];
}

interface CellKey { prov: string; month: string }

const LOOKER_STEPS = [
  {
    step: "01",
    title: "Open Looker Studio",
    body: "Go to Looker Studio and open the FreshPrep analytics workspace. Navigate to the Signup Flow Evaluation Dashboard.",
  },
  {
    step: "02",
    title: "Find the Exportable Client List",
    body: "Look for the section or table labelled \"Exportable Client List\". This view includes every signup with email, status, province, first paying date, and days till paying.",
  },
  {
    step: "03",
    title: "Set your date range",
    body: "Use the date filter at the top of the dashboard. Set the start date to when your oldest event ran and the end date to today — or beyond to capture late conversions.",
  },
  {
    step: "04",
    title: "Export as CSV",
    body: "Click the three-dot menu (⋮) in the top-right corner of the table → Export → CSV. Save the file to your machine, then drop it below.",
  },
];

const EXPECTED_COLS = [
  { name: "signup_date",       note: "Date customer registered — e.g. Jan 1, 2025" },
  { name: "client_id",         note: "Unique customer ID" },
  { name: "current_status",    note: "active / paused / closed" },
  { name: "discount_code",     note: "Promo code used at signup — EV-prefix codes = events" },
  { name: "channel",           note: "BusinessDevelopment, PaidSocial, Referral, etc." },
  { name: "email",             note: "Customer email address" },
  { name: "last_step",         note: "Furthest funnel step reached — e.g. Paying Customer" },
  { name: "province",          note: "Province where customer signed up" },
  { name: "first_paying_date", note: "Date of first paid order" },
  { name: "days till paying",  note: "Days from signup to first paying delivery week — slight discrepancy vs. exact date is expected" },
];

export function CalendarTab({
  customerData, rawPastedCodes, foundReports, selectedFlow,
  staticLoading, staticError,
  customerFileName, isLoadingCustomer, onCustomerFile, onClearCustomer,
}: CalendarTabProps): React.ReactElement {

  const [activeProvs, setActiveProvs] = useState<Set<string> | null>(null);
  const [selected, setSelected] = useState<CellKey | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteOnly, setPasteOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { eventStats } = customerData;
  const isCustomData = !!customerFileName;

  const reportByCode = useMemo(() => {
    const m = new Map<string, AnalyzedCodeReport>();
    for (const r of foundReports) m.set(r.discount_code, r);
    return m;
  }, [foundReports]);

  const pastedSet = useMemo(
    () => new Set(rawPastedCodes.map(c => c.toUpperCase())),
    [rawPastedCodes],
  );

  const isFilteredPaste = selectedFlow === "paste" && pastedSet.size > 0;

  // Events visible under current paste-only filter
  const visibleStats = useMemo(() =>
    pasteOnly && isFilteredPaste
      ? eventStats.filter(e => pastedSet.has(e.code))
      : eventStats,
    [eventStats, pastedSet, pasteOnly, isFilteredPaste],
  );

  // Derive month range dynamically from actual data
  const MONTH_SLOTS = useMemo(() => {
    const months = visibleStats.map(e => e.eventMonth).filter(Boolean);
    if (months.length === 0) return generateMonthRange("2025-01", "2026-06");
    const min = months.reduce((a, b) => a < b ? a : b);
    const max = months.reduce((a, b) => a > b ? a : b);
    return generateMonthRange(min, max);
  }, [visibleStats]);

  // Year boundaries: indices where the year changes from previous slot
  const yearBounds = useMemo(() => {
    const s = new Set<number>();
    for (let i = 1; i < MONTH_SLOTS.length; i++) {
      if (MONTH_SLOTS[i].slice(0, 4) !== MONTH_SLOTS[i - 1].slice(0, 4)) s.add(i);
    }
    return s;
  }, [MONTH_SLOTS]);

  // Year spans for header
  const yearSpans = useMemo(() => {
    const spans: { year: string; count: number }[] = [];
    for (const mk of MONTH_SLOTS) {
      const y = mk.slice(0, 4);
      if (spans.length === 0 || spans[spans.length - 1].year !== y) {
        spans.push({ year: y, count: 1 });
      } else {
        spans[spans.length - 1].count++;
      }
    }
    return spans;
  }, [MONTH_SLOTS]);

  // Provinces ordered by total signup volume
  const allProvs = useMemo(() => {
    const vol = new Map<string, number>();
    for (const e of visibleStats) {
      if (!e.homeProvince || e.homeProvince === "??") continue;
      vol.set(e.homeProvince, (vol.get(e.homeProvince) ?? 0) + e.totalSignups);
    }
    return Array.from(vol.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [visibleStats]);

  const selProvs = activeProvs ?? new Set(allProvs);
  const visProvs = allProvs.filter(p => selProvs.has(p));

  const toggleProv = (p: string) => {
    const next = new Set(selProvs);
    if (next.has(p) && next.size === 1) return;
    next.has(p) ? next.delete(p) : next.add(p);
    setActiveProvs(next);
    setSelected(null);
  };

  const matrix = useMemo(() => {
    const m = new Map<string, { signups: number; events: EventStats[] }>();
    for (const e of visibleStats) {
      if (!selProvs.has(e.homeProvince)) continue;
      const k = `${e.homeProvince}||${e.eventMonth}`;
      if (!m.has(k)) m.set(k, { signups: 0, events: [] });
      const cell = m.get(k)!;
      cell.signups += e.totalSignups;
      cell.events.push(e);
    }
    return m;
  }, [visibleStats, selProvs]);

  const monthTotals = useMemo(() =>
    MONTH_SLOTS.map(mo => {
      let s = 0;
      for (const prov of visProvs) s += matrix.get(`${prov}||${mo}`)?.signups ?? 0;
      return s;
    }),
    [matrix, visProvs, MONTH_SLOTS],
  );

  const maxCellSignups = useMemo(() => {
    let m = 1;
    for (const { signups } of matrix.values()) m = Math.max(m, signups);
    return m;
  }, [matrix]);

  const maxMonthTotal = Math.max(1, ...monthTotals);

  const totalSignups = useMemo(
    () => visibleStats.filter(e => selProvs.has(e.homeProvince)).reduce((s, e) => s + e.totalSignups, 0),
    [visibleStats, selProvs],
  );

  const visibleEventCount = useMemo(
    () => visibleStats.filter(e => selProvs.has(e.homeProvince)).length,
    [visibleStats, selProvs],
  );

  const selectedEvents = useMemo((): EventStats[] => {
    if (!selected) return [];
    return (matrix.get(`${selected.prov}||${selected.month}`)?.events ?? [])
      .sort((a, b) => b.totalSignups - a.totalSignups);
  }, [matrix, selected]);

  // Province breakdown for selected cell header
  const cellProvTotals = useMemo((): [string, number][] => {
    const t: Record<string, number> = {};
    for (const e of selectedEvents) {
      for (const [p, n] of Object.entries(e.signupsByProvince)) {
        t[p] = (t[p] ?? 0) + n;
      }
    }
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [selectedEvents]);

  const selectCell = (prov: string, month: string) => {
    if (!matrix.has(`${prov}||${month}`)) return;
    setSelected(prev => (prev?.prov === prov && prev.month === month ? null : { prov, month }));
  };

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      alert("Please upload a CSV or XLSX file.");
      return;
    }
    onCustomerFile(file);
    setShowUpload(false);
  };

  const dateRangeLabel = useMemo(() => {
    if (MONTH_SLOTS.length === 0) return "";
    const first = MONTH_SLOTS[0];
    const last = MONTH_SLOTS[MONTH_SLOTS.length - 1];
    const [fy, fm] = first.split("-");
    const [ly, lm] = last.split("-");
    const fLabel = `${MONTH_ABBR[Number(fm) - 1]} ${fy}`;
    const lLabel = `${MONTH_ABBR[Number(lm) - 1]} ${ly}`;
    return fLabel === lLabel ? fLabel : `${fLabel} – ${lLabel}`;
  }, [MONTH_SLOTS]);

  // ── Loading / error states ──────────────────────────────────
  if (staticLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-12">
        <Loader2 className="w-6 h-6 text-[#2b5346] animate-spin" />
        <p className="text-xs text-[#a1a1a1] font-mono">Loading event data…</p>
      </div>
    );
  }
  if (staticError) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <p className="text-sm text-[#850b0b] font-mono">{staticError}</p>
      </div>
    );
  }
  if (eventStats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <p className="text-sm text-[#a1a1a1] font-mono">No event data available.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-7 max-w-7xl mx-auto flex flex-col gap-5 w-full">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Event Calendar</p>
          <h2 className="text-[20px] font-black text-[#0f0f0f]">BD Events · {dateRangeLabel}</h2>
          <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">
            Each cell = total signups for that province × month. Click any cell to drill in.
          </p>
        </div>
        <div className="flex items-center gap-5 shrink-0 flex-wrap">
          <div className="text-right">
            <p className="text-2xl font-black font-mono text-[#2b5346]">{visibleEventCount}</p>
            <p className="text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wide">events</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black font-mono text-[#1a1a1a]">{totalSignups.toLocaleString()}</p>
            <p className="text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wide">signups</p>
          </div>
        </div>
      </div>

      {/* ── Data source bar ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Database className="w-3.5 h-3.5 shrink-0" style={{ color: isCustomData ? "#2b5346" : "#a1a1a1" }} />
          {isCustomData ? (
            <>
              <span className="text-[11px] font-semibold text-[#1a1a1a] font-mono truncate">{customerFileName}</span>
              <span className="text-[9px] font-mono text-[#2b5346] bg-[#eef4f1] px-2 py-0.5 rounded-full shrink-0">your data</span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-mono text-[#3d3d3d]">Built-in dataset</span>
              <span className="text-[9px] font-mono text-[#a1a1a1] bg-[#f8f7f5] border border-[#e8e8e8] px-2 py-0.5 rounded-full shrink-0">
                Jan 2025 – Jun 2026
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCustomData && (
            <button
              onClick={() => { onClearCustomer(); setSelected(null); }}
              className="text-[10px] font-mono text-[#a1a1a1] hover:text-[#850b0b] cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Revert to built-in
            </button>
          )}
          <button
            onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold cursor-pointer border transition-all"
            style={
              showUpload
                ? { backgroundColor: "#2b5346", color: "white", borderColor: "#2b5346" }
                : { backgroundColor: "white", color: "#2b5346", borderColor: "#d0e8e2" }
            }
          >
            <Upload className="w-3 h-3" />
            {showUpload ? "Close" : "Upload newer data"}
            {showUpload ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* ── Upload panel ─────────────────────────────────────── */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-[#f5f5f3]">
            <p className="text-[11px] font-black text-[#0f0f0f]">Upload the Exportable Client List from Looker Studio</p>
            <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">
              Built-in data covers Jan 2025 – Jun 2026. Export a fresh Exportable Client List to extend the calendar to today.
            </p>
          </div>

          {/* Step-by-step instructions */}
          <div className="px-5 py-4 grid grid-cols-1 gap-3 sm:grid-cols-2 border-b border-[#f5f5f3]">
            {LOOKER_STEPS.map(s => (
              <div key={s.step} className="flex gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black font-mono text-white mt-0.5"
                  style={{ backgroundColor: "#2b5346" }}
                >
                  {s.step}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-[#1a1a1a]">{s.title}</p>
                  <p className="text-[10px] text-[#888] leading-relaxed mt-0.5">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div className="px-5 py-4 border-b border-[#f5f5f3]">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2.5 cursor-pointer transition-colors"
              style={
                isDragOver
                  ? { borderColor: "#2b5346", backgroundColor: "#eef4f1" }
                  : { borderColor: "#e5e5e5", backgroundColor: "#fafafa" }
              }
            >
              {isLoadingCustomer ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#2b5346] animate-spin" />
                  <span className="text-xs font-mono text-[#a1a1a1]">Parsing file…</span>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-[#eef4f1] flex items-center justify-center">
                    <Upload className="w-4 h-4 text-[#2b5346]" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-[#1a1a1a]">Drop CSV or XLSX here</p>
                    <p className="text-[9.5px] text-[#a1a1a1] font-mono mt-0.5">or click to browse</p>
                  </div>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </div>

          {/* Expected columns */}
          <div className="px-5 py-4">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-2.5">Expected columns</p>
            <div className="grid grid-cols-1 gap-0 divide-y divide-[#f5f5f3] border border-[#f0f0ee] rounded-xl overflow-hidden sm:grid-cols-2 sm:divide-y-0">
              {EXPECTED_COLS.map((col, i) => (
                <div
                  key={col.name}
                  className="flex items-baseline gap-2.5 px-3 py-2 bg-white"
                  style={{ borderBottom: i < EXPECTED_COLS.length - 1 ? "1px solid #f5f5f3" : "none" }}
                >
                  <span className="font-mono text-[10px] text-[#2b5346] font-semibold shrink-0 w-36">{col.name}</span>
                  <span className="text-[10px] text-[#a1a1a1] leading-snug">{col.note}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-mono text-[#c8c8c8] mt-2.5">Parsed client-side · no data leaves your browser</p>
          </div>
        </div>
      )}

      {/* ── Filters row ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] shrink-0">Province</span>
        {allProvs.map(p => (
          <button
            key={p}
            onClick={() => toggleProv(p)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-semibold cursor-pointer border transition-all"
            style={
              selProvs.has(p)
                ? { backgroundColor: provColor(p), color: "#fff", borderColor: provColor(p) }
                : { backgroundColor: "white", color: "#a1a1a1", borderColor: "#e5e5e5" }
            }
          >
            {p}
          </button>
        ))}
        {activeProvs !== null && (
          <button onClick={() => { setActiveProvs(null); setSelected(null); }}
            className="text-[10px] font-mono text-[#2b5346] hover:underline cursor-pointer">
            Show all
          </button>
        )}
        {isFilteredPaste && (
          <>
            <div className="w-px h-4 bg-[#e5e5e5] mx-1" />
            <button
              onClick={() => setPasteOnly(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-semibold cursor-pointer border transition-all"
              style={
                pasteOnly
                  ? { backgroundColor: "#2b5346", color: "white", borderColor: "#2b5346" }
                  : { backgroundColor: "white", color: "#3d3d3d", borderColor: "#e5e5e5" }
              }
            >
              Your events only
            </button>
          </>
        )}
      </div>

      {/* ── Heatmap matrix ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: Math.max(600, MONTH_SLOTS.length * 46 + 56) }}>
            <thead>
              {/* Year band */}
              <tr>
                <th className="border-b border-[#f0f0ee]" style={{ width: 52 }} />
                {yearSpans.map((span, si) => (
                  <th
                    key={span.year}
                    colSpan={span.count}
                    className={`text-center text-[8px] font-mono text-[#a1a1a1] py-1.5 border-b border-[#e8e8e8] tracking-widest ${si > 0 ? "border-l-2 border-l-[#d0d0d0]" : ""}`}
                  >
                    {span.year}
                  </th>
                ))}
              </tr>
              {/* Month names */}
              <tr className="bg-[#fafafa]">
                <th className="border-r border-b border-[#f0f0ee]" style={{ width: 52 }} />
                {MONTH_SLOTS.map((mk, i) => (
                  <th
                    key={mk}
                    className={`text-center text-[9px] font-mono text-[#888] font-semibold py-2 border-b border-[#f0f0ee] ${yearBounds.has(i) ? "border-l-2 border-l-[#d0d0d0]" : ""}`}
                    style={{ minWidth: 46 }}
                  >
                    {monthLabel(mk)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visProvs.map(prov => (
                <tr key={prov} className="group">
                  <td className="text-right pr-3 border-r border-b border-[#f0f0ee] text-[10px] font-mono font-bold"
                    style={{ color: provColor(prov) }}>
                    {prov}
                  </td>
                  {MONTH_SLOTS.map((mo, i) => {
                    const k = `${prov}||${mo}`;
                    const cell = matrix.get(k);
                    const sig = cell?.signups ?? 0;
                    const evCount = cell?.events.length ?? 0;
                    const style = heatStyle(sig, maxCellSignups);
                    const isSel = selected?.prov === prov && selected.month === mo;

                    return (
                      <td
                        key={mo}
                        onClick={() => sig > 0 && selectCell(prov, mo)}
                        className={`border-b border-[#f0f0ee] text-center relative transition-all select-none ${sig > 0 ? "cursor-pointer hover:brightness-95" : ""} ${yearBounds.has(i) ? "border-l-2 border-l-[#d0d0d0]" : ""}`}
                        style={{
                          backgroundColor: style.bg,
                          outline: isSel ? `2px solid ${provColor(prov)}` : "none",
                          outlineOffset: -2,
                        }}
                      >
                        <div className="py-2 px-0.5">
                          {sig > 0 ? (
                            <>
                              <p className="text-[11px] font-black font-mono leading-none" style={{ color: style.text }}>
                                {sig >= 1000 ? `${(sig / 1000).toFixed(1)}k` : sig}
                              </p>
                              {evCount > 0 && (
                                <p className="text-[7.5px] font-mono leading-none mt-0.5" style={{ color: style.subtext }}>
                                  {evCount === 1 ? "1 ev" : `${evCount} ev`}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-[10px] font-mono" style={{ color: style.text }}>—</p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-[#f8f7f5]">
                <td className="text-right pr-3 py-2.5 border-r border-[#f0f0ee] text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wide">
                  Total
                </td>
                {monthTotals.map((tot, i) => (
                  <td
                    key={MONTH_SLOTS[i]}
                    className={`text-center pb-1.5 pt-1 ${yearBounds.has(i) ? "border-l-2 border-l-[#d0d0d0]" : ""}`}
                  >
                    {tot > 0 && (
                      <div className="flex flex-col items-center gap-0.5">
                        <div
                          className="w-2 rounded-sm mx-auto"
                          style={{
                            height: Math.max(3, (tot / maxMonthTotal) * 22),
                            backgroundColor: "#2b5346",
                            opacity: 0.45,
                          }}
                        />
                        <p className="text-[8px] font-mono text-[#888]">
                          {tot >= 1000 ? `${(tot / 1000).toFixed(1)}k` : tot}
                        </p>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-2.5 border-t border-[#f5f5f3] flex items-center gap-3">
          <span className="text-[9px] font-mono text-[#c0c0c0] uppercase tracking-wider">Signups</span>
          <div className="flex items-center gap-0.5">
            {[0, 0.15, 0.3, 0.5, 0.7, 1.0].map((t, i) => (
              <div
                key={i}
                className="w-5 h-3 rounded-sm border border-[#f0f0f0]"
                style={{
                  backgroundColor: t === 0
                    ? "#f8f8f8"
                    : `rgb(${Math.round(255 - t * 212)},${Math.round(255 - t * 172)},${Math.round(255 - t * 185)})`,
                }}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono text-[#888]">Low → High</span>
        </div>
      </div>

      {/* ── Selected cell detail ─────────────────────────────── */}
      {selected && selectedEvents.length > 0 && (() => {
        const [sy, sm] = selected.month.split("-");
        const label = `${MONTH_ABBR[Number(sm) - 1]} ${sy} · ${selected.prov}`;
        const cellSignups = selectedEvents.reduce((s, e) => s + e.totalSignups, 0);
        const maxEv = Math.max(1, ...selectedEvents.map(e => e.totalSignups));
        const maxProv = Math.max(1, ...cellProvTotals.map(([, n]) => n));

        return (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
            <div
              className="px-5 py-4 border-b border-[#f5f5f3] flex items-center justify-between gap-4"
              style={{ borderLeft: `3px solid ${provColor(selected.prov)}` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-black text-[#0f0f0f]">{label}</span>
                <span className="text-[10px] font-mono text-[#a1a1a1]">
                  {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                {/* Province breakdown mini-bars */}
                <div className="hidden sm:flex items-end gap-1.5 h-7">
                  {cellProvTotals.map(([p, n]) => (
                    <div key={p} className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-3 rounded-sm"
                        style={{ height: Math.max(3, (n / maxProv) * 20), backgroundColor: provColor(p) }}
                      />
                      <span className="text-[7px] font-mono" style={{ color: provColor(p) }}>{p}</span>
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-[#2b5346]">{cellSignups.toLocaleString()}</span>
                  <span className="text-[9px] font-mono text-[#a1a1a1] ml-1">signups</span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[#c0c0c0] hover:text-[#888] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#f8f8f8]">
              {selectedEvents.map(event => {
                const enriched = reportByCode.get(event.code);
                const barPct = Math.max(3, (event.totalSignups / maxEv) * 100);
                const isPasted = isFilteredPaste && pastedSet.has(event.code);
                const color = enriched ? convGradeColor(enriched.calculatedConversion) : provColor(event.homeProvince);

                return (
                  <div
                    key={event.code}
                    className="px-5 py-3 flex items-center gap-4"
                    style={{ opacity: isFilteredPaste && !isPasted ? 0.45 : 1 }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isPasted && (
                        <span className="text-[7.5px] font-mono text-[#2b5346] bg-[#eef4f1] px-1.5 py-0.5 rounded font-semibold shrink-0">
                          yours
                        </span>
                      )}
                      <span className="font-mono font-black text-[11px] text-[#0f0f0f] truncate">{event.code}</span>
                      <span className="text-[9px] font-mono text-[#c0c0c0] shrink-0">{event.eventDateLabel}</span>
                    </div>

                    {enriched && (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-semibold font-mono"
                          style={{ color: convGradeColor(enriched.calculatedConversion) }}>
                          {enriched.calculatedConversion.toFixed(1)}%
                        </span>
                        {enriched["Avg LTV 12"] > 0 && (
                          <span className="text-[10px] font-mono text-[#888]">
                            ${enriched["Avg LTV 12"].toFixed(0)} LTV
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0 w-28">
                      <div className="flex-1 h-1.5 bg-[#f0f0ee] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.75 }} />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-[#3d3d3d] w-7 text-right">
                        {event.totalSignups}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!foundReports.length && (
              <div className="px-5 py-3 border-t border-[#f8f8f8]">
                <p className="text-[9px] font-mono text-[#c0c0c0]">
                  Upload your Looker performance dataset on the Overview tab to see conversion rates and LTV here.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Hint when nothing selected */}
      {!selected && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#c0c0c0]">
          <ChevronRight className="w-3 h-3" />
          Click any cell to see the events inside it.
        </div>
      )}

    </div>
  );
}
