import React, { useMemo, useState } from "react";
import { CalendarRange, FileText, ListChecks, MapPin, Printer, TrendingUp, Users } from "lucide-react";
import { EventStats, ProvinceTotals } from "../../../hooks/useCustomerData";
import { useEventSchedule, EventSchedule } from "../../../hooks/useEventSchedule";
import { BUILTIN_DB_RANGE_LABEL } from "../../../config/builtinDb";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const pc = (p: string) => PROV_COLOR[p] ?? "#888";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMk = (mk: string) => mk && mk.length >= 7 ? `${MONTHS[Number(mk.slice(5, 7)) - 1]} ${mk.slice(0, 4)}` : "—";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (v: number, dec = 0) => `$${v.toLocaleString("en-CA", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

interface ReportSections {
  kpis: boolean;
  monthly: boolean;
  provinces: boolean;
  events: boolean;
  status: boolean;
}

interface ReportScope {
  mode: "filter" | "codes";
  scopeLine: string;
  events: EventStats[];
  missingCodes: string[];
}

// ── Document generation ─────────────────────────────────────────────────────

function generateReportHtml(
  title: string,
  preparedBy: string,
  sections: ReportSections,
  scope: ReportScope,
  schedule: EventSchedule,
): string {
  const evs = [...scope.events].sort((a, b) => b.totalSignups - a.totalSignups);
  const totalSignups = evs.reduce((s, e) => s + e.totalSignups, 0);
  const totalPaying = evs.reduce((s, e) => s + e.payingSignups, 0);
  const conv = totalSignups > 0 ? (totalPaying / totalSignups) * 100 : 0;
  const medDays = (() => {
    const ds = evs.map(e => e.medianDaysToPay).filter((d): d is number => d !== null).sort((a, b) => a - b);
    if (!ds.length) return null;
    const mid = Math.floor(ds.length / 2);
    return ds.length % 2 ? ds[mid] : (ds[mid - 1] + ds[mid]) / 2;
  })();
  const costed = evs.filter(e => schedule[e.code]?.totalSpend != null);
  const totalSpend = costed.reduce((s, e) => s + (schedule[e.code].totalSpend ?? 0), 0);
  const costedSignups = costed.reduce((s, e) => s + e.totalSignups, 0);
  const costedPaying = costed.reduce((s, e) => s + e.payingSignups, 0);
  const preExisting = evs.reduce((s, e) => s + e.preExistingAccounts, 0);
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  // KPI band
  const kpi = (label: string, value: string, sub: string, accent = "#2b5346") => `
    <div class="kpi" style="border-top-color:${accent}">
      <div class="kpi-label">${esc(label)}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">${esc(sub)}</div>
    </div>`;
  const kpiHtml = !sections.kpis ? "" : `
  <div class="section">
    <div class="section-hdr"><span class="section-title">Executive Summary</span><div class="section-line"></div></div>
    <div class="kpi-row">
      ${kpi("Events", evs.length.toLocaleString(), scope.mode === "codes" ? "selected codes" : "in scope")}
      ${kpi("Signups", totalSignups.toLocaleString(), "total signups")}
      ${kpi("Paying Customers", totalPaying.toLocaleString(), `${conv.toFixed(1)}% blended conversion`, "#4d8970")}
      ${medDays !== null ? kpi("Days to Pay", String(Math.round(medDays)), "median across events", "#6b8e9f") : ""}
      ${costed.length > 0 ? kpi("Event Spend", money(totalSpend), `costs known for ${costed.length} of ${evs.length} events`, "#c9a000") : ""}
      ${costed.length > 0 && costedPaying > 0 ? kpi("Cost / Paying Cx", money(totalSpend / costedPaying, 2), `${money(costedSignups > 0 ? totalSpend / costedSignups : 0, 2)} per signup`, "#9b4a1c") : ""}
    </div>
  </div>`;

  // Monthly trend (recent first)
  const monthlyHtml = (() => {
    if (!sections.monthly) return "";
    const byMonth = new Map<string, { events: number; signups: number; paying: number }>();
    for (const e of evs) {
      if (!e.eventMonth) continue;
      const m = byMonth.get(e.eventMonth) ?? { events: 0, signups: 0, paying: 0 };
      byMonth.set(e.eventMonth, { events: m.events + 1, signups: m.signups + e.totalSignups, paying: m.paying + e.payingSignups });
    }
    if (byMonth.size < 2) return "";
    const months = Array.from(byMonth.keys()).sort().reverse();
    const maxSig = Math.max(1, ...Array.from(byMonth.values()).map(m => m.signups));
    const rows = months.map((mk, i) => {
      const m = byMonth.get(mk)!;
      const w = (m.signups / maxSig) * 100;
      return `<tr class="${i % 2 ? "row-alt" : ""}">
        <td class="label-cell">${fmtMk(mk)}</td>
        <td class="right muted-cell">${m.events}</td>
        <td class="right bold-cell">${m.signups.toLocaleString()}</td>
        <td class="bar-cell"><div class="bar" style="width:${w}%"></div></td>
        <td class="right muted-cell">${m.paying.toLocaleString()}</td>
        <td class="right bold-cell" style="color:#4d8970">${m.signups > 0 ? ((m.paying / m.signups) * 100).toFixed(0) : 0}%</td>
      </tr>`;
    }).join("");
    return `
  <div class="section">
    <div class="section-hdr"><span class="section-title">Monthly Trend</span><div class="section-line"></div><span class="section-sub">most recent first</span></div>
    <table>
      <thead><tr class="thead-row"><th>Month</th><th class="right">Events</th><th class="right">Signups</th><th style="width:26%"></th><th class="right">Paying</th><th class="right">Conv.</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  })();

  // Province split
  const provHtml = (() => {
    if (!sections.provinces) return "";
    const byProv = new Map<string, { events: number; signups: number; paying: number }>();
    for (const e of evs) {
      const p = e.homeProvince || "??";
      const m = byProv.get(p) ?? { events: 0, signups: 0, paying: 0 };
      byProv.set(p, { events: m.events + 1, signups: m.signups + e.totalSignups, paying: m.paying + e.payingSignups });
    }
    if (byProv.size < 2) return "";
    const provs = Array.from(byProv.entries()).sort((a, b) => b[1].signups - a[1].signups);
    const rows = provs.map(([p, m], i) => `<tr class="${i % 2 ? "row-alt" : ""}">
      <td><span class="prov-badge" style="color:${pc(p)};border-color:${pc(p)}40;background:${pc(p)}12">${esc(p)}</span></td>
      <td class="right muted-cell">${m.events}</td>
      <td class="right bold-cell">${m.signups.toLocaleString()}</td>
      <td class="right muted-cell">${totalSignups > 0 ? ((m.signups / totalSignups) * 100).toFixed(0) : 0}%</td>
      <td class="right muted-cell">${m.paying.toLocaleString()}</td>
      <td class="right bold-cell" style="color:#4d8970">${m.signups > 0 ? ((m.paying / m.signups) * 100).toFixed(0) : 0}%</td>
    </tr>`).join("");
    return `
  <div class="section">
    <div class="section-hdr"><span class="section-title">By Province</span><div class="section-line"></div></div>
    <table>
      <thead><tr class="thead-row"><th>Province</th><th class="right">Events</th><th class="right">Signups</th><th class="right">Share</th><th class="right">Paying</th><th class="right">Conv.</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  })();

  // Event table (top 100 by signups)
  const eventsHtml = (() => {
    if (!sections.events || evs.length === 0) return "";
    const shown = evs.slice(0, 100);
    const anySpend = shown.some(e => schedule[e.code]?.totalSpend != null);
    const rows = shown.map((e, i) => {
      const meta = schedule[e.code];
      const spend = meta?.totalSpend ?? null;
      const perPaying = spend != null && e.payingSignups > 0 ? spend / e.payingSignups : null;
      return `<tr class="${i % 2 ? "row-alt" : ""}">
        <td class="rank-cell">${i + 1}</td>
        <td>
          <div class="code-cell">${esc(e.code)}${e.preExistingAccounts > 0 ? `<span class="flag">†${e.preExistingAccounts}</span>` : ""}</div>
          ${meta ? `<div class="name-cell">${esc(meta.name)}</div>` : ""}
        </td>
        <td class="muted-cell">${fmtMk(e.eventMonth)}</td>
        <td><span class="prov-badge" style="color:${pc(e.homeProvince)};border-color:${pc(e.homeProvince)}40;background:${pc(e.homeProvince)}12">${esc(e.homeProvince)}</span></td>
        <td class="right bold-cell">${e.totalSignups.toLocaleString()}</td>
        <td class="right muted-cell">${e.payingSignups.toLocaleString()}</td>
        <td class="right bold-cell" style="color:#4d8970">${(e.conversionRate * 100).toFixed(0)}%</td>
        ${anySpend ? `<td class="right muted-cell">${spend != null ? money(spend) : "—"}</td>
        <td class="right muted-cell">${perPaying != null ? money(perPaying, 2) : "—"}</td>` : ""}
      </tr>`;
    }).join("");
    return `
  <div class="section page-break">
    <div class="section-hdr"><span class="section-title">Events · ranked by signups</span><div class="section-line"></div>${evs.length > 100 ? `<span class="section-sub">top 100 of ${evs.length} — totals above include all</span>` : ""}</div>
    <table>
      <thead><tr class="thead-row"><th style="width:18px">#</th><th>Code / Event</th><th>Month</th><th>Prov</th><th class="right">Signups</th><th class="right">Paying</th><th class="right">Conv.</th>${anySpend ? `<th class="right">Spend</th><th class="right">$/Paying</th>` : ""}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  })();

  // Status snapshot
  const statusHtml = (() => {
    if (!sections.status) return "";
    const t = evs.reduce((acc, e) => ({
      active: acc.active + e.statusCounts.active,
      paused: acc.paused + e.statusCounts.paused,
      closed: acc.closed + e.statusCounts.closed,
    }), { active: 0, paused: 0, closed: 0 });
    return `
  <div class="section">
    <div class="section-hdr"><span class="section-title">Customer Status Today</span><div class="section-line"></div></div>
    <div class="status-row">
      <span class="status-chip" style="background:#eef4f1;color:#2b5346">${t.active.toLocaleString()} active</span>
      <span class="status-chip" style="background:#fffbeb;color:#8a6f00">${t.paused.toLocaleString()} paused</span>
      <span class="status-chip" style="background:#f5f5f4;color:#5a5a5a">${t.closed.toLocaleString()} closed</span>
      ${preExisting > 0 ? `<span class="status-note">† ${preExisting.toLocaleString()} signup${preExisting !== 1 ? "s were" : " was"} on accounts created 90+ days before the event (existing customers)</span>` : ""}
    </div>
  </div>`;
  })();

  const missingHtml = scope.missingCodes.length === 0 ? "" : `
  <div class="section">
    <div class="callout">Codes not found in the dataset: ${scope.missingCodes.map(esc).join(", ")}</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:letter;margin:14mm 12mm 18mm}
body{font-family:'DM Sans',sans-serif;color:#0f0f0f;background:#fff;font-size:11px;line-height:1.5;padding:28px}
@media print{body{padding:0}}
.letterhead{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #2b5346;position:relative}
.letterhead:after{content:"";position:absolute;bottom:-7px;left:0;width:64px;height:3px;background:#e7bd27}
.logo{height:30px}
.letterhead-right{text-align:right;font-family:'DM Mono',monospace;font-size:8.5px;text-transform:uppercase;letter-spacing:.14em;color:#a1a1a1;line-height:1.9}
.letterhead-right .strong{color:#2b5346;font-weight:700}
.titleblock{padding:26px 0 8px}
.title{font-size:27px;font-weight:900;letter-spacing:-.02em;color:#0f0f0f;line-height:1.05}
.scope-line{font-family:'DM Mono',monospace;font-size:9px;color:#888;margin-top:8px;text-transform:uppercase;letter-spacing:.14em}
.section{margin-top:22px}
.section-hdr{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.section-title{font-size:8.5px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.2em;color:#a1a1a1;white-space:nowrap}
.section-line{flex:1;height:1px;background:#ececea}
.section-sub{font-size:8px;font-family:'DM Mono',monospace;color:#c0c0c0;white-space:nowrap}
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.kpi{border:1px solid #ececea;border-top:3px solid #2b5346;border-radius:8px;padding:12px 14px;background:#fdfdfc}
.kpi-label{font-size:7.5px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.18em;color:#a1a1a1;margin-bottom:7px}
.kpi-value{font-size:22px;font-weight:900;font-family:'DM Mono',monospace;color:#0f0f0f;line-height:1}
.kpi-sub{font-size:8.5px;font-family:'DM Mono',monospace;color:#888;margin-top:5px}
table{width:100%;border-collapse:collapse;border:1px solid #ececea;border-radius:8px;overflow:hidden}
.thead-row th{font-family:'DM Mono',monospace;font-size:7.5px;text-transform:uppercase;letter-spacing:.15em;color:#a1a1a1;padding:8px 10px;background:#fafaf9;border-bottom:1px solid #f0f0ee;text-align:left}
.thead-row th.right{text-align:right}
td{padding:7px 10px;font-size:10px;border-bottom:1px solid #f6f6f4;vertical-align:top}
.right{text-align:right}
.row-alt td{background:#fcfcfb}
.label-cell{font-weight:700;color:#3d3d3d}
.bold-cell{font-family:'DM Mono',monospace;font-weight:700;color:#0f0f0f}
.muted-cell{font-family:'DM Mono',monospace;color:#888}
.rank-cell{font-family:'DM Mono',monospace;color:#c9c7c2;font-size:9px}
.code-cell{font-family:'DM Mono',monospace;font-weight:700;color:#0f0f0f}
.name-cell{font-size:9px;color:#888;margin-top:1px}
.flag{font-size:8px;color:#9b4a1c;margin-left:4px;font-weight:400}
.bar-cell{width:26%;vertical-align:middle}
.bar{height:7px;border-radius:0 4px 4px 0;background:#2b5346;min-width:2px}
.prov-badge{font-family:'DM Mono',monospace;font-size:8.5px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid;display:inline-block}
.status-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.status-chip{font-family:'DM Mono',monospace;font-size:9.5px;font-weight:700;padding:5px 12px;border-radius:99px}
.status-note{font-family:'DM Mono',monospace;font-size:8.5px;color:#9b4a1c}
.callout{border:1px solid #f5e09a;background:#fffbeb;color:#8a6f00;font-family:'DM Mono',monospace;font-size:9px;padding:10px 12px;border-radius:8px}
.methodology{margin-top:26px;padding-top:12px;border-top:1px solid #ececea;font-family:'DM Mono',monospace;font-size:8px;color:#b0b0b0;line-height:1.8}
.doc-footer{position:fixed;bottom:0;left:0;right:0;display:none;justify-content:space-between;font-family:'DM Mono',monospace;font-size:7.5px;text-transform:uppercase;letter-spacing:.16em;color:#c0c0c0;padding:0 2px}
@media print{.doc-footer{display:flex}.page-break{break-before:page}.section{break-inside:auto}tr{break-inside:avoid}}
</style>
</head>
<body>
  <div class="letterhead">
    <img class="logo" src="https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format" alt="FreshPrep" />
    <div class="letterhead-right">
      <div class="strong">Business Development</div>
      <div>Generated ${esc(today)}</div>
      ${preparedBy ? `<div>Prepared by ${esc(preparedBy)}</div>` : ""}
    </div>
  </div>
  <div class="titleblock">
    <div class="title">${esc(title)}</div>
    <div class="scope-line">${esc(scope.scopeLine)} · Source: Built-in BD Events DB (${esc(BUILTIN_DB_RANGE_LABEL)})</div>
  </div>
  ${kpiHtml}
  ${monthlyHtml}
  ${provHtml}
  ${statusHtml}
  ${eventsHtml}
  ${missingHtml}
  <div class="methodology">
    Definitions — Paying customer: signup whose funnel reached “Paying Customer” or has a first paying date. Conversion: paying ÷ signups.
    Days to pay: median days from signup to first payment. † Existing accounts: created 90+ days before the event’s peak month.
    Event names, teams and spend come from the BD event wrap-up spreadsheet where available. Confidential — internal use only.
  </div>
  <div class="doc-footer"><span>FreshPrep · Business Development · Confidential</span><span>${esc(title)}</span></div>
</body>
</html>`;
}

// ── Builder UI ──────────────────────────────────────────────────────────────

interface ReportBuilderTabProps {
  eventStats: EventStats[];
  provinceTotals?: ProvinceTotals;
}

export function ReportBuilderTab({ eventStats }: ReportBuilderTabProps): React.ReactElement {
  const eventSchedule = useEventSchedule();

  const allProvs = useMemo(() => {
    const vol = new Map<string, number>();
    for (const e of eventStats) {
      if (!e.homeProvince || e.homeProvince === "??") continue;
      vol.set(e.homeProvince, (vol.get(e.homeProvince) ?? 0) + e.totalSignups);
    }
    return Array.from(vol.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [eventStats]);

  const monthBounds = useMemo(() => {
    const months = eventStats.map(e => e.eventMonth).filter(Boolean).sort();
    return { min: months[0] ?? "2024-07", max: months[months.length - 1] ?? "2026-07" };
  }, [eventStats]);

  const [mode, setMode] = useState<"filter" | "codes">("filter");
  const [selProvs, setSelProvs] = useState<Set<string>>(() => new Set(allProvs));
  const [fromMonth, setFromMonth] = useState(monthBounds.min);
  const [toMonth, setToMonth] = useState(monthBounds.max);
  const [codesText, setCodesText] = useState("");
  const [title, setTitle] = useState("BD Events Report");
  const [preparedBy, setPreparedBy] = useState("");
  const [sections, setSections] = useState<ReportSections>({
    kpis: true, monthly: true, provinces: true, events: true, status: true,
  });

  const toggleProv = (p: string) => {
    setSelProvs(prev => {
      const next = new Set(prev);
      if (next.has(p) && next.size === 1) return prev;
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const scope = useMemo((): ReportScope => {
    if (mode === "codes") {
      const wanted = Array.from(new Set(
        codesText.split("\n").map(l => l.trim().toUpperCase()).filter(Boolean),
      ));
      const byCode = new Map(eventStats.map(e => [e.code.toUpperCase(), e]));
      const events = wanted.map(c => byCode.get(c)).filter((e): e is EventStats => !!e);
      const missingCodes = wanted.filter(c => !byCode.has(c));
      return {
        mode,
        scopeLine: `${wanted.length} selected code${wanted.length !== 1 ? "s" : ""}`,
        events,
        missingCodes,
      };
    }
    const lo = fromMonth <= toMonth ? fromMonth : toMonth;
    const hi = fromMonth <= toMonth ? toMonth : fromMonth;
    const events = eventStats.filter(e =>
      selProvs.has(e.homeProvince) && e.eventMonth >= lo && e.eventMonth <= hi,
    );
    const provLabel = selProvs.size === allProvs.length ? "All provinces" : Array.from(selProvs).join(", ");
    return {
      mode,
      scopeLine: `${provLabel} · ${fmtMk(lo)} – ${fmtMk(hi)}`,
      events,
      missingCodes: [],
    };
  }, [mode, codesText, fromMonth, toMonth, selProvs, eventStats, allProvs]);

  const preview = useMemo(() => {
    const signups = scope.events.reduce((s, e) => s + e.totalSignups, 0);
    const paying = scope.events.reduce((s, e) => s + e.payingSignups, 0);
    return { signups, paying, conv: signups > 0 ? (paying / signups) * 100 : 0 };
  }, [scope]);

  const handleGenerate = () => {
    const html = generateReportHtml(title.trim() || "BD Events Report", preparedBy.trim(), sections, scope, eventSchedule);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch { /* window closed */ } }, 900);
  };

  const inputCls = "w-full h-10 px-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-sm text-[#1a1a1a] outline-none focus:border-[#2b5346] focus:bg-white";

  return (
    <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 max-w-4xl mx-auto w-full">

      {/* Header */}
      <div className="rounded-2xl px-5 py-5 md:px-7 md:py-6 animate-slide-up-in" style={{ background: "#2b5346" }}>
        <p className="text-[8px] font-mono uppercase tracking-[0.28em] text-white/40 mb-1.5">BD Report Builder</p>
        <h2 className="text-[22px] md:text-[26px] font-black text-white leading-none tracking-tight">Generate a branded report</h2>
        <p className="text-[10px] font-mono text-white/45 mt-2">
          Pick a scope, generate, then “Save as PDF” in the print dialog. FreshPrep letterhead included.
        </p>
      </div>

      {/* ── Scope ── */}
      <section className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Step 1</p>
            <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5">What goes in the report?</h3>
          </div>
          <div className="flex rounded-xl border border-[#e5e5e5] overflow-hidden">
            {([
              ["filter", "Provinces & dates", CalendarRange],
              ["codes", "Paste codes", ListChecks],
            ] as const).map(([m, label, Icon]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex items-center gap-1.5 px-3.5 text-[11px] font-semibold cursor-pointer transition-colors"
                style={{
                  minHeight: 40,
                  backgroundColor: mode === m ? "#2b5346" : "#fff",
                  color: mode === m ? "#fff" : "#888",
                }}
                aria-pressed={mode === m}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "filter" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="w-3.5 h-3.5 text-[#a1a1a1]" />
              {allProvs.map(p => {
                const active = selProvs.has(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleProv(p)}
                    className="px-3 rounded-full text-[11px] font-black font-mono cursor-pointer border transition-all tap-scale"
                    style={{
                      minHeight: 36,
                      color: active ? "#fff" : pc(p),
                      backgroundColor: active ? pc(p) : pc(p) + "14",
                      borderColor: pc(p) + (active ? "ff" : "40"),
                    }}
                    aria-pressed={active}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-[10px] font-mono text-[#888]">
                From
                <input
                  type="month" value={fromMonth} min={monthBounds.min} max={monthBounds.max}
                  onChange={e => setFromMonth(e.target.value || monthBounds.min)}
                  className={inputCls} style={{ width: 160 }}
                />
              </label>
              <label className="flex items-center gap-2 text-[10px] font-mono text-[#888]">
                To
                <input
                  type="month" value={toMonth} min={monthBounds.min} max={monthBounds.max}
                  onChange={e => setToMonth(e.target.value || monthBounds.max)}
                  className={inputCls} style={{ width: 160 }}
                />
              </label>
              <button
                type="button"
                onClick={() => { setFromMonth(monthBounds.min); setToMonth(monthBounds.max); }}
                className="text-[10px] font-mono text-[#2b5346] hover:underline cursor-pointer"
              >
                Reset to full range
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={codesText}
              onChange={e => setCodesText(e.target.value)}
              rows={8}
              placeholder={"One code per line, e.g.\nEVSTAMPEDE26\nBDVENNGO\nEVCHFRASERVALLEY"}
              className="w-full px-3 py-2.5 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-sm font-mono text-[#1a1a1a] outline-none focus:border-[#2b5346] focus:bg-white resize-y"
              spellCheck={false}
            />
            <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap">
              <span className="text-[#2b5346] font-bold">{scope.events.length} found</span>
              {scope.missingCodes.length > 0 && (
                <span className="text-[#9b4a1c]">
                  {scope.missingCodes.length} not in dataset: {scope.missingCodes.slice(0, 6).join(", ")}{scope.missingCodes.length > 6 ? "…" : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Options ── */}
      <section className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-5 flex flex-col gap-4">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Step 2</p>
          <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5">Report details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[10px] font-mono text-[#888]">
            Report title
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} maxLength={80} />
          </label>
          <label className="flex flex-col gap-1.5 text-[10px] font-mono text-[#888]">
            Prepared by (optional)
            <input type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} className={inputCls} maxLength={60} placeholder="Your name / team" />
          </label>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {([
            ["kpis", "Executive summary"],
            ["monthly", "Monthly trend"],
            ["provinces", "Province split"],
            ["status", "Status snapshot"],
            ["events", "Event table"],
          ] as const).map(([key, label]) => {
            const on = sections[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSections(s => ({ ...s, [key]: !s[key] }))}
                className="px-3 rounded-full text-[10px] font-semibold cursor-pointer border transition-all"
                style={{
                  minHeight: 34,
                  backgroundColor: on ? "#eef4f1" : "#fff",
                  color: on ? "#2b5346" : "#b0b0b0",
                  borderColor: on ? "#2b5346" : "#e5e5e5",
                }}
                aria-pressed={on}
              >
                {on ? "✓ " : ""}{label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Preview + generate ── */}
      <section className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm p-5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-5 flex-1 flex-wrap">
          <div>
            <p className="text-lg font-black font-mono text-[#0f0f0f] leading-none">{scope.events.length.toLocaleString()}</p>
            <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1] mt-1">events</p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2b5346]" />
            <div>
              <p className="text-lg font-black font-mono text-[#0f0f0f] leading-none">{preview.signups.toLocaleString()}</p>
              <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1] mt-1">signups</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#4d8970]" />
            <div>
              <p className="text-lg font-black font-mono text-[#2b5346] leading-none">
                {preview.paying.toLocaleString()}
                <span className="text-[11px] text-[#4d8970] ml-1">{preview.conv.toFixed(0)}%</span>
              </p>
              <p className="text-[8.5px] font-mono uppercase tracking-wide text-[#a1a1a1] mt-1">paying · conversion</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={scope.events.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer text-white transition-colors tap-scale disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#2b5346", minHeight: 48 }}
        >
          <Printer className="w-4 h-4" />
          Generate report
        </button>
      </section>

      <p className="text-[9px] font-mono text-[#b0b0b0] flex items-center gap-1.5">
        <FileText className="w-3 h-3" />
        Opens print-ready in a new tab — choose “Save as PDF” as the destination.
      </p>
    </div>
  );
}
