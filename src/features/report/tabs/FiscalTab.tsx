import React, { useMemo, useState } from "react";
import {
  TrendingUp, Users, CalendarDays, Target, DollarSign,
  Award, Printer, AlertCircle, X, Copy, Check,
} from "lucide-react";
import { AnalyzedCodeReport, KPIReportSummary, AnalysisFlow } from "../../../types";
import { CustomerDataResult, EventStats } from "../../../hooks/useCustomerData";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface FiscalTabProps {
  foundReports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  customerData: CustomerDataResult;
  selectedFlow: AnalysisFlow;
  activeProvince?: string | null;
  onProvinceChange?: (p: string | null) => void;
}

// ── Formatting ──────────────────────────────────────────────────

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

function currency(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(decimals)}`;
}

function fmtBig(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function delta(curr: number, prev: number): { pct: number; up: boolean } | null {
  if (!prev) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct, up: curr >= prev };
}

// Fiscal year: Jul 1 → Jun 30, labeled by ending calendar year.
// e.g. Jul 2025 – Jun 2026 = FY2026
function fiscalYear(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const fyEnd = m >= 7 ? y + 1 : y;
  return `FY${fyEnd}`;
}

function fyRange(fy: string): string {
  const end = Number(fy.slice(2));
  return `Jul ${end - 1} – Jun ${end}`;
}

function fyComplete(fy: string): boolean {
  const end = Number(fy.slice(2));
  return new Date() > new Date(end, 5, 30); // after Jun 30 of ending year
}

// Count how many of the 12 FY months have at least 1 event in the data.
// Returns { covered, total: 12 }. ≥10 = "complete", <6 = "partial".
function fyCoverage(fy: string, months: Set<string>): { covered: number; total: 12 } {
  const end = Number(fy.slice(2));
  const start = end - 1;
  let covered = 0;
  for (let m = 7; m <= 12; m++) {
    if (months.has(`${start}-${String(m).padStart(2, "0")}`)) covered++;
  }
  for (let m = 1; m <= 6; m++) {
    if (months.has(`${end}-${String(m).padStart(2, "0")}`)) covered++;
  }
  return { covered, total: 12 };
}

function fyStatus(fy: string, covered: number): "full" | "partial" | "none" {
  if (covered >= 10) return "full";
  if (covered >= 1)  return "partial";
  return "none";
}

// ── Sub-components ──────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  note?: string;
  accent?: string;
  icon: React.ReactNode;
  large?: boolean;
}

function KpiCard({ label, value, sub, note, accent, icon, large }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#e8e8e8] px-5 py-4 flex flex-col justify-between gap-2 shadow-sm"
      style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[8.5px] font-mono uppercase tracking-[0.18em] text-[#a1a1a1] leading-snug">{label}</p>
        <span style={{ color: accent ?? "#d8d8d8", opacity: 0.7, flexShrink: 0 }}>{icon}</span>
      </div>
      <div>
        <p className={`font-black text-[#0f0f0f] leading-none font-mono ${large ? "text-[38px]" : "text-[28px]"}`}>{value}</p>
        {sub  && <p className="text-[10px] font-mono text-[#888] mt-1">{sub}</p>}
        {note && <p className="text-[9px] font-mono text-[#b8b8b8] mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

interface SectionProps { title: string; sub?: string; children: React.ReactNode }
function Section({ title, sub, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <h3 className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">{title}</h3>
        {sub && <span className="text-[9px] font-mono text-[#c0c0c0]">{sub}</span>}
        <div className="flex-1 h-px bg-[#f0f0ee] self-center" />
      </div>
      {children}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function FiscalTab({ foundReports, summary, customerData, selectedFlow, activeProvince, onProvinceChange }: FiscalTabProps): React.ReactElement {
  const { eventStats } = customerData;
  const hasLookerData = foundReports.length > 0;
  const [eventModal, setEventModal] = useState<{ fy: string; prov: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalSort, setModalSort] = useState<{ by: "code" | "month" | "signups"; dir: "asc" | "desc" }>({ by: "month", dir: "asc" });
  const [modalProvFilter, setModalProvFilter] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState("");

  function openModal(fy: string, prov: string | null) {
    setEventModal({ fy, prov });
    setModalSort({ by: "month", dir: "asc" });
    setModalProvFilter(null);
    setModalSearch("");
    setCopied(false);
  }

  function toggleSort(col: "code" | "month" | "signups") {
    setModalSort(prev => ({
      by: col,
      dir: prev.by === col && prev.dir === "asc" ? "desc" : "asc",
    }));
  }

  const now = new Date();
  const nowMk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentFY = fiscalYear(nowMk);
  // YTD is only meaningful if we haven't reached the FY's last month (June of the ending year)
  const fyEndMk = `${Number(currentFY.slice(2))}-06`;
  const showYTD = nowMk < fyEndMk;

  // ── Event volume from static/uploaded CSV — grouped by fiscal year ──

  const volume = useMemo(() => {
    const byYear: Record<string, { events: number; signups: number }> = {};
    const eventListByFY: Record<string, EventStats[]> = {};
    const eventsByProv: Record<string, number> = {};
    const signupsByProv: Record<string, number> = {};
    const eventsByProvByFY: Record<string, Record<string, number>> = {};
    const eventListByProvByFY: Record<string, Record<string, EventStats[]>> = {};
    const signupsByProvByFY: Record<string, Record<string, number>> = {};
    const eventsByProvYTD: Record<string, number> = {};
    const signupsByProvYTD: Record<string, number> = {};
    const ytdSignupsByFY: Record<string, number> = {};
    const eventMonths = new Set<string>();

    // FY month position: Jul=1, Aug=2, ..., Jun=12
    const nowFYPos = (() => {
      const m = Number(nowMk.slice(5, 7));
      return m >= 7 ? m - 6 : m + 6;
    })();

    for (const e of eventStats) {
      if (!e.eventMonth) continue;
      eventMonths.add(e.eventMonth);
      const yr = fiscalYear(e.eventMonth);
      if (!byYear[yr]) byYear[yr] = { events: 0, signups: 0 };
      byYear[yr].events++;
      byYear[yr].signups += e.totalSignups;
      if (!eventListByFY[yr]) eventListByFY[yr] = [];
      eventListByFY[yr].push(e);

      // YTD: include this event if its FY-month position ≤ today's FY-month position
      const eM = Number(e.eventMonth.slice(5, 7));
      const eFYPos = eM >= 7 ? eM - 6 : eM + 6;
      if (eFYPos <= nowFYPos) {
        ytdSignupsByFY[yr] = (ytdSignupsByFY[yr] ?? 0) + e.totalSignups;
      }

      if (e.homeProvince && e.homeProvince !== "??") {
        eventsByProv[e.homeProvince] = (eventsByProv[e.homeProvince] ?? 0) + 1;
        if (!eventsByProvByFY[yr]) eventsByProvByFY[yr] = {};
        eventsByProvByFY[yr][e.homeProvince] = (eventsByProvByFY[yr][e.homeProvince] ?? 0) + 1;
        if (!eventListByProvByFY[yr]) eventListByProvByFY[yr] = {};
        if (!eventListByProvByFY[yr][e.homeProvince]) eventListByProvByFY[yr][e.homeProvince] = [];
        eventListByProvByFY[yr][e.homeProvince].push(e);
        if (yr === currentFY && e.eventMonth <= nowMk) {
          eventsByProvYTD[e.homeProvince] = (eventsByProvYTD[e.homeProvince] ?? 0) + 1;
        }
      }
      for (const [prov, count] of Object.entries(e.signupsByProvince)) {
        if (!prov || prov === "??") continue;
        signupsByProv[prov] = (signupsByProv[prov] ?? 0) + count;
        if (!signupsByProvByFY[yr]) signupsByProvByFY[yr] = {};
        signupsByProvByFY[yr][prov] = (signupsByProvByFY[yr][prov] ?? 0) + count;
        if (yr === currentFY && e.eventMonth <= nowMk) {
          signupsByProvYTD[prov] = (signupsByProvYTD[prov] ?? 0) + count;
        }
      }
    }

    const years = Object.keys(byYear).sort();
    const latestYear = years[years.length - 1] ?? currentFY;
    const prevYear = years.length >= 2 ? years[years.length - 2] : null;
    const totalEvents = eventStats.length;
    const totalSignups = eventStats.reduce((s, e) => s + e.totalSignups, 0);

    // Coverage per FY: how many of the 12 months have event data
    const coverage: Record<string, { covered: number; total: 12; status: "full" | "partial" | "none" }> = {};
    for (const fy of years) {
      const c = fyCoverage(fy, eventMonths);
      coverage[fy] = { ...c, status: fyStatus(fy, c.covered) };
    }

    // Next fiscal year after the latest one in the data
    const latestEnd = Number(latestYear.slice(2));
    const nextFY = `FY${latestEnd + 1}`;
    const nextFYStart = `Jul 1, ${latestEnd}`;

    return {
      byYear, eventsByProv, signupsByProv,
      eventsByProvByFY, eventListByProvByFY, signupsByProvByFY,
      eventsByProvYTD, signupsByProvYTD,
      years, latestYear, prevYear, totalEvents, totalSignups, coverage, nextFY, nextFYStart,
      eventListByFY,
      ytdSignupsByFY,
    };
  }, [eventStats]);

  // ── Financial metrics from foundReports ───────────────────────

  const financials = useMemo(() => {
    if (!hasLookerData) return null;
    const totalSignups     = summary.totalSignups;
    const totalPaying      = summary.totalPayingCustomers;
    const blendedConv      = summary.blendedConversionRate;
    const totalLTV12       = summary.totalLTV12;
    const avgLTV12         = summary.averageLTV12;
    const avgConv          = summary.averageConversionRate;

    const hasCost = foundReports.some(r => (r["Total Spend"] ?? 0) > 0);
    const totalSpend    = foundReports.reduce((s, r) => s + (r["Total Spend"]  ?? 0), 0);
    const eventSpend    = foundReports.reduce((s, r) => s + (r["Event Spend"]  ?? 0), 0);
    const staffSpend    = foundReports.reduce((s, r) => s + (r["Staff Spend"]  ?? 0), 0);
    const cpaSignup     = hasCost && totalSignups  > 0 ? totalSpend / totalSignups  : null;
    const cpaPaying     = hasCost && totalPaying   > 0 ? totalSpend / totalPaying   : null;
    const revToSpend    = hasCost && totalSpend    > 0 ? totalLTV12  / totalSpend   : null;

    // Top performers
    const byConv = [...foundReports].sort((a, b) => b.calculatedConversion - a.calculatedConversion);
    const bySignups = [...foundReports].sort((a, b) => b.Signups - a.Signups);
    const byLTV = [...foundReports].filter(r => r["Avg LTV 12"] > 0).sort((a, b) => b["Avg LTV 12"] - a["Avg LTV 12"]);

    // Province breakdown from foundReports (split compound province strings)
    const provMap: Record<string, { paying: number; ltv12: number; spend: number; codes: number }> = {};
    for (const r of foundReports) {
      const provs = (r.Province ?? "ON").split("+").map(p => p.trim()).filter(Boolean);
      const div = provs.length;
      for (const prov of provs) {
        if (!provMap[prov]) provMap[prov] = { paying: 0, ltv12: 0, spend: 0, codes: 0 };
        provMap[prov].paying += Math.round(r["Paying cx"] / div);
        provMap[prov].ltv12  += r["Sum LTV 12"] / div;
        provMap[prov].spend  += (r["Total Spend"] ?? 0) / div;
        provMap[prov].codes  += 1 / div;
      }
    }

    return {
      totalSignups, totalPaying, blendedConv, totalLTV12, avgLTV12, avgConv,
      hasCost, totalSpend, eventSpend, staffSpend,
      cpaSignup, cpaPaying, revToSpend,
      topConv: byConv.slice(0, 3),
      topSignups: bySignups.slice(0, 3),
      topLTV: byLTV.slice(0, 3),
      provMap,
    };
  }, [foundReports, summary, hasLookerData]);

  // ── All provinces seen across both data sources ───────────────

  const allProvs = useMemo(() => {
    const s = new Set([
      ...Object.keys(volume.eventsByProv),
      ...(financials ? Object.keys(financials.provMap) : []),
    ]);
    return Array.from(s).sort((a, b) => {
      const aTotal = (volume.signupsByProv[a] ?? 0);
      const bTotal = (volume.signupsByProv[b] ?? 0);
      return bTotal - aTotal;
    });
  }, [volume, financials]);

  // ── Modal data memos ──────────────────────────────────────────

  const rawModalEvents = useMemo(() => {
    if (!eventModal) return [];
    if (eventModal.prov === null) return volume.eventListByFY[eventModal.fy] ?? [];
    return volume.eventListByProvByFY[eventModal.fy]?.[eventModal.prov] ?? [];
  }, [eventModal, volume]);

  const modalAvailableProvs = useMemo(
    () =>
      Array.from(
        new Set(rawModalEvents.map(e => e.homeProvince).filter((p): p is string => Boolean(p) && p !== "??"))
      ).sort(),
    [rawModalEvents]
  );

  const filteredModalEvents = useMemo(() => {
    let list = rawModalEvents;
    if (modalSearch.trim()) {
      const q = modalSearch.trim().toLowerCase();
      list = list.filter(e => e.code.toLowerCase().includes(q));
    }
    if (modalProvFilter) {
      list = list.filter(e => e.homeProvince === modalProvFilter);
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (modalSort.by === "code")    cmp = a.code.localeCompare(b.code);
      if (modalSort.by === "month")   cmp = a.eventMonth.localeCompare(b.eventMonth);
      if (modalSort.by === "signups") cmp = a.totalSignups - b.totalSignups;
      return modalSort.dir === "asc" ? cmp : -cmp;
    });
  }, [rawModalEvents, modalSearch, modalProvFilter, modalSort]);

  // ── Date range label ──────────────────────────────────────────

  const dateRangeLabel = useMemo(() => {
    const months = eventStats.map(e => e.eventMonth).filter(Boolean);
    if (!months.length) return "All Events";
    const min = months.reduce((a, b) => a < b ? a : b);
    const max = months.reduce((a, b) => a > b ? a : b);
    const ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const fmt = (mk: string) => `${ABBR[Number(mk.slice(5)) - 1]} ${mk.slice(0, 4)}`;
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }, [eventStats]);

  if (!eventStats.length && !hasLookerData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <p className="text-sm text-[#a1a1a1] font-mono">No data loaded. Upload your Looker dataset or navigate to the Calendar tab to load event data.</p>
      </div>
    );
  }

  return (
    <React.Fragment>
    <div className="px-5 py-7 max-w-6xl mx-auto flex flex-col gap-8 w-full">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#a1a1a1] mb-1">Business Development · Fiscal Year Jul 1 – Jun 30</p>
          <h2 className="text-[24px] font-black text-[#0f0f0f]">Fiscal Summary</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-[11px] font-mono text-[#a1a1a1]">{dateRangeLabel}</p>
            <span className="text-[9px] font-mono text-[#c0c0c0]">·</span>
            <span className="text-[9px] font-mono text-[#a1a1a1] bg-[#f8f7f5] border border-[#e8e8e8] px-2 py-0.5 rounded-full">
              {customerData.eventStats.length > 0 && customerData.eventStats.some(e => !/^EV/i.test(e.code))
                ? "EV-prefix + BusinessDevelopment channel"
                : "EV-prefix codes only"}
            </span>
          </div>
          {/* Next fiscal year starts banner */}
          {volume.nextFYStart && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-[#f0f0ee] max-w-12" />
              <span className="text-[9px] font-mono text-[#a1a1a1] bg-[#f8f7f5] border border-[#e8e8e8] px-2.5 py-1 rounded-full">
                {volume.nextFY} begins {volume.nextFYStart}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!hasLookerData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffbeb] border border-[#f5e09a] rounded-lg">
              <AlertCircle className="w-3 h-3 text-[#c9a000]" />
              <span className="text-[9.5px] font-mono text-[#c9a000]">Upload Looker data for financial metrics</span>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e5] text-[10px] font-semibold text-[#888] hover:text-[#1a1a1a] cursor-pointer bg-white shadow-sm"
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        </div>
      </div>

      {/* ── Section 1: Volume KPIs ────────────────────────────────── */}
      <Section title="Event Volume" sub="from event signup data">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Unique Event Codes"
            value={volume.totalEvents.toLocaleString()}
            sub={`${volume.years.length} fiscal year${volume.years.length !== 1 ? "s" : ""} · signup data`}
            note={hasLookerData && foundReports.length !== volume.totalEvents
              ? `${foundReports.length} of ${volume.totalEvents} have Looker data`
              : undefined}
            accent="#2b5346"
            icon={<CalendarDays className="w-4 h-4" />}
            large
          />
          {volume.years.map(yr => {
            const yd = volume.byYear[yr];
            const isLatest = yr === volume.latestYear;
            const isCurrent = yr === currentFY;
            const complete = fyComplete(yr);
            const cov = volume.coverage[yr];
            const isPartial = cov?.status === "partial";
            return (
              <KpiCard
                key={yr}
                label={`${yr}${isCurrent && !complete ? " · In Progress" : complete ? " · Complete" : ""}`}
                value={fmtBig(yd.signups)}
                sub={`${yd.events} event codes · ${fyRange(yr)}`}
                note={(() => {
                  if (isPartial) return `Partial data — ${cov.covered}/12 months in dataset`;
                  if (!volume.prevYear || yr !== volume.latestYear) return undefined;
                  const d = delta(yd.signups, volume.byYear[volume.prevYear]?.signups ?? 0);
                  if (!d) return undefined;
                  return `${d.up ? "↑" : "↓"}${Math.abs(d.pct)}% vs ${volume.prevYear}`;
                })()}
                accent={isCurrent ? "#2b5346" : isPartial ? "#c9a000" : complete ? "#6d9c8a" : "#d0d0d0"}
                icon={<TrendingUp className="w-4 h-4" />}
              />
            );
          })}
        </div>
      </Section>

      {/* ── Section 2: Financial KPIs ────────────────────────────── */}
      {financials && (
        <Section title="Financial Performance" sub={`${financials.totalSignups.toLocaleString()} signups tracked in Looker`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Paying Customers"
              value={fmtBig(financials.totalPaying)}
              sub={`of ${fmtBig(financials.totalSignups)} signups`}
              accent="#2b5346"
              icon={<Users className="w-4 h-4" />}
              large
            />
            <KpiCard
              label="Blended Conversion"
              value={`${financials.blendedConv.toFixed(1)}%`}
              sub={`avg code conv. ${financials.avgConv.toFixed(1)}%`}
              accent={financials.blendedConv >= 35 ? "#2b5346" : financials.blendedConv >= 25 ? "#c9a000" : "#9b4a1c"}
              icon={<Target className="w-4 h-4" />}
              large
            />
            <KpiCard
              label="12-mo Revenue (LTV)"
              value={currency(financials.totalLTV12)}
              sub="estimated 12-month value"
              accent="#2b5346"
              icon={<DollarSign className="w-4 h-4" />}
              large
            />
            <KpiCard
              label="Avg LTV / Customer"
              value={currency(financials.avgLTV12)}
              sub="12-month avg"
              accent="#4d8970"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KpiCard
              label="Looker Codes"
              value={financials.totalSignups > 0 ? String(foundReports.length) : "—"}
              sub={selectedFlow === "paste" ? "your pasted codes" : "full dataset"}
              note={volume.totalEvents > 0 && volume.totalEvents !== foundReports.length
                ? `${volume.totalEvents} unique codes in signups`
                : undefined}
              accent="#d0d0d0"
              icon={<Award className="w-4 h-4" />}
            />
          </div>
        </Section>
      )}

      {/* ── Section 3: Cost & ROI ─────────────────────────────────── */}
      {financials?.hasCost && (
        <Section title="Investment & Return" sub="from event cost data">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Total Investment"
              value={currency(financials.totalSpend)}
              sub={[
                financials.eventSpend > 0 ? `Event: ${currency(financials.eventSpend)}` : "",
                financials.staffSpend > 0 ? `Staff: ${currency(financials.staffSpend)}` : "",
              ].filter(Boolean).join("  ·  ") || undefined}
              accent="#c9a000"
              icon={<DollarSign className="w-4 h-4" />}
              large
            />
            <KpiCard
              label="Cost / Signup"
              value={currency(financials.cpaSignup ?? 0, 2)}
              sub="total spend ÷ signups"
              accent="#c9a000"
              icon={<Target className="w-4 h-4" />}
            />
            <KpiCard
              label="Cost / Paying Customer"
              value={currency(financials.cpaPaying ?? 0, 2)}
              sub="total spend ÷ paying cx"
              accent="#c9a000"
              icon={<Users className="w-4 h-4" />}
            />
            <KpiCard
              label="Revenue / Investment"
              value={financials.revToSpend ? `${financials.revToSpend.toFixed(1)}×` : "—"}
              sub="LTV12 return on spend"
              accent={financials.revToSpend && financials.revToSpend >= 5 ? "#2b5346" : "#c9a000"}
              icon={<TrendingUp className="w-4 h-4" />}
              large
            />
          </div>
        </Section>
      )}

      {/* ── Section 4: Fiscal Year over Year ─────────────────────── */}
      {volume.years.length >= 2 && (
        <Section title="Fiscal Year over Year" sub="Jul 1 – Jun 30">
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#f0f0ee] bg-[#fafafa]">
                  <th className="text-left px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Metric</th>
                  {volume.years.map(yr => {
                    const complete = fyComplete(yr);
                    const isCurrent = yr === currentFY;
                    const cov = volume.coverage[yr];
                    const isPartial = cov?.status === "partial";
                    return (
                      <th key={yr} className="text-right px-5 py-3">
                        <div className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">{yr}</div>
                        <div className="text-[8px] font-mono text-[#c0c0c0] mt-0.5">{fyRange(yr)}</div>
                        {!complete && isCurrent && (
                          <div className="text-[7.5px] font-mono text-[#c9a000] mt-0.5">in progress</div>
                        )}
                        {isPartial && (
                          <div className="text-[7.5px] font-mono text-[#c9a000] mt-0.5">{cov.covered}/12 months</div>
                        )}
                      </th>
                    );
                  })}
                  <th className="text-right px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Δ YoY</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Event Codes",
                    values: volume.years.map(yr => volume.byYear[yr]?.events ?? 0),
                    fmt: (n: number) => n.toLocaleString(),
                  },
                  {
                    label: "Signups",
                    values: volume.years.map(yr => volume.byYear[yr]?.signups ?? 0),
                    fmt: (n: number) => fmtBig(n),
                  },
                ].map((row, ri) => {
                  const vals = row.values;
                  const prev = vals[vals.length - 2] ?? null;
                  const curr = vals[vals.length - 1] ?? null;
                  const d = prev !== null && curr !== null && prev > 0 ? delta(curr, prev) : null;
                  return (
                    <tr key={row.label} className={`border-b border-[#f8f8f8] ${ri % 2 === 0 ? "" : "bg-[#fafafa]"}`}>
                      <td className="px-5 py-3 text-[11px] font-semibold text-[#3d3d3d]">{row.label}</td>
                      {volume.years.map((yr, yi) => {
                        const val = vals[yi];
                        const isLatest = yi === volume.years.length - 1;
                        return (
                          <td key={yr} className="text-right px-5 py-3">
                            {val !== null ? (
                              <span className={`text-[12px] font-black font-mono ${isLatest ? "text-[#0f0f0f]" : "text-[#999]"}`}>
                                {row.fmt(val)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-[#c0c0c0]">
                                {"raw" in row && row.raw ? row.fmt(row.raw[0]) : "—"}
                                {"note" in row && row.note && <><br /><span className="text-[8.5px] text-[#d0d0d0]">{row.note}</span></>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-right px-5 py-3">
                        {d ? (
                          <span
                            className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: d.up ? "#eef4f1" : "#fff0f0", color: d.up ? "#2b5346" : "#850b0b" }}
                          >
                            {d.up ? "↑" : "↓"}{Math.abs(d.pct)}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#d0d0d0]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* YTD same-period comparison row — only when current FY is in the data and not yet complete */}
                {showYTD && volume.latestYear === currentFY && (() => {
                  const vals = volume.years.map(yr => volume.ytdSignupsByFY[yr] ?? 0);
                  const prev = vals.length >= 2 ? vals[vals.length - 2] : null;
                  const curr = vals[vals.length - 1] ?? null;
                  const d = prev !== null && curr !== null && prev > 0 ? delta(curr, prev) : null;
                  const ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  const nowMonthLabel = `${ABBR[Number(nowMk.slice(5, 7)) - 1]} ${nowMk.slice(0, 4)}`;
                  return (
                    <tr className="border-b border-[#f8f8f8] bg-[#eef4f1]/40">
                      <td className="px-5 py-3 text-[11px] font-semibold text-[#3d3d3d]">
                        YTD{" "}
                        <span className="text-[9px] font-mono text-[#a1a1a1] font-normal">through {nowMonthLabel}</span>
                      </td>
                      {volume.years.map((yr, yi) => {
                        const val = vals[yi];
                        const isLatest = yi === volume.years.length - 1;
                        return (
                          <td key={yr} className="text-right px-5 py-3">
                            <span className={`text-[12px] font-black font-mono ${isLatest ? "text-[#0f0f0f]" : "text-[#999]"}`}>
                              {fmtBig(val)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-right px-5 py-3">
                        {d ? (
                          <span
                            className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: d.up ? "#eef4f1" : "#fff0f0", color: d.up ? "#2b5346" : "#850b0b" }}
                          >
                            {d.up ? "↑" : "↓"}{Math.abs(d.pct)}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#d0d0d0]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
            {financials && (
              <div className="px-5 py-2.5 border-t border-[#f5f5f3] flex items-center gap-2">
                <span className="text-[8.5px] font-mono text-[#c0c0c0]">Financial metrics (paying, conversion, revenue) are all-time totals — Looker export is not segmented by fiscal year.</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Section 5: Province Breakdown ────────────────────────── */}
      {allProvs.length > 0 && (
        <Section title="By Province">
          <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                {/* FY group headers */}
                <tr className="border-b border-[#f0f0ee] bg-[#fafafa]">
                  <th className="text-left px-5 py-2 text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]" rowSpan={2}>Province</th>
                  {volume.years.map(fy => (
                    <th key={fy} colSpan={2} className="text-center px-2 py-2 text-[9px] font-mono font-bold border-l border-[#f0f0ee]"
                      style={{ color: volume.coverage[fy]?.status === "partial" ? "#c9a000" : "#2b5346" }}>
                      {fy}
                      {volume.coverage[fy]?.status === "partial" && (
                        <span className="ml-1 text-[8px] font-normal text-[#c9a000]">partial</span>
                      )}
                    </th>
                  ))}
                  {showYTD && volume.years.includes(currentFY) && (
                    <th colSpan={2} className="text-center px-2 py-2 text-[9px] font-mono font-bold border-l border-[#f0f0ee] text-[#2b5346]">
                      YTD
                      <span className="ml-1 text-[8px] font-normal text-[#a1a1a1]">thru {nowMk.slice(0,4)}-{nowMk.slice(5)}</span>
                    </th>
                  )}
                  {financials && <th colSpan={3} className="text-center px-2 py-2 text-[9px] font-mono font-bold border-l border-[#f0f0ee] text-[#888]">Looker</th>}
                  {financials?.hasCost && <th className="text-center px-2 py-2 text-[9px] font-mono text-[#a1a1a1] border-l border-[#f0f0ee]">Spend</th>}
                </tr>
                <tr className="border-b border-[#f0f0ee] bg-[#fafafa]">
                  {volume.years.map(fy => (
                    <React.Fragment key={fy}>
                      <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1] border-l border-[#f0f0ee]">Events</th>
                      <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1]">Sig</th>
                    </React.Fragment>
                  ))}
                  {showYTD && volume.years.includes(currentFY) && (
                    <React.Fragment>
                      <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1] border-l border-[#f0f0ee]">Events</th>
                      <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1]">Sig</th>
                    </React.Fragment>
                  )}
                  {financials && (
                    <React.Fragment>
                      <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1] border-l border-[#f0f0ee]">Pay</th>
                      <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1]">Conv</th>
                      <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1]">Rev</th>
                    </React.Fragment>
                  )}
                  {financials?.hasCost && (
                    <th className="text-right px-3 py-1.5 text-[8px] font-mono text-[#a1a1a1] border-l border-[#f0f0ee]">$</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {allProvs.map((prov, ri) => {
                  const totalSig = volume.signupsByProv[prov] ?? 0;
                  const fin = financials?.provMap[prov];
                  const convPct = fin && totalSig > 0 ? (fin.paying / totalSig) * 100 : null;
                  const maxSig = Math.max(1, ...allProvs.map(p => volume.signupsByProv[p] ?? 0));
                  return (
                    <tr key={prov} className={`border-b border-[#f8f8f8] ${ri % 2 === 1 ? "bg-[#fafafa]" : ""}`}
                      style={prov === activeProvince ? { borderLeft: `3px solid ${provColor(prov)}` } : undefined}>
                      <td
                        className="px-5 py-2.5 cursor-pointer"
                        onClick={() => onProvinceChange?.(prov === activeProvince ? null : prov)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black font-mono" style={{ color: provColor(prov) }}>{prov}</span>
                          <div className="flex-1 max-w-16 h-1 bg-[#f0f0ee] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(totalSig / maxSig) * 100}%`, backgroundColor: provColor(prov), opacity: 0.5 }} />
                          </div>
                        </div>
                      </td>
                      {volume.years.map(fy => {
                        const ev  = volume.eventsByProvByFY[fy]?.[prov] ?? 0;
                        const sig = volume.signupsByProvByFY[fy]?.[prov] ?? 0;
                        return (
                          <React.Fragment key={fy}>
                            <td
                              className={`text-right px-3 py-2.5 font-mono text-[10px] border-l border-[#f8f8f8] ${ev > 0 ? "text-[#2b5346] font-bold underline decoration-dotted cursor-pointer hover:text-[#1a3d2f]" : "text-[#888]"}`}
                              onClick={() => ev > 0 && openModal(fy, prov)}
                              title={ev > 0 ? `See ${ev} events for ${prov} in ${fy}` : undefined}
                            >
                              {ev > 0 ? ev : "—"}
                            </td>
                            <td className="text-right px-3 py-2.5 font-mono text-[11px] font-semibold text-[#0f0f0f]">{sig > 0 ? sig.toLocaleString() : "—"}</td>
                          </React.Fragment>
                        );
                      })}
                      {showYTD && volume.years.includes(currentFY) && (
                        <React.Fragment>
                          <td className="text-right px-3 py-2.5 font-mono text-[10px] text-[#888] border-l border-[#f8f8f8]">
                            {(volume.eventsByProvYTD[prov] ?? 0) > 0 ? volume.eventsByProvYTD[prov] : "—"}
                          </td>
                          <td className="text-right px-3 py-2.5 font-mono text-[11px] font-bold text-[#2b5346]">
                            {(volume.signupsByProvYTD[prov] ?? 0) > 0 ? (volume.signupsByProvYTD[prov] ?? 0).toLocaleString() : "—"}
                          </td>
                        </React.Fragment>
                      )}
                      {financials && (
                        <React.Fragment>
                          <td className="text-right px-3 py-2.5 font-mono text-[10px] text-[#3d3d3d] border-l border-[#f8f8f8]">{fin ? fin.paying.toLocaleString() : "—"}</td>
                          <td className="text-right px-3 py-2.5">
                            {convPct !== null ? (
                              <span className="text-[10px] font-semibold font-mono"
                                style={{ color: convPct >= 35 ? "#2b5346" : convPct >= 25 ? "#c9a000" : "#9b4a1c" }}>
                                {convPct.toFixed(1)}%
                              </span>
                            ) : <span className="text-[#d0d0d0] font-mono text-[10px]">—</span>}
                          </td>
                          <td className="text-right px-3 py-2.5 font-mono text-[10px] text-[#2b5346] font-bold">{fin ? currency(fin.ltv12) : "—"}</td>
                        </React.Fragment>
                      )}
                      {financials?.hasCost && (
                        <td className="text-right px-3 py-2.5 font-mono text-[10px] text-[#c9a000] border-l border-[#f8f8f8]">
                          {fin && fin.spend > 0 ? currency(fin.spend) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-[#f8f7f5] border-t-2 border-[#e8e8e8]">
                  <td className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Total</td>
                  {volume.years.map(fy => {
                    const fyData = volume.byYear[fy];
                    return (
                      <React.Fragment key={fy}>
                        <td
                          className={`text-right px-3 py-3 font-mono text-[10px] font-bold border-l border-[#e8e8e8] ${
                            (fyData?.events ?? 0) > 0
                              ? "text-[#2b5346] underline decoration-dotted cursor-pointer hover:text-[#1a3d2f]"
                              : "text-[#0f0f0f]"
                          }`}
                          onClick={() => (fyData?.events ?? 0) > 0 && openModal(fy, null)}
                          title={(fyData?.events ?? 0) > 0 ? `See all ${fyData?.events} events in ${fy}` : undefined}
                        >
                          {fyData?.events ?? 0}
                        </td>
                        <td className="text-right px-3 py-3 font-mono text-[11px] font-black text-[#0f0f0f]">{(fyData?.signups ?? 0).toLocaleString()}</td>
                      </React.Fragment>
                    );
                  })}
                  {showYTD && volume.years.includes(currentFY) && (
                    <React.Fragment>
                      <td className="text-right px-3 py-3 font-mono text-[10px] font-bold text-[#0f0f0f] border-l border-[#e8e8e8]">
                        {Object.values(volume.eventsByProvYTD).reduce((s, n) => s + n, 0) || "—"}
                      </td>
                      <td className="text-right px-3 py-3 font-mono text-[11px] font-black text-[#2b5346]">
                        {Object.values(volume.signupsByProvYTD).reduce((s, n) => s + n, 0).toLocaleString()}
                      </td>
                    </React.Fragment>
                  )}
                  {financials && (
                    <React.Fragment>
                      <td className="text-right px-3 py-3 font-mono text-[11px] font-black text-[#0f0f0f] border-l border-[#e8e8e8]">{financials.totalPaying.toLocaleString()}</td>
                      <td className="text-right px-3 py-3">
                        <span className="text-[11px] font-black font-mono"
                          style={{ color: financials.blendedConv >= 35 ? "#2b5346" : financials.blendedConv >= 25 ? "#c9a000" : "#9b4a1c" }}>
                          {financials.blendedConv.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right px-3 py-3 font-mono text-[12px] font-black text-[#2b5346]">{currency(financials.totalLTV12)}</td>
                    </React.Fragment>
                  )}
                  {financials?.hasCost && <td className="text-right px-3 py-3 font-mono text-[12px] font-black text-[#c9a000] border-l border-[#e8e8e8]">{currency(financials.totalSpend)}</td>}
                </tr>
              </tbody>
            </table>
            {financials && (
              <p className="px-5 py-2 text-[8.5px] font-mono text-[#c0c0c0] border-t border-[#f5f5f3]">
                Province-level paying/LTV is approximate — multi-province codes are split proportionally.
              </p>
            )}
          </div>
        </Section>
      )}

      {/* ── Section 6: Top Performers ────────────────────────────── */}
      {financials && (
        <Section title="Top Performers" sub="from Looker data">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Best Conversion */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f5f5f3] flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-[#2b5346]" />
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Best Conversion</p>
              </div>
              <div className="divide-y divide-[#f8f8f8]">
                {financials.topConv.map((r, i) => (
                  <div key={r.discount_code} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-mono text-[#d0d0d0] shrink-0">{i + 1}</span>
                      <span className="font-mono font-black text-[10.5px] text-[#0f0f0f] truncate">{r.discount_code}</span>
                      <span className="text-[8.5px] font-mono shrink-0" style={{ color: provColor((r.Province ?? "ON").split("+")[0].trim()) }}>
                        {(r.Province ?? "ON").split("+")[0].trim()}
                      </span>
                    </div>
                    <span className="text-[12px] font-black font-mono shrink-0" style={{ color: "#2b5346" }}>
                      {r.calculatedConversion.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Signups */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f5f5f3] flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[#4d8970]" />
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Most Signups</p>
              </div>
              <div className="divide-y divide-[#f8f8f8]">
                {financials.topSignups.map((r, i) => (
                  <div key={r.discount_code} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-mono text-[#d0d0d0] shrink-0">{i + 1}</span>
                      <span className="font-mono font-black text-[10.5px] text-[#0f0f0f] truncate">{r.discount_code}</span>
                      <span className="text-[8.5px] font-mono shrink-0" style={{ color: provColor((r.Province ?? "ON").split("+")[0].trim()) }}>
                        {(r.Province ?? "ON").split("+")[0].trim()}
                      </span>
                    </div>
                    <span className="text-[12px] font-black font-mono shrink-0 text-[#1a1a1a]">
                      {r.Signups.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best LTV */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f5f5f3] flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-[#2b5346]" />
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Best LTV (12-mo avg)</p>
              </div>
              <div className="divide-y divide-[#f8f8f8]">
                {financials.topLTV.map((r, i) => (
                  <div key={r.discount_code} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-mono text-[#d0d0d0] shrink-0">{i + 1}</span>
                      <span className="font-mono font-black text-[10.5px] text-[#0f0f0f] truncate">{r.discount_code}</span>
                      <span className="text-[8.5px] font-mono shrink-0" style={{ color: provColor((r.Province ?? "ON").split("+")[0].trim()) }}>
                        {(r.Province ?? "ON").split("+")[0].trim()}
                      </span>
                    </div>
                    <span className="text-[12px] font-black font-mono shrink-0 text-[#2b5346]">
                      {currency(r["Avg LTV 12"])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Footer note */}
      <p className="text-[9px] font-mono text-[#c0c0c0] text-center pb-2">
        All analysis client-side · Revenue figures are estimated 12-month LTV projections, not realized revenue
      </p>

    </div>

    {/* ── Event list modal ──────────────────────────────────────── */}
    {eventModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={() => setEventModal(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#f0f0ee] flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">
                {eventModal.fy} · {eventModal.prov ?? "All Provinces"} ·{" "}
                {filteredModalEvents.length !== rawModalEvents.length
                  ? `${filteredModalEvents.length} of `
                  : ""}
                {rawModalEvents.length} event{rawModalEvents.length !== 1 ? "s" : ""}
              </p>
              <p className="text-[15px] font-black text-[#0f0f0f] mt-0.5">
                {eventModal.prov !== null
                  ? `BD Events in ${eventModal.prov}`
                  : `All ${eventModal.fy} Events`}
              </p>
            </div>
            <button
              onClick={() => setEventModal(null)}
              className="text-[#c0c0c0] hover:text-[#1a1a1a] cursor-pointer mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pt-3 pb-2">
            <input
              type="text"
              placeholder="Search codes..."
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              className="w-full text-[11px] font-mono px-3 py-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa] text-[#0f0f0f] placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#2b5346]"
            />
          </div>

          {/* Province pills — all-provinces mode only */}
          {eventModal.prov === null && modalAvailableProvs.length > 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => setModalProvFilter(null)}
                className="text-[9px] font-mono px-2.5 py-1 rounded-full border transition-colors cursor-pointer"
                style={
                  modalProvFilter === null
                    ? { backgroundColor: "#2b5346", color: "white", borderColor: "#2b5346" }
                    : { backgroundColor: "white", color: "#888", borderColor: "#e8e8e8" }
                }
              >
                All
              </button>
              {modalAvailableProvs.map(p => (
                <button
                  key={p}
                  onClick={() => setModalProvFilter(prev => (prev === p ? null : p))}
                  className="text-[9px] font-mono px-2.5 py-1 rounded-full border transition-colors cursor-pointer"
                  style={
                    modalProvFilter === p
                      ? { backgroundColor: provColor(p), color: "white", borderColor: provColor(p) }
                      : { backgroundColor: "white", color: provColor(p), borderColor: "#e8e8e8" }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-[#fafafa] border-b border-[#f0f0ee]">
                <tr>
                  {(["code", "month", "signups"] as const).map(col => {
                    const labels: Record<typeof col, string> = {
                      code: "Code",
                      month: "Month",
                      signups: "Signups",
                    };
                    const isActive = modalSort.by === col;
                    return (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className={`py-2 text-[8.5px] font-mono uppercase tracking-widest cursor-pointer select-none ${
                          col === "code" ? "text-left px-4" : "text-right px-4"
                        }`}
                        style={{ color: isActive ? "#2b5346" : "#a1a1a1" }}
                      >
                        {labels[col]}
                        {isActive ? (modalSort.dir === "asc" ? " ↑" : " ↓") : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredModalEvents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-[10px] font-mono text-[#c0c0c0]">
                      No events match
                    </td>
                  </tr>
                ) : (
                  filteredModalEvents.map(e => (
                    <tr key={e.code} className="border-b border-[#f8f8f8] hover:bg-[#fafafa]">
                      <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-[#0f0f0f]">
                        {e.code}
                        {eventModal.prov === null && e.homeProvince && e.homeProvince !== "??" && (
                          <span className="ml-2 text-[8.5px] font-normal" style={{ color: provColor(e.homeProvince) }}>
                            {e.homeProvince}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-[#888] text-right">
                        {MONTH_ABBR[Number(e.eventMonth.slice(5)) - 1]} {e.eventMonth.slice(0, 4)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-[#2b5346] text-right">
                        {e.totalSignups.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#f5f5f3] flex items-center justify-between gap-3">
            <span className="text-[8.5px] font-mono text-[#c0c0c0]">
              {filteredModalEvents.reduce((s, e) => s + e.totalSignups, 0).toLocaleString()} total signups
              {eventModal.prov === null ? " · attributed by majority province" : ""}
            </span>
            <button
              onClick={() => {
                const text = filteredModalEvents
                  .map(
                    e =>
                      `${e.code}\t${MONTH_ABBR[Number(e.eventMonth.slice(5)) - 1]} ${e.eventMonth.slice(0, 4)}\t${e.totalSignups}`
                  )
                  .join("\n");
                navigator.clipboard.writeText(text).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all"
              style={
                copied
                  ? { backgroundColor: "#eef4f1", color: "#2b5346", borderColor: "#c0ddd6" }
                  : { backgroundColor: "white", color: "#3d3d3d", borderColor: "#e5e5e5" }
              }
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy list"}
            </button>
          </div>
        </div>
      </div>
    )}
    </React.Fragment>
  );
}
