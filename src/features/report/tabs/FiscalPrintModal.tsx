import React, { useState, useMemo } from "react";
import { X, Printer, FileText } from "lucide-react";
import { AnalyzedCodeReport } from "../../../types";
import { EventStats } from "../../../hooks/useCustomerData";

// ── Local helpers ──────────────────────────────────────────────────────────

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const pc = (p: string) => PROV_COLOR[p] ?? "#888";

function fmtBig(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}
function currency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}
function yoyBadge(curr: number, prev: number): string {
  if (!prev) return "";
  const p = Math.round(((curr - prev) / prev) * 100);
  const cls = p >= 0 ? "delta-up" : "delta-down";
  return `<span class="${cls}">${p >= 0 ? "↑" : "↓"}${Math.abs(p)}%</span>`;
}
function fyRange(fy: string): string {
  const end = Number(fy.slice(2));
  return `Jul ${end - 1} – Jun ${end}`;
}
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtMk(mk: string): string {
  return `${MONTHS[Number(mk.slice(5)) - 1]} ${mk.slice(0, 4)}`;
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface PrintVolume {
  byYear: Record<string, { events: number; signups: number }>;
  years: string[];
  eventListByFY: Record<string, EventStats[]>;
  signupsByProv: Record<string, number>;
  signupsByProvByFY: Record<string, Record<string, number>>;
  eventsByProvByFY: Record<string, Record<string, number>>;
  eventsByProvYTD: Record<string, number>;
  signupsByProvYTD: Record<string, number>;
  ytdSignupsByFY: Record<string, number>;
  totalEvents: number;
  totalSignups: number;
  latestYear: string;
  prevYear: string | null;
}

export interface PrintFinancials {
  totalSignups: number;
  totalPaying: number;
  blendedConv: number;
  avgConv: number;
  totalLTV12: number;
  avgLTV12: number;
  hasCost: boolean;
  totalSpend: number;
  cpaSignup: number | null;
  cpaPaying: number | null;
  revToSpend: number | null;
  topSignups: AnalyzedCodeReport[];
  topConv: AnalyzedCodeReport[];
  topLTV: AnalyzedCodeReport[];
}

interface PrintOpts {
  title: string;
  preparedBy: string;
  sections: {
    volumeKpis: boolean;
    fyofy: boolean;
    byProvince: boolean;
    financials: boolean;
    topPerformers: boolean;
    codesList: boolean;
  };
  provinces: string[];  // empty = all
  years: string[];      // empty = all
}

interface FiscalPrintModalProps {
  onClose: () => void;
  volume: PrintVolume;
  financials: PrintFinancials | null;
  allProvs: string[];
  dateRangeLabel: string;
  currentFY: string;
  nowMk: string;
  showYTD: boolean;
}

// ── HTML generation ────────────────────────────────────────────────────────

function generatePrintHtml(
  opts: PrintOpts,
  volume: PrintVolume,
  financials: PrintFinancials | null,
  showYTD: boolean,
  nowMk: string,
): string {
  const selProvs = opts.provinces.length > 0 ? opts.provinces : null; // null = all
  const selYears = opts.years.length > 0
    ? volume.years.filter(y => opts.years.includes(y))
    : volume.years;

  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const title = esc(opts.title) || "BD Fiscal Report";
  const preparedBy = esc(opts.preparedBy);

  // ── KPI section ──────────────────────────────────────────────────────────
  const latestFY   = selYears[selYears.length - 1] ?? volume.latestYear;
  const prevFY     = selYears.length >= 2 ? selYears[selYears.length - 2] : null;
  const evCount    = selYears.reduce((s, y) => s + (volume.byYear[y]?.events ?? 0), 0);
  const sigCount   = selYears.reduce((s, y) => s + (volume.byYear[y]?.signups ?? 0), 0);

  const kpiHtml = !opts.sections.volumeKpis ? "" : `
  <div class="section">
    <div class="section-hdr"><span class="section-title">Event Volume</span><div class="section-line"></div></div>
    <div class="kpi-row">
      <div class="kpi-card accent-green">
        <div class="kpi-label">Unique BD Events</div>
        <div class="kpi-value">${evCount.toLocaleString()}</div>
        <div class="kpi-sub">${selYears.length} fiscal year${selYears.length !== 1 ? "s" : ""}</div>
      </div>
      <div class="kpi-card accent-green">
        <div class="kpi-label">Total Signups</div>
        <div class="kpi-value">${fmtBig(sigCount)}</div>
        <div class="kpi-sub">BD event signups${selProvs ? ` · ${selProvs.join(", ")}` : ""}</div>
      </div>
      ${financials ? `
      <div class="kpi-card accent-amber">
        <div class="kpi-label">Paying Customers</div>
        <div class="kpi-value">${fmtBig(financials.totalPaying)}</div>
        <div class="kpi-sub">${financials.blendedConv.toFixed(1)}% blended conversion</div>
      </div>
      <div class="kpi-card accent-amber">
        <div class="kpi-label">Avg LTV 12-mo</div>
        <div class="kpi-value">${currency(financials.avgLTV12)}</div>
        <div class="kpi-sub">per paying customer</div>
      </div>
      ` : `
      <div class="kpi-card">
        <div class="kpi-label">${latestFY} Signups</div>
        <div class="kpi-value">${fmtBig(volume.byYear[latestFY]?.signups ?? 0)}</div>
        <div class="kpi-sub">${volume.byYear[latestFY]?.events ?? 0} events</div>
      </div>
      ${prevFY ? `
      <div class="kpi-card">
        <div class="kpi-label">${prevFY} Signups</div>
        <div class="kpi-value">${fmtBig(volume.byYear[prevFY]?.signups ?? 0)}</div>
        <div class="kpi-sub">${volume.byYear[prevFY]?.events ?? 0} events</div>
      </div>` : ""}
      `}
    </div>
  </div>`;

  // ── FY over Year ─────────────────────────────────────────────────────────
  const fyofyHtml = (!opts.sections.fyofy || selYears.length < 2) ? "" : (() => {
    const rows = [
      { label: "Event Codes", vals: selYears.map(y => (volume.byYear[y]?.events ?? 0).toLocaleString()), raws: selYears.map(y => volume.byYear[y]?.events ?? 0) },
      { label: "Signups",     vals: selYears.map(y => fmtBig(volume.byYear[y]?.signups ?? 0)), raws: selYears.map(y => volume.byYear[y]?.signups ?? 0) },
    ];
    if (showYTD && selYears.includes(latestFY)) {
      rows.push({ label: `YTD (thru ${fmtMk(nowMk)})`, vals: selYears.map(y => fmtBig(volume.ytdSignupsByFY[y] ?? 0)), raws: selYears.map(y => volume.ytdSignupsByFY[y] ?? 0) });
    }
    const thead = `<tr class="thead-row">
      <th>Metric</th>
      ${selYears.map(y => `<th class="right">${esc(y)}<div class="fy-sub">${esc(fyRange(y))}</div></th>`).join("")}
      <th class="right">Δ YoY</th>
    </tr>`;
    const tbody = rows.map(row => {
      const prev = row.raws[row.raws.length - 2] ?? null;
      const curr = row.raws[row.raws.length - 1] ?? null;
      const badge = prev !== null && curr !== null && prev > 0 ? yoyBadge(curr, prev) : "—";
      return `<tr>
        <td class="label-cell">${esc(row.label)}</td>
        ${row.vals.map((v, i) => `<td class="right ${i === row.vals.length - 1 ? "bold-cell" : "muted-cell"}">${esc(v)}</td>`).join("")}
        <td class="right">${badge}</td>
      </tr>`;
    }).join("");
    return `
  <div class="section">
    <div class="section-hdr"><span class="section-title">Fiscal Year over Year</span><div class="section-line"></div><span class="section-sub">Jul 1 – Jun 30</span></div>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
  </div>`;
  })();

  // ── By Province ───────────────────────────────────────────────────────────
  const provHtml = (!opts.sections.byProvince) ? "" : (() => {
    const provList = selProvs
      ? selProvs.filter(p => p !== "??")
      : Object.keys(volume.signupsByProv).filter(p => p !== "??").sort((a, b) => (volume.signupsByProv[b] ?? 0) - (volume.signupsByProv[a] ?? 0));
    if (!provList.length) return "";
    const cols = selYears;
    const thead = `<tr class="thead-row">
      <th>Province</th>
      ${cols.map(y => `<th class="right" colspan="2">${esc(y)}</th>`).join("")}
      ${showYTD && selYears.includes(latestFY) ? `<th class="right" colspan="2" style="color:#2b5346">YTD</th>` : ""}
      <th class="right">Total Sig.</th>
    </tr>
    <tr class="thead-sub">
      <th></th>
      ${cols.map(() => `<th class="right">Ev</th><th class="right">Sig</th>`).join("")}
      ${showYTD && selYears.includes(latestFY) ? `<th class="right">Ev</th><th class="right">Sig</th>` : ""}
      <th></th>
    </tr>`;
    const grandTotal = provList.reduce((s, p) => s + (volume.signupsByProv[p] ?? 0), 0);
    const tbody = provList.map((prov, ri) => {
      const total = volume.signupsByProv[prov] ?? 0;
      const color = pc(prov);
      const cells = cols.map(y => {
        const ev  = volume.eventsByProvByFY[y]?.[prov] ?? 0;
        const sig = volume.signupsByProvByFY[y]?.[prov] ?? 0;
        return `<td class="right muted-cell">${ev > 0 ? ev : "—"}</td><td class="right">${sig > 0 ? sig.toLocaleString() : "—"}</td>`;
      }).join("");
      const ytdCell = showYTD && selYears.includes(latestFY)
        ? `<td class="right" style="color:#2b5346">${(volume.eventsByProvYTD[prov] ?? 0) > 0 ? volume.eventsByProvYTD[prov] : "—"}</td><td class="right bold-cell" style="color:#2b5346">${(volume.signupsByProvYTD[prov] ?? 0) > 0 ? (volume.signupsByProvYTD[prov] ?? 0).toLocaleString() : "—"}</td>`
        : "";
      return `<tr class="${ri % 2 === 1 ? "row-alt" : ""}">
        <td><span class="prov-badge" style="color:${color};border-color:${color}40;background:${color}12">${esc(prov)}</span></td>
        ${cells}
        ${ytdCell}
        <td class="right bold-cell">${total.toLocaleString()}</td>
      </tr>`;
    }).join("");
    // Totals row
    const totCells = cols.map(y => {
      const ev  = Object.values(volume.eventsByProvByFY[y] ?? {}).reduce((s, n) => s + n, 0);
      const sig = volume.byYear[y]?.signups ?? 0;
      return `<td class="right bold-cell">${ev}</td><td class="right bold-cell">${sig.toLocaleString()}</td>`;
    }).join("");
    const ytdTotCell = showYTD && selYears.includes(latestFY)
      ? `<td class="right bold-cell" style="color:#2b5346">${Object.values(volume.eventsByProvYTD).reduce((s,n)=>s+n,0)}</td><td class="right bold-cell" style="color:#2b5346">${Object.values(volume.signupsByProvYTD).reduce((s,n)=>s+n,0).toLocaleString()}</td>`
      : "";
    const tfoot = `<tr class="tfoot-row"><td class="label-cell">Total</td>${totCells}${ytdTotCell}<td class="right bold-cell">${grandTotal.toLocaleString()}</td></tr>`;
    return `
  <div class="section">
    <div class="section-hdr"><span class="section-title">By Province</span><div class="section-line"></div>${selProvs ? `<span class="section-sub">filtered: ${esc(selProvs.join(", "))}</span>` : ""}</div>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>
  </div>`;
  })();

  // ── Financial (Looker) ────────────────────────────────────────────────────
  const finHtml = (!opts.sections.financials || !financials) ? "" : `
  <div class="section">
    <div class="section-hdr"><span class="section-title">Financial Performance</span><div class="section-line"></div><span class="section-sub">Looker data</span></div>
    <div class="kpi-row">
      <div class="kpi-card accent-green">
        <div class="kpi-label">Blended Conversion</div>
        <div class="kpi-value" style="color:${financials.blendedConv >= 35 ? "#2b5346" : financials.blendedConv >= 25 ? "#c9a000" : "#9b4a1c"}">${financials.blendedConv.toFixed(1)}%</div>
        <div class="kpi-sub">avg code conv. ${financials.avgConv.toFixed(1)}%</div>
      </div>
      <div class="kpi-card accent-green">
        <div class="kpi-label">Total LTV 12-mo</div>
        <div class="kpi-value">${currency(financials.totalLTV12)}</div>
        <div class="kpi-sub">estimated 12-month revenue</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Paying Customers</div>
        <div class="kpi-value">${fmtBig(financials.totalPaying)}</div>
        <div class="kpi-sub">of ${fmtBig(financials.totalSignups)} signups</div>
      </div>
      ${financials.hasCost ? `
      <div class="kpi-card accent-amber">
        <div class="kpi-label">Revenue / Investment</div>
        <div class="kpi-value">${financials.revToSpend ? `${financials.revToSpend.toFixed(1)}×` : "—"}</div>
        <div class="kpi-sub">LTV12 ÷ total spend</div>
      </div>` : ""}
    </div>
    ${financials.hasCost ? `
    <div class="kpi-row" style="margin-top:12px">
      <div class="kpi-card">
        <div class="kpi-label">Total Spend</div>
        <div class="kpi-value" style="font-size:22px">${currency(financials.totalSpend)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Cost / Signup</div>
        <div class="kpi-value" style="font-size:22px">${financials.cpaSignup != null ? currency(financials.cpaSignup) : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Cost / Paying Cx</div>
        <div class="kpi-value" style="font-size:22px">${financials.cpaPaying != null ? currency(financials.cpaPaying) : "—"}</div>
      </div>
    </div>` : ""}
  </div>`;

  // ── Top performers ────────────────────────────────────────────────────────
  const topHtml = (!opts.sections.topPerformers || !financials) ? "" : (() => {
    const col = (title: string, rows: AnalyzedCodeReport[], val: (r: AnalyzedCodeReport) => string, color: (r: AnalyzedCodeReport) => string) => {
      if (!rows.length) return "";
      return `<div class="top-col">
        <div class="top-col-title">${esc(title)}</div>
        ${rows.map((r, i) => {
          const prov = (r.Province ?? "").split("+")[0].trim() || "?";
          return `<div class="top-row">
            <span class="top-rank">${i + 1}</span>
            <span class="top-prov" style="color:${pc(prov)};background:${pc(prov)}18">${esc(prov)}</span>
            <span class="top-code">${esc(r.discount_code)}</span>
            <span class="top-val" style="color:${color(r)}">${esc(val(r))}</span>
          </div>`;
        }).join("")}
      </div>`;
    };
    return `
  <div class="section">
    <div class="section-hdr"><span class="section-title">Top BD Codes</span><div class="section-line"></div><span class="section-sub">BD events only · Looker data</span></div>
    <div class="top-grid">
      ${col("Most Signups",     financials.topSignups, r => r.Signups.toLocaleString(), () => "#0f0f0f")}
      ${col("Best Conversion",  financials.topConv,    r => `${r.calculatedConversion.toFixed(1)}%`, r => r.calculatedConversion >= 35 ? "#2b5346" : r.calculatedConversion >= 25 ? "#c9a000" : "#9b4a1c")}
      ${col("Best LTV 12-mo",   financials.topLTV,     r => currency(r["Avg LTV 12"]), () => "#2b5346")}
    </div>
  </div>`;
  })();

  // ── Codes list ────────────────────────────────────────────────────────────
  const codesHtml = !opts.sections.codesList ? "" : (() => {
    const fySections = selYears.map(fy => {
      let list = volume.eventListByFY[fy] ?? [];
      if (selProvs) list = list.filter(e => selProvs.includes(e.homeProvince));
      const sorted = [...list].sort((a, b) => a.eventMonth.localeCompare(b.eventMonth));
      if (!sorted.length) return "";
      const chips = sorted.map(e => `<span class="code-chip" title="${esc(fmtMk(e.eventMonth))}">${esc(e.code)}</span>`).join("");
      return `<div class="codes-fy">
        <div class="codes-fy-hdr">${esc(fy)} <span class="codes-fy-sub">· ${sorted.length} event codes · ${fyRange(fy)}</span></div>
        <div class="codes-grid">${chips}</div>
      </div>`;
    }).join("");
    return `
  <div class="section page-break">
    <div class="section-hdr"><span class="section-title">BD Event Codes</span><div class="section-line"></div><span class="section-sub">sorted by event month</span></div>
    ${fySections}
  </div>`;
  })();

  // ── Assemble ──────────────────────────────────────────────────────────────
  const provNote = selProvs ? `Province filter: ${selProvs.join(", ")}` : "All provinces";
  const yearNote = `${selYears.join(", ")}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,900;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;color:#0f0f0f;background:#fff;font-size:11px;line-height:1.5}
.page{max-width:820px;margin:0 auto;padding:40px 44px}

/* Masthead */
.masthead{background:#2b5346;padding:22px 28px;border-radius:14px;margin-bottom:24px;display:flex;align-items:flex-end;justify-content:space-between}
.masthead-left{color:#fff}
.masthead-brand{font-size:9px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.22em;color:rgba(255,255,255,.5);margin-bottom:4px}
.masthead-title{font-size:22px;font-weight:900;color:#fff;line-height:1.1}
.masthead-right{text-align:right;color:rgba(255,255,255,.55);font-size:8.5px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.12em;line-height:2}

/* Meta row */
.meta-row{display:flex;align-items:center;gap:16px;padding:10px 0 20px;border-bottom:1px solid #f0f0ee;margin-bottom:24px}
.meta-item{font-size:9px;font-family:'DM Mono',monospace;color:#a1a1a1;text-transform:uppercase;letter-spacing:.12em}
.meta-sep{width:1px;height:12px;background:#e8e8e8}

/* Sections */
.section{margin-bottom:28px}
.section-hdr{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.section-title{font-size:8.5px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.2em;color:#a1a1a1;white-space:nowrap}
.section-sub{font-size:8px;font-family:'DM Mono',monospace;color:#c0c0c0;white-space:nowrap}
.section-line{flex:1;height:1px;background:#f0f0ee}

/* KPI cards */
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpi-card{border:1px solid #e8e8e8;border-radius:10px;padding:14px 16px}
.kpi-card.accent-green{border-top:3px solid #2b5346}
.kpi-card.accent-amber{border-top:3px solid #c9a000}
.kpi-label{font-size:8px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.18em;color:#a1a1a1;margin-bottom:8px}
.kpi-value{font-size:26px;font-weight:900;font-family:'DM Mono',monospace;color:#0f0f0f;line-height:1}
.kpi-sub{font-size:8.5px;font-family:'DM Mono',monospace;color:#888;margin-top:5px}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:10.5px}
.thead-row th{font-family:'DM Mono',monospace;font-size:7.5px;text-transform:uppercase;letter-spacing:.15em;color:#a1a1a1;padding:8px 10px;background:#fafafa;border-bottom:1px solid #f0f0ee}
.thead-sub th{font-family:'DM Mono',monospace;font-size:7px;color:#c0c0c0;padding:3px 10px;background:#fafafa;border-bottom:1px solid #ececec}
th.right,td.right{text-align:right}
th.center,td.center{text-align:center}
td{padding:7px 10px;border-bottom:1px solid #f8f8f8;vertical-align:middle}
.label-cell{font-weight:600;color:#3d3d3d}
.bold-cell{font-family:'DM Mono',monospace;font-weight:700;color:#0f0f0f}
.muted-cell{font-family:'DM Mono',monospace;color:#888}
.row-alt{background:#fafafa}
.tfoot-row td{border-top:2px solid #e8e8e8;background:#f8f7f5;font-family:'DM Mono',monospace;font-weight:700;font-size:10.5px;color:#0f0f0f}
.fy-sub{font-size:7px;font-family:'DM Mono',monospace;color:#c0c0c0;font-weight:400;letter-spacing:0;text-transform:none}

/* Delta */
.delta-up{color:#2b5346;background:#eef4f1;padding:2px 6px;border-radius:4px;font-weight:700;font-family:'DM Mono',monospace;font-size:9px}
.delta-down{color:#850b0b;background:#fff0f0;padding:2px 6px;border-radius:4px;font-weight:700;font-family:'DM Mono',monospace;font-size:9px}

/* Province badge */
.prov-badge{font-family:'DM Mono',monospace;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid;display:inline-block}

/* Top performers */
.top-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.top-col{border:1px solid #e8e8e8;border-radius:10px;overflow:hidden}
.top-col-title{font-size:7.5px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.2em;color:#a1a1a1;padding:8px 12px;border-bottom:1px solid #f5f5f3;background:#fafafa}
.top-row{display:flex;align-items:center;gap:6px;padding:7px 12px;border-bottom:1px solid #f8f8f8}
.top-row:last-child{border-bottom:none}
.top-rank{font-size:9px;font-family:'DM Mono',monospace;color:#d0d0d0;width:12px;shrink:0}
.top-prov{font-size:7.5px;font-family:'DM Mono',monospace;font-weight:700;padding:1px 5px;border-radius:3px;flex-shrink:0}
.top-code{font-family:'DM Mono',monospace;font-size:9.5px;font-weight:700;color:#0f0f0f;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top-val{font-family:'DM Mono',monospace;font-size:11px;font-weight:900;flex-shrink:0}

/* Codes list */
.codes-fy{margin-bottom:16px}
.codes-fy-hdr{font-size:9px;font-family:'DM Mono',monospace;font-weight:700;color:#2b5346;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px}
.codes-fy-sub{font-weight:400;color:#a1a1a1;text-transform:none;letter-spacing:0;font-size:8.5px}
.codes-grid{display:flex;flex-wrap:wrap;gap:4px}
.code-chip{font-family:'DM Mono',monospace;font-size:8.5px;background:#f5f5f3;border:1px solid #e8e8e8;padding:3px 7px;border-radius:5px;color:#3d3d3d}

/* Footer */
.footer{margin-top:32px;padding-top:14px;border-top:1px solid #f0f0ee;display:flex;justify-content:space-between;align-items:center}
.footer-left{display:flex;align-items:center;gap:8px}
.footer-brand{font-size:8px;font-family:'DM Mono',monospace;color:#2b5346;font-weight:700;text-transform:uppercase;letter-spacing:.18em}
.footer-text{font-size:7.5px;font-family:'DM Mono',monospace;color:#c0c0c0;text-transform:uppercase;letter-spacing:.12em}
.footer-confidential{font-size:7.5px;font-family:'DM Mono',monospace;color:#d0d0d0;text-transform:uppercase;letter-spacing:.12em}

.page-break{page-break-before:always}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{padding:28px 32px}
}
</style>
</head>
<body>
<div class="page">

  <!-- Masthead -->
  <div class="masthead">
    <div class="masthead-left">
      <div class="masthead-brand">FreshPrep · Business Development</div>
      <div class="masthead-title">${title}</div>
    </div>
    <div class="masthead-right">
      <div>${esc(yearNote)}</div>
      ${preparedBy ? `<div>Prepared by: ${preparedBy}</div>` : ""}
      <div>Generated ${esc(today)}</div>
    </div>
  </div>

  <!-- Meta row -->
  <div class="meta-row">
    <span class="meta-item">${esc(yearNote)}</span>
    <div class="meta-sep"></div>
    <span class="meta-item">${esc(provNote)}</span>
    ${preparedBy ? `<div class="meta-sep"></div><span class="meta-item">Prepared by ${preparedBy}</span>` : ""}
    <div class="meta-sep"></div>
    <span class="meta-item">Generated ${esc(today)}</span>
  </div>

  ${kpiHtml}
  ${fyofyHtml}
  ${provHtml}
  ${finHtml}
  ${topHtml}
  ${codesHtml}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <span class="footer-brand">FreshPrep</span>
      <span class="footer-text">BD Analytics · ${esc(yearNote)}</span>
    </div>
    <span class="footer-confidential">Confidential · Internal Use Only</span>
  </div>

</div>
</body>
</html>`;
}

// ── Modal component ────────────────────────────────────────────────────────

interface CheckRowProps {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tag?: string;
  tagColor?: string;
}
function CheckRow({ label, sub, checked, onChange, tag, tagColor }: CheckRowProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group py-2.5 px-3 rounded-xl hover:bg-[#f8f7f5] transition-colors">
      <div
        className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors"
        style={{ backgroundColor: checked ? "#2b5346" : "white", borderColor: checked ? "#2b5346" : "#d0d0d0" }}
        onClick={() => onChange(!checked)}
      >
        {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div className="flex-1 min-w-0" onClick={() => onChange(!checked)}>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#1a1a1a]">{label}</span>
          {tag && (
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tagColor ? tagColor + "18" : "#f5f5f3", color: tagColor ?? "#888", border: `1px solid ${tagColor ? tagColor + "30" : "#e8e8e8"}` }}>
              {tag}
            </span>
          )}
        </div>
        {sub && <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">{sub}</p>}
      </div>
    </label>
  );
}

export function FiscalPrintModal({
  onClose, volume, financials, allProvs, dateRangeLabel, currentFY, nowMk, showYTD,
}: FiscalPrintModalProps) {
  const defaultTitle = `BD Fiscal Report · ${dateRangeLabel}`;
  const [title, setTitle]     = useState(defaultTitle);
  const [prepBy, setPrepBy]   = useState("");
  const [sections, setSections] = useState({
    volumeKpis:     true,
    fyofy:          true,
    byProvince:     true,
    financials:     !!financials,
    topPerformers:  !!financials,
    codesList:      false,
  });
  const [selProvs, setSelProvs] = useState<Set<string>>(new Set()); // empty = all
  const [selYears, setSelYears] = useState<Set<string>>(new Set(volume.years));

  function toggleSection(k: keyof typeof sections) {
    setSections(prev => ({ ...prev, [k]: !prev[k] }));
  }
  function toggleProv(p: string) {
    setSelProvs(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }
  function toggleYear(y: string) {
    setSelYears(prev => {
      if (prev.size === 1 && prev.has(y)) return prev;
      const next = new Set(prev);
      next.has(y) ? next.delete(y) : next.add(y);
      return next;
    });
  }

  // Summary stats for preview line
  const summary = useMemo(() => {
    const years = volume.years.filter(y => selYears.has(y));
    const events  = years.reduce((s, y) => s + (volume.byYear[y]?.events ?? 0), 0);
    const signups = years.reduce((s, y) => s + (volume.byYear[y]?.signups ?? 0), 0);
    const sectionCount = Object.values(sections).filter(Boolean).length;
    return { events, signups, years: years.length, sectionCount };
  }, [volume, selYears, sections]);

  function handlePrint() {
    const opts: PrintOpts = {
      title: title || defaultTitle,
      preparedBy: prepBy,
      sections,
      provinces: selProvs.size > 0 ? Array.from(selProvs) : [],
      years: Array.from(selYears),
    };
    const html = generatePrintHtml(opts, volume, financials, showYTD, nowMk);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Wait for fonts to load before printing
    setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 900);
  }

  // Keyboard dismiss
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0f0ee] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#eef4f1] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-[#2b5346]" />
            </div>
            <div>
              <p className="text-[13px] font-black text-[#0f0f0f]">Print BD Fiscal Report</p>
              <p className="text-[9px] font-mono text-[#a1a1a1]">Configure your report before printing</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#c0c0c0] hover:text-[#1a1a1a] cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Report info */}
          <div className="px-5 pt-5 pb-4 border-b border-[#f8f8f8]">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">Report Info</p>
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-[#3d3d3d] block mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={defaultTitle}
                  className="w-full text-[11px] font-mono px-3 py-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa] text-[#0f0f0f] placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#2b5346]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#3d3d3d] block mb-1">Prepared by <span className="text-[#c0c0c0] font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={prepBy}
                  onChange={e => setPrepBy(e.target.value)}
                  placeholder="e.g. Sarah M., BD Lead"
                  className="w-full text-[11px] font-mono px-3 py-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa] text-[#0f0f0f] placeholder:text-[#c0c0c0] focus:outline-none focus:border-[#2b5346]"
                />
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="px-5 pt-4 pb-2 border-b border-[#f8f8f8]">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-1">Include Sections</p>
            <CheckRow label="Headline KPIs" sub="Total events, signups, and conversion at a glance" checked={sections.volumeKpis} onChange={() => toggleSection("volumeKpis")} />
            <CheckRow label="Fiscal Year over Year" sub="Event codes, signups, and YTD comparison table" checked={sections.fyofy} onChange={() => toggleSection("fyofy")} />
            <CheckRow label="By Province" sub="Events and signups broken down by province" checked={sections.byProvince} onChange={() => toggleSection("byProvince")} />
            {financials && (
              <>
                <CheckRow label="Financial Performance" sub="Conversion, LTV, and cost metrics" checked={sections.financials} onChange={() => toggleSection("financials")} tag="Looker" tagColor="#c9a000" />
                <CheckRow label="Top BD Codes" sub="Top 3 by volume, conversion, and LTV" checked={sections.topPerformers} onChange={() => toggleSection("topPerformers")} tag="Looker" tagColor="#c9a000" />
              </>
            )}
            <CheckRow label="BD Codes List" sub="All event codes grouped by fiscal year" checked={sections.codesList} onChange={() => toggleSection("codesList")} tag={sections.codesList ? `${volume.totalEvents} codes` : "adds pages"} tagColor={sections.codesList ? "#2b5346" : undefined} />
          </div>

          {/* Province filter */}
          {allProvs.length > 1 && (
            <div className="px-5 pt-4 pb-3 border-b border-[#f8f8f8]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Province Filter</p>
                {selProvs.size > 0 && (
                  <button onClick={() => setSelProvs(new Set())} className="text-[9px] font-mono text-[#2b5346] hover:underline cursor-pointer">
                    All provinces
                  </button>
                )}
              </div>
              <p className="text-[10px] font-mono text-[#c0c0c0] mb-2">{selProvs.size === 0 ? "All provinces included" : `${selProvs.size} province${selProvs.size !== 1 ? "s" : ""} selected`}</p>
              <div className="flex flex-wrap gap-1.5">
                {allProvs.filter(p => p !== "??").map(p => {
                  const active = selProvs.has(p);
                  const color = PROV_COLOR[p] ?? "#888";
                  return (
                    <button
                      key={p}
                      onClick={() => toggleProv(p)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer border transition-all"
                      style={active
                        ? { backgroundColor: color, color: "#fff", borderColor: color }
                        : { backgroundColor: "white", color: "#a1a1a1", borderColor: "#e5e5e5" }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fiscal year filter */}
          {volume.years.length > 1 && (
            <div className="px-5 pt-4 pb-3 border-b border-[#f8f8f8]">
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-2">Fiscal Years</p>
              <div className="flex flex-wrap gap-1.5">
                {volume.years.map(y => {
                  const active = selYears.has(y);
                  return (
                    <button
                      key={y}
                      onClick={() => toggleYear(y)}
                      className="px-3 py-1.5 rounded-full text-[10px] font-mono font-semibold cursor-pointer border transition-all"
                      style={active
                        ? { backgroundColor: "#2b5346", color: "#fff", borderColor: "#2b5346" }
                        : { backgroundColor: "white", color: "#a1a1a1", borderColor: "#e5e5e5" }}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary line */}
          <div className="px-5 py-3.5 bg-[#f8f7f5]">
            <p className="text-[10px] font-mono text-[#888]">
              <span className="text-[#2b5346] font-semibold">{summary.sectionCount} section{summary.sectionCount !== 1 ? "s" : ""}</span>
              {" · "}
              <span className="text-[#0f0f0f] font-semibold">{summary.events} events · {summary.signups.toLocaleString()} signups</span>
              {" · "}
              {summary.years} fiscal year{summary.years !== 1 ? "s" : ""}
              {selProvs.size > 0 && ` · ${selProvs.size} province${selProvs.size !== 1 ? "s" : ""}`}
              {sections.codesList && ` · includes codes list`}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-[#f0f0ee] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-semibold text-[#888] hover:text-[#1a1a1a] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#2b5346" }}
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
