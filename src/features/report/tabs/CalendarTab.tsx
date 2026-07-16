import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2, ChevronRight, Upload, X, ChevronDown, ChevronUp,
  Database, Pin, PinOff, BarChart2, CalendarDays,
} from "lucide-react";
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
  activeProvince?: string | null;
  onProvinceChange?: (p: string | null) => void;
  onCompareFamily?: (codes: string[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────

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

function heatStyle(signups: number, max: number) {
  if (signups === 0) return { bg: "transparent", text: "#d0d0d0", subtext: "#d0d0d0" };
  const t = Math.pow(signups / max, 0.55);
  const r = Math.round(255 - t * 212);
  const g = Math.round(255 - t * 172);
  const b = Math.round(255 - t * 185);
  return {
    bg: `rgb(${r},${g},${b})`,
    text: t > 0.55 ? "rgba(255,255,255,0.95)" : "#1a1a1a",
    subtext: t > 0.55 ? "rgba(255,255,255,0.6)" : "#888",
  };
}

function generateMonthRange(from: string, to: string): string[] {
  const slots: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    slots.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return slots;
}

function monthLabel(mk: string) {
  return MONTH_ABBR[Number(mk.split("-")[1]) - 1];
}

// Canadian city/province tokens embedded in event codes — longest first to
// prevent a short token (BC) shadowing a longer one (BCLA → should keep LA).
const CITY_START_RE = /^(COQUITLAM|ABBOTSFORD|KAMLOOPS|VICTORIA|VANCOUVER|EDMONTON|CALGARY|AIRDRIE|KELOWNA|LANGLEY|SURREY|DELTA|LETH|NVAN|ABBY|COQ|YYC|YVR|YEG|VIC|VAN|EDM|CGY|BC|AB)/;
const CITY_END_RE   = /(COQUITLAM|ABBOTSFORD|KAMLOOPS|VICTORIA|VANCOUVER|EDMONTON|CALGARY|AIRDRIE|KELOWNA|LANGLEY|SURREY|DELTA|LETH|NVAN|ABBY|COQ|YYC|YVR|YEG|VIC|VAN|EDM|CGY|BC|AB)$/;

/**
 * Derive the event family stem from a promo code.
 *
 * Steps applied in order:
 *  1. Uppercase + strip trailing discount/year digits    EVSTAMPEDE10   → EVSTAMPEDE
 *  2. Strip single occurrence-counter digit after EV     EV1PNE         → EVPNE
 *       Single \d only — leaves EV101STFITNESS intact.
 *  3. Strip any remaining trailing 4-digit year          EVEDMFMARKET2025 → EVEDMFMARKET
 *  4. Strip single occurrence-counter digit between
 *     two letters anywhere in stem                       EVIB1PNE       → EVIBPNE
 *       Safe against EVTC10K (digit is not between two letters there).
 *  5. Merge IB-team codes into base family               EVIBBRIDGE     → EVBRIDGE
 *       EVIBPNE, EVIBLILAC, EVIBKIEHLS all merge with their EV* counterparts.
 *  6. Strip leading / trailing Canadian city token from
 *     the event-name portion                             EVVICHOMESHOW  → EVHOMESHOW
 *       EVHOMESHOWVIC, EVVANHOMESHOW, EVBCHOMESHOW all land on EVHOMESHOW.
 *       Only applied to EV* codes; skips BD* codes.
 *       Skipped when stripping would leave < 3 chars (e.g. EVVAN → keep).
 */
function detectFamily(code: string): string {
  const upper = code.toUpperCase().replace(/\s+/g, "");
  if (upper.includes("KAMLOOPS"))  return "EVKAMLOOPS";
  if (upper.includes("KELOWNA"))   return "EVKELOWNA";
  if (upper.includes("PENTICTON")) return "EVPENTICTON";
  let stem = code.toUpperCase().replace(/\d+$/, "");                 // 1
  stem = stem.replace(/^(EV)\d([A-Z])/, "$1$2");                    // 2
  stem = stem.replace(/\d{4,}$/, "");                               // 3
  stem = stem.replace(/([A-Z])\d([A-Z])/g, "$1$2");                 // 4
  stem = stem.replace(/^EVIB/, "EV");                               // 5
  if (stem.startsWith("EV")) {                                       // 6
    const eventPart = stem.slice(2);
    const stripped = eventPart.replace(CITY_START_RE, "").replace(CITY_END_RE, "");
    if (stripped.length >= 3) stem = "EV" + stripped;
  }
  return stem.length >= 4 ? stem : code.toUpperCase();
}

interface EventFamily {
  stem: string;
  name: string;         // stem without "EV" prefix
  events: EventStats[];
  totalSignups: number;
  provinces: string[];
  maxEvSignups: number;
  isRecurring: boolean; // 2+ distinct event dates
}

interface CellKey { prov: string; month: string }

// ── Looker upload guide ────────────────────────────────────────

const LOOKER_STEPS = [
  { step: "01", title: "Open Looker Studio", body: "Go to Looker Studio and open the FreshPrep analytics workspace. Navigate to the Signup Flow Evaluation Dashboard." },
  { step: "02", title: "Open Signup to Paying Customer Conversion", body: 'Go to the dashboard page or section labelled "Signup to Paying Customer Conversion".' },
  { step: "03", title: "Set your date range", body: "Use the date filter at the top of that page. Start before the event or campaign began and extend the end date far enough to capture later conversions." },
  { step: "04", title: "Find the Exportable Client List", body: 'Scroll to the table labelled "Exportable Client List". This view includes every signup with status, discount code, province, first paying date, and days till paying.' },
  { step: "05", title: "Export as CSV", body: "Move over the table, click its top-right three-dot menu (⋮), then choose Export → CSV. Upload the downloaded file below." },
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

// ── AB team province override ─────────────────────────────────
// These codes are run by the AB team even when the host city is in BC.
// Their signups are attributed to "AB" regardless of customer home province.
const AB_TEAM_CODES = new Set([
  "BDABBIKESHOW5","BDWOMENSHOW","BDBABYANDTOT5","BDNIGHTMARKET5",
  "EVSERVUS","BDSOAPRUN","EVLILAC","EVNIGHTMARKETMWD","EVCROSSROADSMW",
  "EVCURRIE5","EVJULYNIGHTMARKET5","EVSUNFEST5","EVTASTEOFCALGARY11",
  "EVMARDA11","EVNIGHTMARKET11","EVGLOBALFEST85","EVROCKYMTN11",
  "EVEDMFALLSHOW11","EVCALRENO6","EVWF6","EVEDMREN06","EVCROSSRD6",
  "EVYYCHOME6","EVRDHOMESHOW6","EVLETHSHOW11","EVABBIKESHOW6",
  "EVEDMHG6","EVYYCWS6","EVCHHOME6","EVSPCKIMB6","EVIBYYCMARATHON6",
  "EVIBYYCTOTS6","EVIBBLOSSOM6","EVIBLILAC6","EVIBBRIDGE6","EVIBBRIDGE10",
  "EVIBAIRDRIE6","EVIBAIRDRIE10","EVIBKIEHLS6","EVIBOKOTOKS6",
  "EVIBCHESTERMERE6","EVIBCARSTAIRS6","EVIBCD10","EVIBTASTEEDM10",
  "EVIBEDM10","EVIBEDMDNTNFM10","EVIBMOMMKT10","EVIBSUNFEST10",
  "EVIBTASTECGY10","EVIBMARDAGRAS10","EVIBWHOOPUP10","EVIBABKIEHLS6",
  "EVIBLMM10","EVIBLMBKER10","EVIBFOXYBOX10","EVIBCGYFHS10",
  "EVIBABWOMENEXPO10","EVIBEDMFHS10","EVIBTRAFIGURA10","EVIBCGYRMWFF10",
  "EVIBEDMRMWFF10","EVIB101STFITNESS10","EVIBRISEREP10","EVIBLIGHTUPFEST10",
  "EVIBGRANDSOUTH10","EVIBEDMTABOO10","EVIBMOMMKTHOLIDAY10","EVIBLMMHOLIDAY10",
  "EVIBPEAKTP10","EVIBGRANARYRDS10","EVIBSTUDIOBHOLI10","EVIBVEGANMKT10",
  "EVIBHERITAGEOUAC10","EVIBCGYRENO2510","EVIBCGYRENOSSTYLED10",
  "EVIBMYODETOXCGY10","EVIBCRUSHCAMP10","EVIBWEDDINGFEDM10","EVIBEDMRENO2510",
  "EVIBCGYRV10","BDIBF45STALB","EVIBWEDDINGFCGY10","EVIBEDMRV10",
  "EVIBCCTC2510","BDIBGYMVMTK10","EVIBCGYHGDN2510","EVIBLMMMAR2510",
  "EVIBRDHOME10","BDIBHERGYMVMT10","EVIBLETHHOME10","EVIBCGYAUTO10",
  "BDIBCHURCHFIT10","EVIBEDMHGDN2510","EVIBBIKEAB2510","EVNATWOMEN2510",
  "EVOKTRADE2510","EVAIRDHLIFE2510","EVLACOMBEDCC10","EVSTALBLIFE10",
  "EVCHTRADE2510","EVSCURUN10","EVHSCAFARM10","EVHERWESWB10","EVSMEPICV29",
  "EVMHOA2510","EVBRIDGE2025","EVCD2025","EVSTAMPEDE10","EVBRIDGE2",
  "EVHSFARM2","EVISUNFEST","EVTASTE2025","EVBOW2025","EVMARDAGRAS",
  "EVBRIDGELAND2025","EVMAHOGANY2025","EVLMM2025","EVWHOOP2025",
  "EVHERITAGE2025","EVHSFARM3","EVEDMFMARKET2025","EVHERITAGE2","EVMAHOGANY3",
  "EVRUMBLE2025","EVAIRDRIEFEST2025","EVBRIDGE9","EVAIRDRIEFARMERS1",
  "EVHERITAGE10","EVEDMFMARKET202513","EVAIRDRIEFARMERS2","EVOKOTOKS2025",
  "EVBCKELOWNASHOW2025","EVCRESCENT2025","EVAIRDRIEFARMERS3",
  "EVCALGARYHOMESHOW2025","EVPENTICTON","EVTRIWOOD2025","EVMAHOGANYFMARKET2025",
  "EVAIRDRIEFARMERS4","EVEDMFMARKET202504","EVHSFARM4","EVEDMFMARKET202511",
  "EVHILLHURSTWINTER","EVEDMHOMESHOW2025","EVFOODWINE2025","EVKAMLOOPSHS",
  "EVHSWINTER","EVHALLOWEENMARKET1","EVLETHBRIDGEHOLIDAYEXPO","EVEDMFOODWINE",
  "EVBEARMARKET","EVHANDCRAFTEDLETHBRIDGE","EVSPRUCE2025","EVCHESTERMEREXMASMARKET",
  "EVAIRDRIEFARM","EVCALGARYMOMMARKET","EVSPRUCE2","EVMOMSHOWEDM",
  "EVGRANARY1","EVLMMNOV2025","EVEXTRAVAGANZA","EVUNIDISTRICT","EVGRANARYNOV",
  "EVMOMSHOWEDMCONVENTION","EVSILVERBELLSEDM","EVMOMMARKETSHERWOODPARK",
  "EVCALRENO2026","EVEDMPETSHOW2026","EVEDMBLUSH","EVEDMWEDDINGFAIR2026",
  "EVEDMRENOSHOW","CALGARYWEDDINGFAIR","EVKELOWNASPRINGSHOW",
  "EVCGYTEACHERS2026","EVREDDEERTEACHERS2026","EVPALLISERTEACHER2026",
  "EVBOATSHOW2026","EVHOMEANDGIFT","EVEDMONTONTEACHERS",
  "EVCALGARYSPRINGSHOW2026","EVREDDEERSHOW2026",
  "EVEDMGYMVMTKENSINGTONAFTERDARK","EVLETH2026","EVEDMBOATSHOW",
  "EVABBIKESHOW","EVVERNONSPRINGSHOW","EVEDMHOMEANDGARDEN","EVABFOODANDDRINK",
  "EVWEDDING2026","EVEDMAUTOSHOW","EVKAMLOOPS26","EVSTALBERT2026",
  "EVAIRDRIEHS26","EVOKOTOKSHS26","EVCOCHRANE","EVLAGREE",
  "EVCALGARYMARATHON26","EVCURRIEMARKET2026","EVMODERN26","EVEDMFARMERSM",
  "EVWIMEDM","EVKELOWNASPRINGSHOW2025",
]);

// ── Component ──────────────────────────────────────────────────

export function CalendarTab({
  customerData, rawPastedCodes, foundReports, selectedFlow,
  staticLoading, staticError,
  customerFileName, isLoadingCustomer, onCustomerFile, onClearCustomer,
  activeProvince, onProvinceChange,
  onCompareFamily,
}: CalendarTabProps): React.ReactElement {

  const [activeProvs, setActiveProvs]       = useState<Set<string> | null>(null);
  const [selected, setSelected]             = useState<CellKey | null>(null);
  const [pinned, setPinned]                 = useState<CellKey | null>(null);
  const [showUpload, setShowUpload]         = useState(false);
  const [isDragOver, setIsDragOver]         = useState(false);
  const [pasteOnly, setPasteOnly]           = useState(false);
  const [calView, setCalView]               = useState<"heatmap" | "families">("heatmap");
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [familyFilter, setFamilyFilter]     = useState<"all" | "recurring">("recurring");
  const [familySearch, setFamilySearch]     = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync global province chip → local province filter
  useEffect(() => {
    if (activeProvince != null) {
      setActiveProvs(new Set([activeProvince]));
    } else {
      setActiveProvs(null);
    }
    setSelected(null);
    setPinned(null);
  }, [activeProvince]);

  const { eventStats } = customerData;
  const isCustomData = !!customerFileName;
  const hasClientLtvUpload = foundReports.length > 0;
  const eventScopeLabel = useMemo(
    () => eventStats.some(e => !e.code.trim().toUpperCase().startsWith("EV"))
      ? "EV-prefix + verified BusinessDevelopment codes"
      : "EV-prefix codes only",
    [eventStats],
  );

  // Apply AB team province override: codes run by AB team even when hosted in BC cities
  const normalizedStats = useMemo(() =>
    eventStats.map(e => {
      const key = e.code.toUpperCase().replace(/\s+/g, "");
      return AB_TEAM_CODES.has(key) ? { ...e, homeProvince: "AB" } : e;
    }),
    [eventStats],
  );

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

  const visibleStats = useMemo(() => {
    let stats = normalizedStats;
    if (pasteOnly && isFilteredPaste) {
      stats = stats.filter(e => pastedSet.has(e.code.toUpperCase()));
    }
    return stats;
  }, [normalizedStats, pastedSet, pasteOnly, isFilteredPaste]);

  // ── Month range ───────────────────────────────────────────────

  // Newest month first — users care about recent activity, not 2024
  const MONTH_SLOTS = useMemo(() => {
    const months = visibleStats.map(e => e.eventMonth).filter(Boolean);
    if (months.length === 0) return generateMonthRange("2024-07", "2026-06").reverse();
    const min = months.reduce((a, b) => a < b ? a : b);
    const max = months.reduce((a, b) => a > b ? a : b);
    return generateMonthRange(min, max).reverse();
  }, [visibleStats]);

  const yearBounds = useMemo(() => {
    const s = new Set<number>();
    for (let i = 1; i < MONTH_SLOTS.length; i++) {
      if (MONTH_SLOTS[i].slice(0, 4) !== MONTH_SLOTS[i - 1].slice(0, 4)) s.add(i);
    }
    return s;
  }, [MONTH_SLOTS]);

  const yearSpans = useMemo(() => {
    const spans: { year: string; count: number }[] = [];
    for (const mk of MONTH_SLOTS) {
      const y = mk.slice(0, 4);
      if (!spans.length || spans[spans.length - 1].year !== y)
        spans.push({ year: y, count: 1 });
      else
        spans[spans.length - 1].count++;
    }
    return spans;
  }, [MONTH_SLOTS]);

  // ── Data coverage stats ───────────────────────────────────────

  const coverageStats = useMemo(() => {
    const byYear: Record<string, { events: number; signups: number }> = {};
    let oldest = "", newest = "";
    for (const e of visibleStats) {
      if (!e.eventMonth) continue;
      const y = e.eventMonth.slice(0, 4);
      if (!byYear[y]) byYear[y] = { events: 0, signups: 0 };
      byYear[y].events++;
      byYear[y].signups += e.totalSignups;
      if (!oldest || e.eventDate < oldest) oldest = e.eventDate;
      if (!newest || e.eventDate > newest) newest = e.eventDate;
    }
    // YTD = most recent calendar year in the data
    const years = Object.keys(byYear).sort();
    const latestYear = years[years.length - 1] ?? "";
    const currentDate = new Date();
    const currentYear = String(currentDate.getFullYear());
    const isYTD = latestYear === currentYear;
    return { byYear, years, latestYear, isYTD, oldest, newest };
  }, [visibleStats]);

  // ── Province × year signup breakdown ─────────────────────────

  const provinceYearStats = useMemo(() => {
    const years = new Set<string>();
    const signups: Record<string, Record<string, number>> = {};
    const events: Record<string, Record<string, number>> = {};
    for (const e of visibleStats) {
      if (!e.eventMonth) continue;
      const yr = e.eventMonth.slice(0, 4);
      years.add(yr);
      // Each EventStats entry = 1 event, attributed to its home province
      const hp = e.homeProvince;
      if (hp && hp !== "??") {
        if (!events[hp]) events[hp] = {};
        events[hp][yr] = (events[hp][yr] ?? 0) + 1;
      }
      // Signups distributed across actual signup provinces
      for (const [prov, count] of Object.entries(e.signupsByProvince)) {
        if (!prov || prov === "??") continue;
        if (!signups[prov]) signups[prov] = {};
        signups[prov][yr] = (signups[prov][yr] ?? 0) + count;
      }
    }
    const sortedYears = Array.from(years).sort();
    const allProvs = new Set([...Object.keys(signups), ...Object.keys(events)]);
    const rows = Array.from(allProvs).map(prov => ({
      prov,
      byYear: signups[prov] ?? {},
      eventsByYear: events[prov] ?? {},
      total: Object.values(signups[prov] ?? {}).reduce((s, n) => s + n, 0),
      totalEvents: Object.values(events[prov] ?? {}).reduce((s, n) => s + n, 0),
    })).sort((a, b) => b.total - a.total);
    const maxTotal = Math.max(1, ...rows.map(r => r.total));
    return { rows, years: sortedYears, maxTotal };
  }, [visibleStats]);

  // ── Province filters ──────────────────────────────────────────

  const allProvs = useMemo(() => {
    const vol = new Map<string, number>();
    for (const e of visibleStats) {
      if (!e.homeProvince || e.homeProvince === "??") continue;
      vol.set(e.homeProvince, (vol.get(e.homeProvince) ?? 0) + e.totalSignups);
    }
    return Array.from(vol.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [visibleStats]);

  const selProvs = useMemo(
    () => activeProvs ?? new Set(allProvs),
    [activeProvs, allProvs],
  );
  const visProvs = useMemo(
    () => allProvs.filter(p => selProvs.has(p)),
    [allProvs, selProvs],
  );

  const toggleProv = (p: string) => {
    const next = new Set(selProvs);
    if (next.has(p) && next.size === 1) return;
    next.has(p) ? next.delete(p) : next.add(p);
    setActiveProvs(next);
    setSelected(null);
    setPinned(null);
  };

  // ── Heatmap matrix ────────────────────────────────────────────

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

  const maxMonthTotal = useMemo(() => Math.max(1, ...monthTotals), [monthTotals]);

  const totalSignups = useMemo(
    () => visibleStats.filter(e => selProvs.has(e.homeProvince)).reduce((s, e) => s + e.totalSignups, 0),
    [visibleStats, selProvs],
  );

  const visibleEventCount = useMemo(
    () => visibleStats.filter(e => selProvs.has(e.homeProvince)).length,
    [visibleStats, selProvs],
  );

  const totalPaying = useMemo(
    () => visibleStats.filter(e => selProvs.has(e.homeProvince)).reduce((s, e) => s + e.payingSignups, 0),
    [visibleStats, selProvs],
  );

  // ── Cell detail ───────────────────────────────────────────────

  const cellProvTotals = useMemo((): [string, number][] => {
    const t: Record<string, number> = {};
    const src = matrix.get(`${selected?.prov}||${selected?.month}`)?.events ?? [];
    for (const e of src) {
      for (const [p, n] of Object.entries(e.signupsByProvince)) {
        t[p] = (t[p] ?? 0) + n;
      }
    }
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [matrix, selected]);

  const selectedEvents = useMemo((): EventStats[] => {
    if (!selected) return [];
    return (matrix.get(`${selected.prov}||${selected.month}`)?.events ?? [])
      .sort((a, b) => b.totalSignups - a.totalSignups);
  }, [matrix, selected]);

  const pinnedEvents = useMemo((): EventStats[] => {
    if (!pinned) return [];
    return (matrix.get(`${pinned.prov}||${pinned.month}`)?.events ?? [])
      .sort((a, b) => b.totalSignups - a.totalSignups);
  }, [matrix, pinned]);

  const selectCell = (prov: string, month: string) => {
    if (!matrix.has(`${prov}||${month}`)) return;
    setSelected(prev => {
      if (prev?.prov === prov && prev.month === month) return null;
      return { prov, month };
    });
  };

  // ── Families view ─────────────────────────────────────────────

  const familyCache = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of visibleStats) m.set(e.code, detectFamily(e.code));
    return m;
  }, [visibleStats]);

  const eventFamilies = useMemo((): EventFamily[] => {
    const map = new Map<string, EventStats[]>();
    for (const e of visibleStats) {
      if (!selProvs.has(e.homeProvince)) continue;
      const stem = familyCache.get(e.code) ?? detectFamily(e.code);
      const arr = map.get(stem) ?? [];
      arr.push(e);
      map.set(stem, arr);
    }
    return Array.from(map.entries()).map(([stem, events]) => {
      const sorted = [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
      const provSet = new Set(events.map(e => e.homeProvince));
      const totalSignups = events.reduce((s, e) => s + e.totalSignups, 0);
      // "recurring" means 2+ distinct event months
      const distinctMonths = new Set(events.map(e => e.eventMonth));
      return {
        stem,
        name: stem.replace(/^EV/, ""),
        events: sorted,
        totalSignups,
        provinces: Array.from(provSet).sort(),
        maxEvSignups: Math.max(1, ...events.map(e => e.totalSignups)),
        isRecurring: distinctMonths.size >= 2,
      };
    }).sort((a, b) => b.totalSignups - a.totalSignups);
  }, [visibleStats, selProvs, familyCache]);

  const filteredFamilies = useMemo(() => {
    let list = familyFilter === "recurring"
      ? eventFamilies.filter(f => f.isRecurring)
      : eventFamilies;
    if (familySearch.trim()) {
      const q = familySearch.trim().toLowerCase();
      list = list.filter(f =>
        f.stem.toLowerCase().includes(q) ||
        f.events.some(e => e.code.toLowerCase().includes(q))
      );
    }
    return list;
  }, [eventFamilies, familyFilter, familySearch]);

  const maxFamilySignups = useMemo(() =>
    Math.max(1, ...eventFamilies.map(f => f.maxEvSignups)),
    [eventFamilies],
  );

  const toggleFamily = (stem: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      next.has(stem) ? next.delete(stem) : next.add(stem);
      return next;
    });
  };

  // ── Upload handler ────────────────────────────────────────────

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
    if (!MONTH_SLOTS.length) return "";
    const asc = [...MONTH_SLOTS].sort();
    const [fy, fm] = asc[0].split("-");
    const [ly, lm] = asc[asc.length - 1].split("-");
    const f = `${MONTH_ABBR[Number(fm) - 1]} ${fy}`;
    const l = `${MONTH_ABBR[Number(lm) - 1]} ${ly}`;
    return f === l ? f : `${f} – ${l}`;
  }, [MONTH_SLOTS]);

  const provSparklines = useMemo(() => {
    const byProvYear: Record<string, Record<string, number>> = {};
    for (const e of visibleStats) {
      if (!e.homeProvince || e.homeProvince === "??") continue;
      const yr = e.eventMonth?.slice(0, 4) ?? "";
      if (!yr) continue;
      if (!byProvYear[e.homeProvince]) byProvYear[e.homeProvince] = {};
      byProvYear[e.homeProvince][yr] = (byProvYear[e.homeProvince][yr] ?? 0) + e.totalSignups;
    }
    const years = coverageStats.years;
    const result: Record<string, number[]> = {};
    for (const p of allProvs) {
      result[p] = years.map(y => byProvYear[p]?.[y] ?? 0);
    }
    return result;
  }, [visibleStats, allProvs, coverageStats.years]);

  const yearBandColors = useMemo(() => {
    const colors: string[] = [];
    let idx = 0;
    let lastYear = "";
    for (const mk of MONTH_SLOTS) {
      const yr = mk.slice(0, 4);
      if (yr !== lastYear) { if (lastYear) idx++; lastYear = yr; }
      colors.push(idx % 2 === 0 ? "#ffffff" : "#f9f8f6");
    }
    return colors;
  }, [MONTH_SLOTS]);

  const headerYoyPct = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    const completedYears = coverageStats.years.filter(y => y !== currentYear);
    const prevY = completedYears[completedYears.length - 1];
    const prevPrevY = completedYears[completedYears.length - 2];
    const prevSig = prevY ? (coverageStats.byYear[prevY]?.signups ?? 0) : 0;
    const prevPrevSig = prevPrevY ? (coverageStats.byYear[prevPrevY]?.signups ?? 0) : 0;
    return prevSig > 0 && prevPrevSig > 0
      ? ((prevSig - prevPrevSig) / prevPrevSig) * 100
      : null;
  }, [coverageStats]);

  // ── Table header (shared with families view) ──────────────────

  const TableHeader = () => (
    <thead>
      <tr>
        <th className="border-b border-[#f0f0ee]" style={{ width: 120, minWidth: 120 }} />
        {yearSpans.map((span, si) => (
          <th
            key={span.year}
            colSpan={span.count}
            className={`text-center text-[8px] font-mono text-[#a1a1a1] py-1.5 border-b border-[#e8e8e8] tracking-widest ${si > 0 ? "border-l-2 border-l-[#d0d0d0]" : ""}`}
          >
            {span.year}
          </th>
        ))}
        <th className="border-b border-[#f0f0ee] w-20" />
      </tr>
      <tr className="bg-[#fafafa]">
        <th className="border-r border-b border-[#f0f0ee]" style={{ minWidth: 120 }} />
        {MONTH_SLOTS.map((mk, i) => (
          <th
            key={mk}
            className={`text-center text-[9px] font-mono text-[#888] font-semibold py-2 border-b border-[#f0f0ee] ${yearBounds.has(i) ? "border-l-2 border-l-[#d0d0d0]" : ""}`}
            style={{ minWidth: 44 }}
          >
            {monthLabel(mk)}
          </th>
        ))}
        <th className="border-b border-[#f0f0ee] text-[8px] font-mono text-[#a1a1a1] text-right pr-3">Total</th>
      </tr>
    </thead>
  );

  // ── Loading / error ───────────────────────────────────────────

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
  if (!eventStats.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <p className="text-sm text-[#a1a1a1] font-mono">No event data available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-24 md:pb-0">

      {/* ══ HERO HEADER ══════════════════════════════════════════════ */}
      <div className="bg-[#1a3d2f] px-4 md:px-8 pt-5 pb-4 flex flex-col gap-3.5 shrink-0">
        {/* Row 1: title + stats */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[8px] font-mono uppercase tracking-[0.28em] text-white/40 mb-1.5">Event Calendar</p>
            <h2 className="text-[22px] md:text-[28px] font-black text-white leading-none tracking-tight">
              BD Events
            </h2>
            <p className="text-[10px] font-mono text-white/40 mt-1">{dateRangeLabel}</p>
          </div>
          <div className="flex items-start gap-5 md:gap-7">
            <div>
              <p className="text-[26px] md:text-[34px] font-black font-mono text-[#e7bd27] leading-none tabular-nums">{visibleEventCount.toLocaleString()}</p>
              <p className="text-[8px] font-mono text-white/35 mt-0.5 uppercase tracking-[0.2em]">events</p>
            </div>
            <div>
              <p className="text-[26px] md:text-[34px] font-black font-mono text-white leading-none tabular-nums">{totalSignups.toLocaleString()}</p>
              <p className="text-[8px] font-mono text-white/35 mt-0.5 uppercase tracking-[0.2em]">signups</p>
            </div>
            <div>
              <p className="text-[26px] md:text-[34px] font-black font-mono leading-none tabular-nums" style={{ color: "#8fc7ae" }}>{totalPaying.toLocaleString()}</p>
              <p className="text-[8px] font-mono text-white/35 mt-0.5 uppercase tracking-[0.2em]">
                paying · {totalSignups > 0 ? ((totalPaying / totalSignups) * 100).toFixed(0) : 0}%
              </p>
            </div>
            {headerYoyPct !== null && (
              <div>
                <p className="text-[26px] md:text-[34px] font-black font-mono leading-none tabular-nums"
                  style={{ color: headerYoyPct >= 0 ? "#4d8970" : "#d97070" }}>
                  {headerYoyPct >= 0 ? "+" : ""}{headerYoyPct.toFixed(0)}%
                </p>
                <p className="text-[8px] font-mono text-white/35 mt-0.5 uppercase tracking-[0.2em]">YoY</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: province chips + view toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 overflow-x-auto no-scrollbar">
            {allProvs.map(p => {
              const provSig = visibleStats.filter(e => e.homeProvince === p).reduce((s, e) => s + e.totalSignups, 0);
              const isActive = selProvs.has(p);
              return (
                <button key={p} onClick={() => toggleProv(p)}
                  className="tap-scale flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0"
                  style={{
                    minHeight: 36,
                    backgroundColor: isActive ? provColor(p) : "rgba(255,255,255,0.09)",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                    border: `1px solid ${isActive ? provColor(p) : "rgba(255,255,255,0.12)"}`,
                  }}>
                  {p}
                  <span className="text-[9px] font-normal opacity-80">{provSig.toLocaleString()}</span>
                </button>
              );
            })}
            {activeProvs !== null && (
              <button onClick={() => { setActiveProvs(null); setSelected(null); setPinned(null); }}
                className="text-[9px] font-mono text-white/40 hover:text-white/70 cursor-pointer transition-colors px-2 py-1.5 shrink-0">
                Show all
              </button>
            )}
            {isFilteredPaste && (
              <>
                <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />
                <button onClick={() => setPasteOnly(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold cursor-pointer transition-all shrink-0"
                  style={pasteOnly
                    ? { backgroundColor: "rgba(255,255,255,0.9)", color: "#1a3d2f" }
                    : { backgroundColor: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  Your events only
                </button>
              </>
            )}
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-white/10 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => { setCalView("heatmap"); setFamilySearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all ${calView === "heatmap" ? "bg-white text-[#1a3d2f]" : "text-white/60 hover:text-white"}`}>
              <BarChart2 className="w-3 h-3" /> Heatmap
            </button>
            <button
              onClick={() => setCalView("families")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all ${calView === "families" ? "bg-white text-[#1a3d2f]" : "text-white/60 hover:text-white"}`}>
              <CalendarDays className="w-3 h-3" /> Families
            </button>
          </div>
        </div>

        {/* Row 3: data source indicator */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/10 flex-wrap">
          <Database className="w-3 h-3 shrink-0" style={{ color: isCustomData ? "#4d8970" : "rgba(255,255,255,0.3)" }} />
          {isCustomData ? (
            <>
              <span className="text-[10px] font-mono text-white/70 truncate">{customerFileName}</span>
              <span className="text-[8px] font-mono text-[#4d8970] bg-[#4d8970]/20 px-1.5 py-0.5 rounded-full">your data</span>
              <span className="text-[8.5px] font-mono text-white/30">{eventScopeLabel}</span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-mono text-white/35">Built-in dataset</span>
              <span className="text-[8px] font-mono text-white/25 px-1.5 py-0.5 rounded-full border border-white/10">{dateRangeLabel}</span>
              <span className="text-[8.5px] font-mono text-white/25">{eventScopeLabel}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {isCustomData && (
              <button onClick={() => { onClearCustomer(); setSelected(null); setPinned(null); }}
                className="text-[9px] font-mono text-white/40 hover:text-white/70 cursor-pointer transition-colors flex items-center gap-1">
                <X className="w-2.5 h-2.5" /> Revert
              </button>
            )}
            <button onClick={() => setShowUpload(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-semibold cursor-pointer border transition-all"
              style={showUpload
                ? { backgroundColor: "rgba(255,255,255,0.15)", color: "white", borderColor: "rgba(255,255,255,0.25)" }
                : { backgroundColor: "transparent", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.15)" }}>
              <Upload className="w-3 h-3" />
              {showUpload ? "Close" : "Upload data"}
              {showUpload ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ══ HEATMAP VIEW ════════════════════════════════════════════ */}
      {calView === "heatmap" && (
        <div className="flex flex-row bg-[#f5f4f1] border-b border-[#e8e8e8]">

          {/* ── Mobile: Transposed calendar grid (months↓ × provinces→) ── */}
          <div className="md:hidden flex-1 flex flex-col bg-[#f5f4f1]">
            {/* Sticky province header row */}
            <div className="flex items-center sticky top-0 z-10 bg-[#f5f4f1] border-b-2 border-[#e0ded8] px-3 pt-3 pb-2">
              <div style={{ width: 44, minWidth: 44 }} />
              {visProvs.map(prov => (
                <div key={prov} className="flex-1 text-center">
                  <span className="text-[11px] font-black font-mono" style={{ color: provColor(prov) }}>{prov}</span>
                </div>
              ))}
            </div>

            {/* Month rows */}
            {MONTH_SLOTS.map((mo, mi) => {
              const yr = mo.slice(0, 4);
              const isFirstOfYear = mi === 0 || MONTH_SLOTS[mi - 1].slice(0, 4) !== yr;
              return (
                <React.Fragment key={mo}>
                  {isFirstOfYear && (
                    <div className="flex items-center px-3 py-1.5" style={{ borderTop: mi > 0 ? "2px solid #e0ded8" : "none", marginTop: mi > 0 ? 2 : 0 }}>
                      <div style={{ width: 44 }} />
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-px flex-1" style={{ backgroundColor: "#d8d5cc" }} />
                        <span className="text-[8px] font-mono font-bold tracking-[0.22em] uppercase px-2.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: "#2b5346" }}>{yr}</span>
                        <div className="h-px flex-1" style={{ backgroundColor: "#d8d5cc" }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 px-3 border-b border-[#eeede8]" style={{ minHeight: 38 }}>
                    {/* Month label */}
                    <div style={{ width: 44, minWidth: 44 }}>
                      <span className="text-[9px] font-mono text-[#999]">{monthLabel(mo)}</span>
                    </div>
                    {/* Province cells */}
                    {visProvs.map(prov => {
                      const k = `${prov}||${mo}`;
                      const cell = matrix.get(k);
                      const sig = cell?.signups ?? 0;
                      const evCount = cell?.events.length ?? 0;
                      const isSel = selected?.prov === prov && selected.month === mo;
                      const isPinned = pinned?.prov === prov && pinned.month === mo;
                      const s2 = heatStyle(sig, maxCellSignups);
                      const t = sig > 0 ? Math.pow(sig / maxCellSignups, 0.55) : 0;
                      return (
                        <div key={prov}
                          onClick={() => sig > 0 && selectCell(prov, mo)}
                          className={`flex-1 flex flex-col items-center justify-center rounded-md select-none ${sig > 0 ? "cursor-pointer" : ""}`}
                          style={{
                            height: 30,
                            backgroundColor: isSel ? provColor(prov) : sig > 0 ? s2.bg : "transparent",
                            boxShadow: sig > 0 && !isSel ? `0 1px ${Math.round(2 + t * 6)}px rgba(43,83,70,${(t * 0.18).toFixed(2)})` : "none",
                            outline: isPinned ? `2px dashed ${provColor(prov)}` : "none",
                            outlineOffset: -2,
                            transform: isSel ? "scale(1.06)" : "scale(1)",
                            transition: "transform 0.1s ease",
                          }}>
                          {sig > 0 && (
                            <>
                              <span className="text-[9.5px] font-black font-mono leading-none"
                                style={{ color: isSel ? "#fff" : s2.text }}>
                                {sig >= 1000 ? `${(sig / 1000).toFixed(1)}k` : sig}
                              </span>
                              {evCount > 1 && (
                                <span className="text-[6.5px] font-mono leading-none mt-0.5"
                                  style={{ color: isSel ? "rgba(255,255,255,0.6)" : s2.subtext }}>
                                  {evCount}ev
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}

            {/* Province totals footer */}
            <div className="flex items-center gap-1 px-3 py-3 border-t-2 border-[#d8d5cc]" style={{ backgroundColor: "#dedad1" }}>
              <div style={{ width: 44, minWidth: 44 }}>
                <span className="text-[7.5px] font-mono uppercase tracking-wider text-[#a0a0a0]">Total</span>
              </div>
              {visProvs.map(prov => {
                const provTotal = MONTH_SLOTS.reduce((s, mo) => s + (matrix.get(`${prov}||${mo}`)?.signups ?? 0), 0);
                return (
                  <div key={prov} className="flex-1 text-center">
                    <span className="text-[10px] font-black font-mono" style={{ color: provColor(prov) }}>
                      {provTotal > 0 ? (provTotal >= 1000 ? `${(provTotal / 1000).toFixed(1)}k` : provTotal) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Desktop: Mosaic heat grid ────────────────────────────── */}
          <div className="hidden md:block flex-1 overflow-x-auto min-w-0" style={{ WebkitOverflowScrolling: "touch" }}>
            <table
              style={{
                minWidth: Math.max(600, MONTH_SLOTS.length * 54 + 168),
                borderCollapse: "separate",
                borderSpacing: "3px 3px",
                padding: "10px 10px 6px",
              }}>
              <thead>
                {/* Year pill row */}
                <tr>
                  <th style={{ width: 128, minWidth: 128, verticalAlign: "bottom", paddingBottom: 6 }} />
                  {yearSpans.map((span, si) => (
                    <th key={span.year} colSpan={span.count}
                      style={{ paddingBottom: 6, paddingLeft: si > 0 ? 8 : 0 }}>
                      <div className="rounded-full py-1 text-center"
                        style={{ backgroundColor: si % 2 === 0 ? "#2b5346" : "#1a3d2f" }}>
                        <span className="text-[8.5px] font-mono font-bold tracking-[0.22em] uppercase text-white/90">{span.year}</span>
                      </div>
                    </th>
                  ))}
                  <th style={{ width: 72 }} />
                </tr>
                {/* Month label row */}
                <tr>
                  <th className="sticky left-0 z-20 text-left"
                    style={{ width: 128, minWidth: 128, backgroundColor: "#f5f4f1", paddingBottom: 4 }}>
                    <span className="text-[7.5px] font-mono uppercase tracking-[0.22em] text-[#c8c8c8] pl-1">Province</span>
                  </th>
                  {MONTH_SLOTS.map((mk, i) => (
                    <th key={mk}
                      style={{
                        minWidth: 54, backgroundColor: "#f5f4f1",
                        paddingBottom: 4, paddingLeft: yearBounds.has(i) ? 8 : 0, textAlign: "center",
                      }}>
                      <span className="text-[8.5px] font-mono text-[#aaa]">{monthLabel(mk)}</span>
                    </th>
                  ))}
                  <th style={{ backgroundColor: "#f5f4f1", textAlign: "right", paddingRight: 10, paddingBottom: 4 }}>
                    <span className="text-[7.5px] font-mono uppercase tracking-wide text-[#b0b0b0]">Total</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visProvs.map(prov => {
                  const spark = provSparklines[prov] ?? [];
                  const rowTotal = MONTH_SLOTS.reduce((s, mo) => s + (matrix.get(`${prov}||${mo}`)?.signups ?? 0), 0);
                  return (
                    <tr key={prov} className="group">
                      {/* Province sticky label cell */}
                      <td className="sticky left-0 z-10" style={{ paddingRight: 4 }}>
                        <div className="flex items-center justify-between gap-1.5 h-full px-2.5 py-2 rounded-xl"
                          style={{
                            borderLeft: `3px solid ${provColor(prov)}`,
                            backgroundColor: `${provColor(prov)}0d`,
                          }}>
                          <div>
                            <p className="text-[13px] font-black font-mono leading-none" style={{ color: provColor(prov) }}>{prov}</p>
                            <p className="text-[8px] font-mono text-[#c0c0c0] mt-0.5 tabular-nums">{rowTotal > 0 ? rowTotal.toLocaleString() : ""}</p>
                          </div>
                          {spark.length >= 2 && (() => {
                            const max = Math.max(1, ...spark);
                            const W = 32, H = 16, n = spark.length;
                            const bw = Math.max(2, (W - (n - 1) * 2) / n);
                            return (
                              <svg width={W} height={H} className="opacity-55 shrink-0">
                                {spark.map((v, i2) => {
                                  const h = Math.max(2, (v / max) * H);
                                  return <rect key={i2} x={i2 * (bw + 2)} y={H - h} width={bw} height={h} rx={1} fill={provColor(prov)} />;
                                })}
                              </svg>
                            );
                          })()}
                        </div>
                      </td>
                      {/* Month data cells */}
                      {MONTH_SLOTS.map((mo, i) => {
                        const k = `${prov}||${mo}`;
                        const cell = matrix.get(k);
                        const sig = cell?.signups ?? 0;
                        const evCount = cell?.events.length ?? 0;
                        const style2 = heatStyle(sig, maxCellSignups);
                        const t = sig > 0 ? Math.pow(sig / maxCellSignups, 0.55) : 0;
                        const isSel = selected?.prov === prov && selected.month === mo;
                        const isPinned = pinned?.prov === prov && pinned.month === mo;
                        const isYearBound = yearBounds.has(i);
                        return (
                          <td key={mo}
                            onClick={() => sig > 0 && selectCell(prov, mo)}
                            className="select-none"
                            style={{
                              minWidth: 54,
                              height: 48,
                              borderRadius: 8,
                              backgroundColor: isSel ? provColor(prov)
                                : isPinned ? provColor(prov) + "22"
                                : sig > 0 ? style2.bg
                                : "#eae8e2",
                              boxShadow: isSel
                                ? `0 0 0 2px ${provColor(prov)}, 0 4px 14px rgba(43,83,70,0.28)`
                                : sig > 0 ? `0 2px ${Math.round(2 + t * 10)}px rgba(43,83,70,${(t * 0.22).toFixed(2)})` : "none",
                              cursor: sig > 0 ? "pointer" : "default",
                              textAlign: "center", verticalAlign: "middle",
                              outline: isPinned ? `2px dashed ${provColor(prov)}` : "none",
                              outlineOffset: -2,
                              paddingLeft: isYearBound ? 6 : 0,
                              transform: isSel ? "scale(1.08)" : "scale(1)",
                              transition: "box-shadow 0.15s ease, transform 0.1s ease",
                            }}>
                            {sig > 0 ? (
                              <div>
                                <p className="text-[11.5px] font-black font-mono leading-none"
                                  style={{ color: isSel ? "#fff" : style2.text }}>
                                  {sig >= 1000 ? `${(sig / 1000).toFixed(1)}k` : sig}
                                </p>
                                {evCount > 1 && (
                                  <p className="text-[7px] font-mono leading-none mt-0.5"
                                    style={{ color: isSel ? "rgba(255,255,255,0.65)" : style2.subtext }}>
                                    {evCount}ev
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                      {/* Row total */}
                      <td style={{ textAlign: "right", paddingRight: 10, paddingLeft: 4 }}>
                        {rowTotal > 0 && (
                          <span className="text-[11px] font-black font-mono" style={{ color: provColor(prov) }}>
                            {rowTotal.toLocaleString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Monthly totals row */}
                <tr>
                  <td className="sticky left-0 z-10" style={{ paddingRight: 4 }}>
                    <div className="flex items-center px-2.5 py-2.5 rounded-xl" style={{ backgroundColor: "#dedad1" }}>
                      <span className="text-[7.5px] font-mono uppercase tracking-[0.22em] text-[#a0a0a0]">Total</span>
                    </div>
                  </td>
                  {monthTotals.map((tot, i) => (
                    <td key={MONTH_SLOTS[i]}
                      style={{
                        backgroundColor: "#dedad1",
                        borderRadius: 8,
                        textAlign: "center", verticalAlign: "bottom",
                        paddingTop: 6, paddingBottom: 6, height: 48,
                        paddingLeft: yearBounds.has(i) ? 6 : 0,
                      }}>
                      {tot > 0 && (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="w-3 rounded-sm mx-auto"
                            style={{ height: Math.max(3, (tot / maxMonthTotal) * 22), backgroundColor: "#2b5346", opacity: 0.55 }} />
                          <p className="text-[8px] font-mono text-[#777] tabular-nums">
                            {tot >= 1000 ? `${(tot / 1000).toFixed(1)}k` : tot}
                          </p>
                        </div>
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: "right", paddingRight: 10, paddingLeft: 4 }}>
                    <span className="text-[12px] font-black font-mono text-[#1a1a1a]">
                      {monthTotals.reduce((s, n) => s + n, 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            {/* Legend */}
            <div className="px-5 py-3 flex items-center gap-3 border-t border-[#dedbd4]">
              <span className="text-[7.5px] font-mono text-[#b0b0b0] uppercase tracking-wider">Signups</span>
              <div className="flex items-center gap-1">
                {[0, 0.15, 0.3, 0.5, 0.7, 1.0].map((t, i) => (
                  <div key={i} className="w-5 h-3 rounded"
                    style={{ backgroundColor: t === 0 ? "#eae8e2" : `rgb(${Math.round(255 - t * 212)},${Math.round(255 - t * 172)},${Math.round(255 - t * 185)})` }} />
                ))}
              </div>
              <span className="text-[8px] font-mono text-[#a0a0a0]">Low → High</span>
              {!selected && <span className="text-[8px] font-mono text-[#c0c0c0] ml-3">Click any cell to drill in · Pin + click another to compare</span>}
              {pinned && <span className="text-[8.5px] font-mono text-[#a0a0a0] ml-3">Dashed = pinned for comparison</span>}
            </div>
          </div>

          {/* Desktop detail/comparison panel — slides in from right */}
          <div className="hidden md:block shrink-0 border-l border-[#e8e8e8] overflow-hidden"
            style={{
              width: (selected && selectedEvents.length > 0) ? 320 : 0,
              transition: "width 0.26s cubic-bezier(0.23,1,0.32,1)",
            }}>
            <div style={{ width: 320 }}>
              {selected && selectedEvents.length > 0 && (() => {
                const [sy, sm] = selected.month.split("-");
                const selLabel = `${MONTH_ABBR[Number(sm) - 1]} ${sy} · ${selected.prov}`;
                const selSignups = selectedEvents.reduce((s, e) => s + e.totalSignups, 0);
                const maxEv = Math.max(1, ...selectedEvents.map(e => e.totalSignups));
                const maxProv = Math.max(1, ...cellProvTotals.map(([, n]) => n));

                if (pinned && pinnedEvents.length > 0 && (pinned.prov !== selected.prov || pinned.month !== selected.month)) {
                  const [py, pm] = pinned.month.split("-");
                  const pinLabel = `${MONTH_ABBR[Number(pm) - 1]} ${py} · ${pinned.prov}`;
                  const pinSignups = pinnedEvents.reduce((s, e) => s + e.totalSignups, 0);
                  const allCodes = Array.from(new Set([...selectedEvents.map(e => e.code), ...pinnedEvents.map(e => e.code)])).sort();
                  const selMap = new Map(selectedEvents.map(e => [e.code, e]));
                  const pinMap = new Map(pinnedEvents.map(e => [e.code, e]));
                  return (
                    <div className="flex flex-col">
                      <div className="border-b border-[#f0f0ee] divide-y divide-[#f5f5f3]">
                        {[
                          { label: pinLabel, signups: pinSignups, prov: pinned.prov, isPinned: true },
                          { label: selLabel, signups: selSignups, prov: selected.prov, isPinned: false },
                        ].map(col => (
                          <div key={col.label} className="px-4 py-3 flex items-center justify-between gap-2"
                            style={{ borderLeft: `3px solid ${provColor(col.prov)}` }}>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black text-[#0f0f0f]">{col.label}</span>
                                {col.isPinned && <span className="text-[7.5px] font-mono text-[#a1a1a1] bg-[#f5f5f3] px-1.5 py-0.5 rounded">pinned</span>}
                              </div>
                              <p className="text-[18px] font-black font-mono tabular-nums" style={{ color: provColor(col.prov) }}>
                                {col.signups.toLocaleString()}<span className="text-[9px] font-normal text-[#a1a1a1] ml-1">sig</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="overflow-y-auto divide-y divide-[#f8f8f8]">
                        {allCodes.map(code => {
                          const a = pinMap.get(code);
                          const b = selMap.get(code);
                          const maxSig = Math.max(1, a?.totalSignups ?? 0, b?.totalSignups ?? 0);
                          const delta = (b?.totalSignups ?? 0) - (a?.totalSignups ?? 0);
                          const CompCell = ({ ev, prov }: { ev: EventStats | undefined; prov: string }) => (
                            <div className="px-3 py-2.5 flex items-center gap-2">
                              {ev ? (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono font-black text-[10px] text-[#0f0f0f] truncate">{ev.code}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 w-20">
                                    <div className="h-1.5 bg-[#f0f0ee] rounded-full overflow-hidden flex-1">
                                      <div className="h-full rounded-full" style={{ width: `${Math.max(3, (ev.totalSignups / maxSig) * 100)}%`, backgroundColor: provColor(prov), opacity: 0.7 }} />
                                    </div>
                                    <span className="text-[10px] font-mono font-semibold text-[#3d3d3d] w-6 text-right shrink-0">{ev.totalSignups}</span>
                                  </div>
                                </>
                              ) : (
                                <span className="text-[9px] font-mono text-[#d0d0d0]">—</span>
                              )}
                            </div>
                          );
                          return (
                            <div key={code} className="grid grid-cols-2 divide-x divide-[#f8f8f8] items-center">
                              <CompCell ev={a} prov={pinned.prov} />
                              <div className="relative">
                                <CompCell ev={b} prov={selected.prov} />
                                {a && b && (
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7.5px] font-mono font-bold px-1 py-0.5 rounded-full"
                                    style={{ backgroundColor: delta >= 0 ? "#eef4f1" : "#fff0f0", color: delta >= 0 ? "#2b5346" : "#850b0b" }}>
                                    {delta >= 0 ? "+" : ""}{delta}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 py-2.5 border-t border-[#f0f0ee] flex items-center justify-between shrink-0">
                        <span className="text-[8.5px] font-mono text-[#a1a1a1]">Δ = selected vs pinned</span>
                        <button onClick={() => setPinned(null)}
                          className="text-[8.5px] font-mono text-[#a1a1a1] hover:text-[#850b0b] cursor-pointer flex items-center gap-1">
                          <PinOff className="w-2.5 h-2.5" /> Clear
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col">
                    <div className="px-4 py-3.5 border-b border-[#ebebeb] flex items-start justify-between gap-3"
                      style={{ borderLeft: `3px solid ${provColor(selected.prov)}` }}>
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#b0b0b0] mb-0.5">{selected.prov}</p>
                        <p className="text-[15px] font-black text-[#0f0f0f] leading-tight">
                          {MONTH_ABBR[Number(sm) - 1]} {sy}
                        </p>
                        <p className="text-[13px] font-black font-mono mt-0.5 tabular-nums" style={{ color: provColor(selected.prov) }}>
                          {selSignups.toLocaleString()}<span className="text-[9px] font-normal text-[#a1a1a1] ml-1">signups</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="hidden sm:flex items-end gap-1 h-7">
                          {cellProvTotals.map(([p, n]) => (
                            <div key={p} className="flex flex-col items-center gap-0.5">
                              <div className="w-3 rounded-sm" style={{ height: Math.max(2, (n / maxProv) * 18), backgroundColor: provColor(p) }} />
                              <span className="text-[6.5px] font-mono" style={{ color: provColor(p) }}>{p}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setPinned(prev => (prev?.prov === selected.prov && prev.month === selected.month ? null : selected))}
                          title={pinned?.prov === selected.prov && pinned.month === selected.month ? "Unpin" : "Pin to compare"}
                          className="tap-scale p-2 rounded-lg border cursor-pointer transition-all"
                          style={pinned?.prov === selected.prov && pinned.month === selected.month
                            ? { backgroundColor: "#2b5346", color: "white", borderColor: "#2b5346" }
                            : { backgroundColor: "white", color: "#a0a0a0", borderColor: "#e5e5e5" }}>
                          <Pin className="w-3 h-3" />
                        </button>
                        <button onClick={() => setSelected(null)}
                          className="tap-scale p-2 text-[#c0c0c0] hover:text-[#888] cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {pinned && (pinned.prov !== selected.prov || pinned.month !== selected.month) === false && (
                      <div className="px-4 py-2 bg-[#eef4f1] border-b border-[#d0e8e2]">
                        <p className="text-[8.5px] font-mono text-[#2b5346]">Pinned · click another cell to compare</p>
                      </div>
                    )}
                    <div className="divide-y divide-[#f3f3f1]">
                      {selectedEvents.map(event => {
                        const enriched = reportByCode.get(event.code);
                        const barPct = Math.max(3, (event.totalSignups / maxEv) * 100);
                        const isPasted = isFilteredPaste && pastedSet.has(event.code);
                        const color = enriched ? convGradeColor(enriched.calculatedConversion) : provColor(event.homeProvince);
                        const famStem = detectFamily(event.code);
                        const famName = famStem.replace(/^EV/, "");
                        const isRecurringCode = eventFamilies.find(f => f.stem === famStem)?.isRecurring;
                        return (
                          <div key={event.code}
                            className="flex items-center gap-3 px-4 py-3"
                            style={{ opacity: isFilteredPaste && !isPasted ? 0.4 : 1 }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isPasted && <span className="text-[7px] font-mono text-[#2b5346] bg-[#eef4f1] px-1 py-0.5 rounded shrink-0">yours</span>}
                                <span className="font-mono font-black text-[11px] text-[#0f0f0f] truncate">{event.code}</span>
                              </div>
                              <p className="text-[8.5px] font-mono text-[#b0b0b0] mt-0.5">
                                {event.eventDateLabel}
                                {isRecurringCode && <span className="ml-1 text-[#c8c8c8]">↻ {famName}</span>}
                              </p>
                            </div>
                            {enriched && (
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-semibold font-mono" style={{ color: convGradeColor(enriched.calculatedConversion) }}>
                                  {enriched.calculatedConversion.toFixed(1)}%
                                </span>
                                {enriched["Avg LTV 12"] > 0 && (
                                  <p className="text-[8.5px] font-mono text-[#b0b0b0]">${enriched["Avg LTV 12"].toFixed(0)}</p>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 shrink-0 w-20">
                              <div className="h-1.5 bg-[#f0f0ee] rounded-full overflow-hidden flex-1">
                                <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.75 }} />
                              </div>
                              <span className="text-[11px] font-black font-mono text-[#1a1a1a] tabular-nums w-7 text-right">{event.totalSignups}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {!foundReports.length && (
                      <div className="px-4 py-2.5 border-t border-[#f3f3f1]">
                        <p className="text-[8.5px] font-mono text-[#c0c0c0]">Upload Looker data to see conversion rates.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom sheet (portal — escapes transform stacking context) */}
      {calView === "heatmap" && selected && selectedEvents.length > 0 && createPortal(
        (() => {
          const [sy, sm] = selected.month.split("-");
          const selSignups = selectedEvents.reduce((s, e) => s + e.totalSignups, 0);
          const maxEv = Math.max(1, ...selectedEvents.map(e => e.totalSignups));

          if (pinned && pinnedEvents.length > 0 && (pinned.prov !== selected.prov || pinned.month !== selected.month)) {
            const [py, pm] = pinned.month.split("-");
            const selLabel = `${MONTH_ABBR[Number(sm) - 1]} ${sy} · ${selected.prov}`;
            const pinLabel = `${MONTH_ABBR[Number(pm) - 1]} ${py} · ${pinned.prov}`;
            const pinSignups = pinnedEvents.reduce((s, e) => s + e.totalSignups, 0);
            const allCodes = Array.from(new Set([...selectedEvents.map(e => e.code), ...pinnedEvents.map(e => e.code)])).sort();
            const selMap = new Map(selectedEvents.map(e => [e.code, e]));
            const pinMap = new Map(pinnedEvents.map(e => [e.code, e]));
            return (
              <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: "72vh", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#e0e0e0] rounded-full" />
                <div className="flex-none px-4 pt-5 pb-3 border-b border-[#f0f0ee] flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#0f0f0f]">Comparison</span>
                  <button onClick={() => setPinned(null)} className="text-[9px] font-mono text-[#850b0b] cursor-pointer">Clear</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 divide-x divide-[#f0f0ee] border-b border-[#f0f0ee]">
                    {[{ label: pinLabel, signups: pinSignups, prov: pinned.prov }, { label: selLabel, signups: selSignups, prov: selected.prov }].map(col => (
                      <div key={col.label} className="px-3 py-2.5" style={{ borderLeft: `3px solid ${provColor(col.prov)}` }}>
                        <p className="text-[9.5px] font-black text-[#1a1a1a]">{col.label}</p>
                        <p className="text-[14px] font-black font-mono" style={{ color: provColor(col.prov) }}>{col.signups.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  {allCodes.map(code => {
                    const a = pinMap.get(code);
                    const b = selMap.get(code);
                    const maxSig = Math.max(1, a?.totalSignups ?? 0, b?.totalSignups ?? 0);
                    const delta = (b?.totalSignups ?? 0) - (a?.totalSignups ?? 0);
                    const MobCell = ({ ev, prov }: { ev: EventStats | undefined; prov: string }) => (
                      <div className="px-3 py-2.5 flex items-center gap-2">
                        {ev ? (
                          <>
                            <span className="font-mono text-[10px] font-black text-[#0f0f0f] flex-1 min-w-0 truncate">{ev.code}</span>
                            <span className="text-[10px] font-mono font-semibold shrink-0">{ev.totalSignups}</span>
                          </>
                        ) : <span className="text-[9px] font-mono text-[#ccc]">—</span>}
                      </div>
                    );
                    return (
                      <div key={code} className="grid grid-cols-2 divide-x divide-[#f8f8f8] border-b border-[#f5f5f3] items-center">
                        <MobCell ev={a} prov={pinned.prov} />
                        <div className="relative">
                          <MobCell ev={b} prov={selected.prov} />
                          {a && b && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7.5px] font-mono font-bold px-1 py-0.5 rounded-full"
                              style={{ backgroundColor: delta >= 0 ? "#eef4f1" : "#fff0f0", color: delta >= 0 ? "#2b5346" : "#850b0b" }}>
                              {delta >= 0 ? "+" : ""}{delta}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-2xl shadow-2xl flex flex-col"
              style={{ maxHeight: "68vh", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#e0e0e0] rounded-full" />
              <div className="flex-none px-4 pt-5 pb-3 border-b border-[#f0f0ee] flex items-center justify-between gap-3"
                style={{ borderLeft: `3px solid ${provColor(selected.prov)}` }}>
                <div>
                  <p className="text-[8px] font-mono uppercase tracking-widest text-[#b0b0b0]">{selected.prov}</p>
                  <p className="text-[15px] font-black text-[#0f0f0f]">{MONTH_ABBR[Number(sm) - 1]} {sy}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div>
                    <p className="text-[18px] font-black font-mono text-right tabular-nums" style={{ color: provColor(selected.prov) }}>{selSignups.toLocaleString()}</p>
                    <p className="text-[7.5px] font-mono text-[#a1a1a1] text-right">signups</p>
                  </div>
                  <button
                    onClick={() => setPinned(prev => (prev?.prov === selected.prov && prev.month === selected.month ? null : selected))}
                    className="tap-scale p-2.5 rounded-lg border cursor-pointer transition-all"
                    style={{ minHeight: 44, minWidth: 44,
                      ...(pinned?.prov === selected.prov && pinned.month === selected.month
                        ? { backgroundColor: "#2b5346", color: "white", borderColor: "#2b5346" }
                        : { backgroundColor: "white", color: "#a0a0a0", borderColor: "#e5e5e5" }) }}>
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSelected(null)}
                    className="tap-scale p-2.5 text-[#c0c0c0] cursor-pointer" style={{ minHeight: 44, minWidth: 44 }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {pinned && (pinned.prov !== selected.prov || pinned.month !== selected.month) === false && (
                <div className="flex-none px-4 py-2 bg-[#eef4f1] border-b border-[#d0e8e2]">
                  <p className="text-[9px] font-mono text-[#2b5346]">Pinned · tap another cell to compare</p>
                </div>
              )}
              <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0ee]">
                {selectedEvents.map(event => {
                  const enriched = reportByCode.get(event.code);
                  const barPct = Math.max(3, (event.totalSignups / maxEv) * 100);
                  const isPasted = isFilteredPaste && pastedSet.has(event.code);
                  const color = enriched ? convGradeColor(enriched.calculatedConversion) : provColor(event.homeProvince);
                  const famStem = detectFamily(event.code);
                  const famName = famStem.replace(/^EV/, "");
                  const isRecurringCode = eventFamilies.find(f => f.stem === famStem)?.isRecurring;
                  return (
                    <div key={event.code} className="flex items-center gap-3"
                      style={{ opacity: isFilteredPaste && !isPasted ? 0.4 : 1, minHeight: 56 }}>
                      <div className="self-stretch w-1 shrink-0 rounded-r" style={{ backgroundColor: provColor(event.homeProvince) }} />
                      <div className="flex-1 min-w-0 py-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isPasted && <span className="text-[7.5px] font-mono text-[#2b5346] bg-[#eef4f1] px-1 py-0.5 rounded font-semibold shrink-0">yours</span>}
                          <span className="font-mono font-bold text-[12px] text-[#0f0f0f] truncate">{event.code}</span>
                        </div>
                        <p className="text-[10px] text-[#a1a1a1] mt-0.5 truncate">
                          <span style={{ color: provColor(event.homeProvince), fontWeight: 700 }}>{event.homeProvince}</span>
                          {" · "}{event.eventDateLabel}
                          {isRecurringCode && <span className="ml-1 text-[#c8c8c8]">↻ {famName}</span>}
                        </p>
                      </div>
                      {enriched && (
                        <span className="text-[10px] font-semibold font-mono shrink-0"
                          style={{ color: convGradeColor(enriched.calculatedConversion) }}>
                          {enriched.calculatedConversion.toFixed(1)}%
                        </span>
                      )}
                      <div className="flex items-center gap-2 shrink-0 pr-4">
                        <div className="h-1.5 bg-[#f0f0ee] rounded-full overflow-hidden w-14">
                          <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.75 }} />
                        </div>
                        <span className="font-mono font-bold text-[14px] text-[#1a1a1a] tabular-nums">{event.totalSignups}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!foundReports.length && (
                <div className="flex-none px-4 py-2.5 border-t border-[#f3f3f1]">
                  <p className="text-[8.5px] font-mono text-[#c0c0c0]">Upload Looker data on the Overview tab for conversion rates.</p>
                </div>
              )}
            </div>
          );
        })(),
        document.body
      )}

      {/* ══ FAMILIES VIEW ═══════════════════════════════════════════ */}
      {calView === "families" && (
        <div className="bg-white border-b border-[#e8e8e8]">
          {/* Families filter bar */}
          <div className="px-4 py-3 border-b border-[#f0f0ee] flex items-center gap-3 bg-[#fafaf8] flex-wrap">
            <div className="flex items-center bg-[#f0f0ee] p-0.5 rounded-lg border border-[#e5e5e5]">
              <button
                onClick={() => setFamilyFilter("recurring")}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-all ${familyFilter === "recurring" ? "bg-white text-[#2b5346] shadow-sm" : "text-[#888]"}`}
              >
                Recurring ({eventFamilies.filter(f => f.isRecurring).length})
              </button>
              <button
                onClick={() => setFamilyFilter("all")}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-all ${familyFilter === "all" ? "bg-white text-[#2b5346] shadow-sm" : "text-[#888]"}`}
              >
                All families ({eventFamilies.length})
              </button>
            </div>
            <input
              type="text"
              placeholder="Search event families..."
              value={familySearch}
              onChange={e => setFamilySearch(e.target.value)}
              className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-[#e8e8e8] bg-[#fafafa] text-[#0f0f0f] placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#2b5346] min-w-[180px]"
            />
            <span className="text-[9px] font-mono text-[#a1a1a1]">
              Event codes grouped by name — trailing numbers stripped to detect recurring events.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: Math.max(700, MONTH_SLOTS.length * 44 + 240) }}>
              <TableHeader />
              <tbody>
                {filteredFamilies.length === 0 ? (
                  <tr>
                    <td colSpan={MONTH_SLOTS.length + 2} className="py-10 text-center text-[10px] font-mono text-[#a1a1a1]">
                      {familySearch.trim() ? `No families match "${familySearch}"` : "No recurring families found for current filters."}
                    </td>
                  </tr>
                ) : filteredFamilies.map(fam => {
                  const isExpanded = expandedFamilies.has(fam.stem);
                  return (
                    <React.Fragment key={fam.stem}>
                      {/* Family summary row */}
                      <tr
                        className="cursor-pointer hover:bg-[#fafafa] group"
                        onClick={() => toggleFamily(fam.stem)}
                      >
                        <td className="border-r border-b border-[#f0f0ee] px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {isExpanded
                              ? <ChevronUp className="w-3 h-3 text-[#a1a1a1] shrink-0" />
                              : <ChevronRight className="w-3 h-3 text-[#a1a1a1] shrink-0" />}
                            <div>
                              <p className="font-black text-[11px] font-mono text-[#0f0f0f]">{fam.name}</p>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {fam.provinces.slice(0, 3).map(p => (
                                  <span key={p} className="text-[7.5px] font-mono font-bold px-1 py-0.5 rounded" style={{ backgroundColor: provColor(p) + "22", color: provColor(p) }}>
                                    {p}
                                  </span>
                                ))}
                                {fam.isRecurring && (
                                  <span className="text-[7.5px] font-mono text-[#2b5346] bg-[#eef4f1] px-1 py-0.5 rounded">
                                    ↻ {fam.events.length}×
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {MONTH_SLOTS.map((mo, i) => {
                          const eventsInMo = fam.events.filter(e => e.eventMonth === mo);
                          const moSignups = eventsInMo.reduce((s, e) => s + e.totalSignups, 0);
                          const dotR = moSignups > 0
                            ? Math.max(8, Math.min(22, 6 + Math.sqrt(moSignups / maxFamilySignups) * 16))
                            : 0;
                          const color = fam.provinces.length === 1 ? provColor(fam.provinces[0]) : "#2b5346";
                          return (
                            <td
                              key={mo}
                              className={`border-b border-[#f0f0ee] text-center ${yearBounds.has(i) ? "border-l-2 border-l-[#d0d0d0]" : ""}`}
                              style={{ verticalAlign: "middle", height: 44 }}
                            >
                              {dotR > 0 && (
                                <div title={`${moSignups} signups`} className="mx-auto rounded-full flex items-center justify-center"
                                  style={{ width: dotR, height: dotR, backgroundColor: color, opacity: 0.82 }}>
                                  {dotR >= 16 && (
                                    <span style={{ fontSize: 7, color: "white", fontWeight: 900, fontFamily: "monospace" }}>
                                      {moSignups >= 1000 ? `${(moSignups / 1000).toFixed(1)}k` : moSignups}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-[#f0f0ee] text-right pr-3 py-2 shrink-0">
                          <span className="text-[11px] font-black font-mono text-[#1a1a1a]">{fam.totalSignups.toLocaleString()}</span>
                          <br />
                          <span className="text-[8px] font-mono text-[#a1a1a1]">{fam.events.length} event{fam.events.length !== 1 ? "s" : ""}</span>
                          {onCompareFamily && fam.isRecurring && fam.events.length >= 2 && (
                            <>
                              <br />
                              <button
                                onClick={e => { e.stopPropagation(); onCompareFamily(fam.events.map(ev => ev.code)); }}
                                className="text-[8px] font-mono text-[#2b5346] underline decoration-dotted cursor-pointer hover:text-[#1a3d2f]"
                              >
                                Compare
                              </button>
                            </>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail rows */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={MONTH_SLOTS.length + 2} className="bg-[#f8f7f5] border-b border-[#f0f0ee] px-4 py-3">
                            <div className="flex flex-col gap-2">
                              {/* Comparison table */}
                              <div className="grid gap-1.5">
                                {fam.events.map((ev, ei) => {
                                  const enriched = reportByCode.get(ev.code);
                                  const barPct = Math.max(4, (ev.totalSignups / fam.maxEvSignups) * 100);
                                  const color = enriched ? convGradeColor(enriched.calculatedConversion) : provColor(ev.homeProvince);
                                  const isPasted = isFilteredPaste && pastedSet.has(ev.code);
                                  return (
                                    <div key={ev.code}
                                      className="bg-white border border-[#ececec] rounded-lg px-4 py-2.5 flex items-center gap-4"
                                      style={{ opacity: isFilteredPaste && !isPasted ? 0.45 : 1 }}
                                    >
                                      <div className="flex items-center gap-2 min-w-0" style={{ width: 180 }}>
                                        {isPasted && <span className="text-[7px] font-mono text-[#2b5346] bg-[#eef4f1] px-1 py-0.5 rounded shrink-0">yours</span>}
                                        <span className="font-mono font-black text-[11px] text-[#0f0f0f] truncate">{ev.code}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0" style={{ width: 90 }}>
                                        <span className="text-[9px] font-mono text-[#888]">{ev.eventDateLabel}</span>
                                        <span className="text-[8px] font-mono" style={{ color: provColor(ev.homeProvince) }}>{ev.homeProvince}</span>
                                      </div>
                                      {enriched ? (
                                        <div className="flex items-center gap-3 shrink-0" style={{ width: 110 }}>
                                          <span className="text-[10px] font-semibold font-mono" style={{ color: convGradeColor(enriched.calculatedConversion) }}>
                                            {enriched.calculatedConversion.toFixed(1)}%
                                          </span>
                                          {enriched["Avg LTV 12"] > 0 && (
                                            <span className="text-[9.5px] font-mono text-[#888]">${enriched["Avg LTV 12"].toFixed(0)}</span>
                                          )}
                                        </div>
                                      ) : (
                                        <div style={{ width: 110 }} />
                                      )}
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="h-1.5 bg-[#eee] rounded-full overflow-hidden flex-1">
                                          <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.75 }} />
                                        </div>
                                        <span className="text-[10px] font-mono font-semibold text-[#3d3d3d] w-8 text-right shrink-0">{ev.totalSignups}</span>
                                      </div>
                                      {/* YoY badge for 2nd+ occurrences */}
                                      {ei > 0 && (() => {
                                        const prev = fam.events[ei - 1];
                                        const delta = ev.totalSignups - prev.totalSignups;
                                        const pct = prev.totalSignups > 0 ? Math.round((delta / prev.totalSignups) * 100) : 0;
                                        const up = delta >= 0;
                                        return (
                                          <span className="shrink-0 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                                            style={{ backgroundColor: up ? "#eef4f1" : "#fff0f0", color: up ? "#2b5346" : "#850b0b" }}>
                                            {up ? "↑" : "↓"}{Math.abs(pct)}%
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Summary delta across all occurrences */}
                              {fam.events.length >= 2 && (() => {
                                const first = fam.events[0];
                                const last = fam.events[fam.events.length - 1];
                                const delta = last.totalSignups - first.totalSignups;
                                const pct = first.totalSignups > 0 ? Math.round((delta / first.totalSignups) * 100) : 0;
                                return (
                                  <p className="text-[9px] font-mono text-[#a1a1a1] mt-0.5 pl-1">
                                    {last.code} vs {first.code}: {delta >= 0 ? "+" : ""}{delta} signups ({delta >= 0 ? "+" : ""}{pct}% vs first occurrence)
                                  </p>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ FOOTER: data coverage + upload ═════════════════════════ */}
      <div className="bg-[#fafaf8] border-t border-[#e8e8e8]">
        {/* Coverage row */}
        <div className="px-4 py-3 flex items-center gap-4 flex-wrap border-b border-[#f0f0ee]">
          <div className="flex items-center gap-2 shrink-0">
            <BarChart2 className="w-3 h-3 text-[#c0c0c0]" />
            <span className="text-[8px] font-mono uppercase tracking-widest text-[#b8b8b8]">Data coverage</span>
          </div>
          {[...coverageStats.years].reverse().map(y => {
            const yd = coverageStats.byYear[y];
            const isLatest = y === coverageStats.latestYear;
            const isYTD = isLatest && coverageStats.isYTD;
            return (
              <div key={y} className="flex items-baseline gap-1.5">
                <span className="text-[8.5px] font-mono text-[#b0b0b0]">{y}{isYTD ? " YTD" : ""}:</span>
                <span className="text-[12px] font-black font-mono text-[#1a1a1a]">{yd.signups.toLocaleString()}</span>
                <span className="text-[8px] font-mono text-[#c8c8c8]">sig · {yd.events} ev</span>
              </div>
            );
          })}
          {coverageStats.years.length >= 2 && !coverageStats.isYTD && (() => {
            const yrs = coverageStats.years;
            const prev = coverageStats.byYear[yrs[yrs.length - 2]];
            const curr = coverageStats.byYear[yrs[yrs.length - 1]];
            if (!prev || !curr || curr.signups < 50) return null;
            const delta = curr.signups - prev.signups;
            const pct = prev.signups > 0 ? Math.round((delta / prev.signups) * 100) : 0;
            const up = delta >= 0;
            return (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-mono font-semibold"
                style={{ backgroundColor: up ? "#eef4f1" : "#fff0f0", color: up ? "#2b5346" : "#850b0b" }}>
                {up ? "↑" : "↓"} {Math.abs(pct)}% YoY
              </span>
            );
          })()}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <CalendarDays className="w-3 h-3 text-[#d0d0d0]" />
            <span className="text-[8.5px] font-mono text-[#c0c0c0]">{dateRangeLabel}</span>
          </div>
        </div>

        {/* Province × year breakdown */}
        {provinceYearStats.rows.length > 0 && (
          <div className="px-4 py-3 border-b border-[#f0f0ee]">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `80px repeat(${provinceYearStats.years.length}, 1fr) 72px` }}>
              <div />
              {[...provinceYearStats.years].reverse().map(y => {
                const isLatest = y === coverageStats.latestYear;
                const isYTD = isLatest && coverageStats.isYTD;
                return (
                  <div key={y} className="text-right text-[8px] font-mono text-[#b0b0b0] uppercase tracking-wide pb-1 border-b border-[#f0f0ee]">
                    {y}{isYTD ? " YTD" : ""}
                  </div>
                );
              })}
              <div className="text-right text-[8px] font-mono text-[#b0b0b0] uppercase tracking-wide pb-1 border-b border-[#f0f0ee]">Total</div>
              {provinceYearStats.rows.map(row => {
                const barPct = (row.total / provinceYearStats.maxTotal) * 100;
                return (
                  <React.Fragment key={row.prov}>
                    <div className="flex items-center gap-2 pr-2">
                      <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: provColor(row.prov) }}>{row.prov}</span>
                      <div className="flex-1 h-1 bg-[#f0f0ee] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: provColor(row.prov), opacity: 0.5 }} />
                      </div>
                    </div>
                    {[...provinceYearStats.years].reverse().map(y => {
                      const n = row.byYear[y] ?? 0;
                      const ev = row.eventsByYear[y] ?? 0;
                      const isLatest = y === coverageStats.latestYear;
                      const yIdx = provinceYearStats.years.indexOf(y);
                      const prevY = yIdx > 0 ? provinceYearStats.years[yIdx - 1] : null;
                      const prevN = prevY ? (row.byYear[prevY] ?? 0) : null;
                      const delta = prevN !== null && prevN > 0 && !(isLatest && coverageStats.isYTD)
                        ? Math.round(((n - prevN) / prevN) * 100) : null;
                      return (
                        <div key={y} className="text-right">
                          {n > 0 ? (
                            <>
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-[10.5px] font-black font-mono" style={{ color: isLatest ? "#1a1a1a" : "#999" }}>{n.toLocaleString()}</span>
                                {delta !== null && (
                                  <span className="text-[7.5px] font-mono" style={{ color: delta >= 0 ? "#2b5346" : "#850b0b" }}>
                                    {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}%
                                  </span>
                                )}
                              </div>
                              {ev > 0 && <div className="text-[7.5px] font-mono text-[#c0c0c0]">{ev} ev</div>}
                            </>
                          ) : (
                            <span className="text-[#e0e0e0] text-[11px] font-mono">—</span>
                          )}
                        </div>
                      );
                    })}
                    <div className="text-right">
                      <div className="text-[10.5px] font-black font-mono text-[#1a1a1a]">{row.total.toLocaleString()}</div>
                      {row.totalEvents > 0 && <div className="text-[7.5px] font-mono text-[#c0c0c0]">{row.totalEvents} ev</div>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload panel */}
        {showUpload && (
          <div className="bg-white border-t border-[#e8e8e8]">
            <div className="px-5 pt-5 pb-4 border-b border-[#f5f5f3]">
              <p className="text-[11px] font-black text-[#0f0f0f]">Upload the Exportable Client List from Looker Studio</p>
              <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">
                Built-in data covers {dateRangeLabel}. Export a fresh Exportable Client List to extend the calendar to today.
              </p>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 gap-3 sm:grid-cols-2 border-b border-[#f5f5f3]">
              {LOOKER_STEPS.map(s => (
                <div key={s.step} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black font-mono text-white mt-0.5"
                    style={{ backgroundColor: "#2b5346" }}>{s.step}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-[#1a1a1a]">{s.title}</p>
                    <p className="text-[10px] text-[#888] leading-relaxed mt-0.5">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-b border-[#f5f5f3]">
              <div
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2.5 cursor-pointer transition-colors"
                style={isDragOver ? { borderColor: "#2b5346", backgroundColor: "#eef4f1" } : { borderColor: "#e5e5e5", backgroundColor: "#fafafa" }}>
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
            <div className="px-5 py-4">
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-2.5">Expected columns</p>
              <div className="grid grid-cols-1 gap-0 divide-y divide-[#f5f5f3] border border-[#f0f0ee] rounded-xl overflow-hidden sm:grid-cols-2 sm:divide-y-0">
                {EXPECTED_COLS.map(col => (
                  <div key={col.name} className="flex items-baseline gap-2.5 px-3 py-2 bg-white border-b border-[#f5f5f3]">
                    <span className="font-mono text-[10px] text-[#2b5346] font-semibold shrink-0 w-36">{col.name}</span>
                    <span className="text-[10px] text-[#a1a1a1] leading-snug">{col.note}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] font-mono text-[#c8c8c8] mt-2.5">Parsed client-side · no data leaves your browser</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
