/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One-page A4 landscape report for the Code Finder event comparison.
 *
 * This is deliberately NOT a print stylesheet over the screen layout — it's a
 * separately composed document with a fixed 277×190mm canvas, sized so the whole
 * comparison lands on a single sheet (or a single PDF page). A BD lead should be
 * able to hand this across a desk.
 *
 * Density adapts to the number of events so it never spills onto page 2: up to six
 * events get their own year-over-year chart; beyond that the per-event charts give
 * way to compact rows and the overview chart carries the comparison.
 */
import { GroupReport } from "../features/codefinder/ComparisonReport";
import {
  yearComparisonChart, conversionComparisonChart, signupsComparisonChart,
  conversionTrendChart, CHART_COLORS,
} from "./codeFinderCharts";

const FP_LOGO = "https://freshprep.imgix.net/fresh-prep-logo.svg?auto=compress,format";
const CHART_LIMIT = 6;  // above this, per-event volume charts give way to compact rows
const TREND_LIMIT = 2;       // above this the trend line is dropped to protect the height budget
const SINGLE_PAGE_LIMIT = 4; // above this it becomes a planned 2-page document

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function pct(v: number | null, approx = false): string {
  return v == null ? "—" : `${approx ? "≈" : ""}${(v * 100).toFixed(1)}%`;
}
function num(v: number | null): string { return v == null ? "—" : v.toLocaleString(); }

function deltaOf(r: GroupReport): number | null {
  const { latest, previous } = r.summary;
  if (!latest || !previous || !previous.signups || !latest.signups) return null;
  return ((latest.signups - previous.signups) / previous.signups) * 100;
}

export function generateCodeFinderPrintHtml(
  reports: GroupReport[],
  title: string,
  preparedBy: string,
): string {
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  const totalCodes = reports.reduce((s, r) => s + r.group.codes.length, 0);
  const totalSignups = reports.reduce((s, r) => s + r.summary.totalSignups, 0);
  const totalPaying = reports.reduce((s, r) => s + r.summary.totalPaying, 0);
  const blended = totalSignups > 0 ? totalPaying / totalSignups : null;
  const anyApprox = reports.some(r => r.summary.approximate);
  const showCharts = reports.length <= CHART_LIMIT;
  const showTrend = reports.length <= TREND_LIMIT;

  const ranked = [...reports]
    .filter(r => r.summary.blendedConversion != null)
    .sort((a, b) => (b.summary.blendedConversion ?? 0) - (a.summary.blendedConversion ?? 0));
  const best = ranked[0] ?? null;
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const growth = reports
    .map(r => ({ r, d: deltaOf(r) }))
    .filter((x): x is { r: GroupReport; d: number } => x.d != null)
    .sort((a, b) => b.d - a.d);
  const riser = growth[0] ?? null;
  const faller = growth.length > 1 ? growth[growth.length - 1] : null;
  const belowTarget = ranked.filter(r => (r.summary.blendedConversion ?? 0) < 0.4).length;

  // Two separate cross-event views — reach and quality read independently rather
  // than being conflated into one composite score.
  const comparisonRows = reports.map(r => ({
    name: r.group.name,
    conversionPct: r.summary.blendedConversion,
    signups: r.summary.totalSignups,
    approximate: r.summary.approximate,
  }));
  const conversionChart = conversionComparisonChart(comparisonRows, { width: 330 });
  const signupsChart = signupsComparisonChart(comparisonRows, { width: 330 });

  // ── Pagination plan ──────────────────────────────────────────────────────
  // One page is the goal, but silently cramming 9 events onto a sheet makes it
  // unreadable and clipping them loses data. So past a threshold it becomes a
  // deliberate two-page document: page 1 is a self-contained summary (KPIs, both
  // comparison charts, verdict, one row per event) and page 2 carries the per-event
  // detail with every code listed. Never an arbitrary mid-card break.
  const multiPage = reports.length > SINGLE_PAGE_LIMIT;

  // ── Event cards ──────────────────────────────────────────────────────────
  // Always at least 2 columns on page 1 — a single-column card is ~173mm wide, and
  // its chart scales with width, which is what pushed the sheet onto extra pages.
  // Page 2 has no left rail, so its cards are much wider — and a chart scales its
  // height with width, so 2 wide columns there is taller than 3 narrow ones. Page 1
  // (rail present) uses 2.
  const cols = multiPage ? 3 : 2;

  const cards = reports.map(r => {
    const d = deltaOf(r);
    const trend = d == null ? "" :
      `<span class="trend ${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"}${Math.abs(d).toFixed(0)}%</span>`;

    const chart = showCharts
      ? `<div class="ec-chart">${yearComparisonChart(
          r.years.map(y => ({
            year: y.year ?? "—",
            signups: y.signups,
            paying: y.paying,
            conversionPct: y.conversionPct,
            approximate: y.approximate,
          })),
          { width: 400, height: reports.length <= 2 ? 150 : 118 },
        )}</div>`
      : "";

    // Conversion trend — the year-over-year rate change, kept on its own frame
    // because conversion is a rate and signups are a count (never one dual axis).
    const trendChart = showTrend
      ? conversionTrendChart(
          r.years.map(y => ({
            year: y.year ?? "—",
            conversionPct: y.conversionPct,
            approximate: y.approximate,
          })),
          { width: 400, height: 74 },
        )
      : "";

    // LTV only earns a column when this event actually has it — otherwise it's a
    // column of dashes eating width on a page that's already tight.
    const ltvByYear = new Map<number | null, number>();
    for (const e of r.entries) {
      if (e.avgLtv12 != null) ltvByYear.set(e.year ?? null, e.avgLtv12);
      else if (e.avgLtv6 != null) ltvByYear.set(e.year ?? null, e.avgLtv6);
    }
    const showLtv = ltvByYear.size > 0;

    // One row per CODE, not per year — an event can run several codes in the same
    // year (a per-province split, or a second occurrence), and a reader who can only
    // see the rolled-up year number has no way to check it. Where a year does combine
    // codes, a subtotal row shows the addition that produced it.
    const byYear = new Map<number | null, typeof r.entries>();
    for (const e of r.entries) {
      const k = e.year ?? null;
      if (!byYear.has(k)) byYear.set(k, []);
      byYear.get(k)!.push(e);
    }
    const orderedYears = Array.from(byYear.keys()).sort((a, b) => {
      if (a == null) return 1;
      if (b == null) return -1;
      return a - b;
    });

    const codeRows = orderedYears.map(yr => {
      const list = byYear.get(yr)!;
      const rows = list.map(e => `
        <tr>
          <td class="yr">${esc(String(e.year ?? "—"))}</td>
          <td class="cd">${esc(e.code)}</td>
          <td class="n">${esc(num(e.signups))}</td>
          <td class="n pay">${e.payingApproximate ? "≈" : ""}${esc(num(e.paying))}</td>
          <td class="n cv">${esc(pct(e.conversionPct, e.payingApproximate))}</td>
          ${showLtv ? `<td class="n ltv">${e.avgLtv12 != null ? `$${Math.round(e.avgLtv12)}` : e.avgLtv6 != null ? `$${Math.round(e.avgLtv6)}` : "—"}</td>` : ""}
        </tr>`).join("");

      if (list.length < 2) return rows;

      // Same event, same year, multiple codes → show the arithmetic.
      const roll = r.years.find(y => (y.year ?? null) === yr);
      const sigParts = list.filter(e => e.signups != null).map(e => e.signups!).join(" + ");
      const payParts = list.filter(e => e.paying != null).map(e => e.paying!).join(" + ");
      return rows + `
        <tr class="sub">
          <td class="yr">${esc(String(yr ?? "—"))}</td>
          <td class="cd sub-l">total · ${list.length} codes</td>
          <td class="n">${esc(num(roll?.signups ?? null))}${sigParts ? `<span class="math">${esc(sigParts)}</span>` : ""}</td>
          <td class="n pay">${roll?.approximate ? "≈" : ""}${esc(num(roll?.paying ?? null))}${payParts ? `<span class="math">${esc(payParts)}</span>` : ""}</td>
          <td class="n cv">${esc(pct(roll?.conversionPct ?? null, roll?.approximate ?? false))}</td>
          ${showLtv ? `<td class="n"></td>` : ""}
        </tr>`;
    }).join("");

    // Event grand total, with its own arithmetic across years
    const yearsWithData = r.years.filter(y => (y.signups ?? 0) > 0);
    const totalMath = yearsWithData.length > 1
      ? yearsWithData.map(y => y.signups!).join(" + ")
      : "";

    return `<div class="ec">
      <div class="ec-h">
        <span class="ec-n">${esc(r.group.name)}</span>
        ${trend}
      </div>
      ${chart}
      ${trendChart ? `<div class="ec-trend"><div class="ec-trend-l">Conversion trend</div>${trendChart}</div>` : ""}
      <table class="ec-t">
        <thead><tr><th>Year</th><th>Code</th><th class="n">Signups</th><th class="n">Paying</th><th class="n">Conv</th>${showLtv ? `<th class="n">LTV</th>` : ""}</tr></thead>
        <tbody>${codeRows}</tbody>
        <tfoot>
          <tr class="tot">
            <td class="yr">All</td>
            <td class="cd sub-l">${r.group.codes.length} code${r.group.codes.length === 1 ? "" : "s"}</td>
            <td class="n">${esc(num(r.summary.totalSignups || null))}${totalMath ? `<span class="math">${esc(totalMath)}</span>` : ""}</td>
            <td class="n pay">${r.summary.approximate ? "≈" : ""}${esc(num(r.summary.totalPaying || null))}</td>
            <td class="n cv">${esc(pct(r.summary.blendedConversion, r.summary.approximate))}</td>
            ${showLtv ? `<td class="n"></td>` : ""}
          </tr>
        </tfoot>
      </table>
    </div>`;
  }).join("");


  const summaryRows = reports.map(r => {
    const d = deltaOf(r);
    const yoy = d == null
      ? `<span class="muted">—</span>`
      : `<span class="${d >= 0 ? "up-t" : "down-t"}">${d >= 0 ? "▲" : "▼"}${Math.abs(d).toFixed(0)}%</span>`;
    return `<tr>
      <td class="ev">${esc(r.group.name)}</td>
      <td class="n">${r.group.codes.length}</td>
      <td class="n">${esc(num(r.summary.totalSignups || null))}</td>
      <td class="n pay">${r.summary.approximate ? "≈" : ""}${esc(num(r.summary.totalPaying || null))}</td>
      <td class="n cv">${esc(pct(r.summary.blendedConversion, r.summary.approximate))}</td>
      <td class="n">${yoy}</td>
    </tr>`;
  }).join("");

  const footerHtml = `
  <footer class="ftr">
    <p class="note">
      Signups and paying customers both come from the Looker Code Level Report exports, so conversion is a
      single-source ratio; the built-in per-signup database supplies signups where Looker has none. Where no Looker
      paying figure exists we fall back to that database's funnel-step signal — which counts reaching the "Paying
      Customer" step (first promotional delivery) rather than a confirmed customer (revenue &gt; $49) and therefore
      reads high. Those are marked <b>≈</b> and are an upper bound. LTV appears only when a Client LTV export was
      loaded. Discount offered on first order is not tracked in any available source.
    </p>
    <div class="ftr-r">
      <img class="ftr-logo" src="${FP_LOGO}" alt="FreshPrep">
      <span class="conf">Confidential · Internal</span>
    </div>
  </footer>`;

  // ── Verdict lines ────────────────────────────────────────────────────────
  const verdicts: string[] = [];
  if (best) verdicts.push(`<li><b>${esc(best.group.name)}</b> converts best at ${esc(pct(best.summary.blendedConversion, best.summary.approximate))}.</li>`);
  if (riser && riser.d > 5) verdicts.push(`<li><b>${esc(riser.r.group.name)}</b> grew signups ${riser.d.toFixed(0)}% year over year.</li>`);
  if (faller && faller.d < -5) verdicts.push(`<li><b>${esc(faller.r.group.name)}</b> lost ${Math.abs(faller.d).toFixed(0)}% of its signups — worth a look before rebooking.</li>`);
  if (worst && (worst.summary.blendedConversion ?? 1) < 0.4) verdicts.push(`<li><b>${esc(worst.group.name)}</b> is the weakest converter at ${esc(pct(worst.summary.blendedConversion, worst.summary.approximate))}.</li>`);
  if (belowTarget > 0) verdicts.push(`<li>${belowTarget} of ${ranked.length} event${ranked.length === 1 ? "" : "s"} sit below the 40% conversion benchmark.</li>`);
  if (verdicts.length === 0) verdicts.push(`<li>Not enough multi-year data yet to call a trend.</li>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#e9e9e6}
body{font-family:'DM Sans',sans-serif;color:#0f0f0f;font-size:9px;line-height:1.4;-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:14px}

/* Fixed one-page canvas — A4 landscape minus 10mm margins */
.sheet{width:277mm;max-width:100%;min-height:190mm;background:#fff;padding:0;display:flex;flex-direction:column;
  overflow:visible;box-shadow:0 2px 18px rgba(0,0,0,.14)}

/* ── Header band ── */
.hdr{background:linear-gradient(115deg,#16362a 0%,#2b5346 58%,#396855 100%);color:#fff;
  padding:7mm 9mm 6mm;display:flex;align-items:flex-end;justify-content:space-between;gap:8mm;flex-shrink:0}
.hdr-l{min-width:0}
.brandline{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.logo{height:15px;width:auto;filter:brightness(0) invert(1);opacity:.95}
.vr{width:1px;height:12px;background:rgba(255,255,255,.25)}
.eyebrow{font-size:7px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.24em;color:rgba(255,255,255,.55)}
.title{font-size:21px;font-weight:900;line-height:1.05;letter-spacing:-.015em}
.subtitle{font-size:8.5px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.5);margin-top:4px}
.kpis{display:flex;gap:9mm;flex-shrink:0}
.kpi{text-align:right}
.kpi-v{font-size:23px;font-weight:900;font-family:'DM Mono',monospace;line-height:1;font-variant-numeric:tabular-nums}
.kpi-l{font-size:6.5px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.42);text-transform:uppercase;letter-spacing:.2em;margin-top:4px}

/* ── Body: left rail + card grid ── */
.body{flex:1;display:flex;gap:6mm;padding:6mm 9mm 4mm;min-height:0}
.rail{width:30%;max-width:80mm;flex-shrink:0;display:flex;flex-direction:column;gap:4mm;min-height:0}
.main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}

.sec-t{font-size:7px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.2em;
  color:#a1a1a1;margin-bottom:5px;display:flex;align-items:center;gap:6px}
.sec-t::after{content:"";flex:1;height:1px;background:#efefec}

.panel{border:1px solid #e8e8e5;border-radius:8px;padding:7px 8px;background:#fff}
.panel svg{display:block;width:100%;height:auto}

.verdict{border:1px solid #d7e5df;border-radius:8px;background:#f3f8f6;padding:8px 10px}
.verdict ul{list-style:none;display:flex;flex-direction:column;gap:5px}
.verdict li{font-size:8.5px;line-height:1.45;color:#2f4a41;padding-left:9px;position:relative}
.verdict li::before{content:"";position:absolute;left:0;top:5px;width:3px;height:3px;border-radius:50%;background:${CHART_COLORS.paying}}
.verdict b{color:#16362a;font-weight:800}

/* ── Event cards ── */
.grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:4mm;align-content:start;min-height:0}
.ec{border:1px solid #e8e8e5;border-radius:8px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
.ec-h{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:5px 8px;
  background:#fafaf9;border-bottom:1px solid #f0f0ee}
.ec-n{font-size:9.5px;font-weight:800;color:#0f0f0f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trend{font-size:7px;font-family:'DM Mono',monospace;font-weight:700;padding:1.5px 5px;border-radius:99px;flex-shrink:0}
.trend.up{color:#2b5346;background:#e7f0eb}
.trend.down{color:#9b4a1c;background:#fbeee6}
.ec-chart{padding:5px 5px 0}
.ec-trend{padding:2px 5px 4px;border-top:1px dashed #f0f0ee;margin-top:3px}
.ec-trend-l{font-size:6.5px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.14em;color:#b5b5b0;padding-left:3px}
.ec-trend svg{display:block;width:100%;height:auto}
.ec-chart svg{display:block;width:100%;height:auto}

.ec-t{width:100%;border-collapse:collapse;font-size:8px;margin-top:auto}
.ec-t th{font-family:'DM Mono',monospace;font-size:6px;text-transform:uppercase;letter-spacing:.12em;
  color:#b5b5b0;padding:3.5px 7px;text-align:left;font-weight:500;background:#fcfcfb;border-top:1px solid #f0f0ee}
.ec-t td{padding:3px 7px;border-top:1px solid #f7f7f6}
.yr{font-family:'DM Mono',monospace;font-weight:700;color:#0f0f0f;width:26px}
.n,th.n,td.n{text-align:right;font-family:'DM Mono',monospace;font-variant-numeric:tabular-nums}
.pay{font-weight:700;color:${CHART_COLORS.paying}}
.cv{color:#6a6a64}
.cd{font-family:'DM Mono',monospace;font-size:7.5px;color:#6a6a64;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sub td{background:#fbfbfa;border-top:1px solid #ececea}
.sub-l{font-family:'DM Sans',sans-serif;font-size:7px;font-weight:700;color:#a1a1a1;text-transform:uppercase;letter-spacing:.08em}
.math{display:block;font-size:6px;font-family:'DM Mono',monospace;color:#b5b5b0;font-weight:400;letter-spacing:-.01em}
.tot td{background:#f4f7f5;border-top:1.5px solid #cfe3db;font-weight:700}
.tot .yr{color:${CHART_COLORS.paying}}

/* Page-1 summary table (2-page mode) */
.sum-t{width:100%;border-collapse:collapse;font-size:9px}
.sum-t th{font-family:'DM Mono',monospace;font-size:6.5px;text-transform:uppercase;letter-spacing:.13em;color:#b0b0b0;
  padding:6px 8px;text-align:left;background:#fcfcfb;border-bottom:1px solid #f0f0ee;font-weight:500}
.sum-t td{padding:5px 8px;border-bottom:1px solid #f7f7f6}
.sum-t .ev{font-weight:700;color:#0f0f0f}
.up-t{color:#2b5346;font-weight:700}
.down-t{color:#9b4a1c;font-weight:700}
.muted{color:#c8c8c4}
.cont-note{font-size:7.5px;font-family:'DM Mono',monospace;color:#a1a1a1;margin-top:8px;font-style:italic}

/* Second sheet */
.sheet-2{margin-top:14px}
.hdr-slim{padding:5mm 9mm 4.5mm;align-items:center}
.title-slim{font-size:14px;font-weight:800;line-height:1.1}
.pg{font-size:7.5px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.16em;white-space:nowrap}
.body-2{padding-top:5mm}
.ltv{font-weight:700;color:#8a6f00}

/* ── Footer ── */
.ftr{flex-shrink:0;padding:3.5mm 9mm 5mm;border-top:1px solid #f0f0ee;display:flex;
  align-items:flex-start;justify-content:space-between;gap:8mm}
.note{font-size:6.5px;font-family:'DM Mono',monospace;color:#b0b0ab;line-height:1.55;flex:1;min-width:0}
.note b{color:${CHART_COLORS.approx}}
.ftr-r{display:flex;align-items:center;gap:7px;flex-shrink:0}
.ftr-logo{height:9px;width:auto;filter:brightness(0);opacity:.28}
.conf{font-size:6.5px;font-family:'DM Mono',monospace;color:#c4c4bf;text-transform:uppercase;letter-spacing:.14em;white-space:nowrap}

@media print{
  html,body{background:#fff}
  body{padding:0;display:block}
  .sheet{width:100%;max-width:100%;height:auto;min-height:0;box-shadow:none;margin:0;
    break-inside:avoid;page-break-inside:avoid}
  .sheet-2{break-before:page;page-break-before:always}
  .ec{break-inside:avoid;page-break-inside:avoid}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
@page{size:297mm 210mm;margin:9mm}
</style>
</head>
<body>
<div class="sheet">

  <header class="hdr">
    <div class="hdr-l">
      <div class="brandline">
        <img class="logo" src="${FP_LOGO}" alt="FreshPrep">
        <div class="vr"></div>
        <span class="eyebrow">Business Development · Event Comparison</span>
      </div>
      <div class="title">${esc(title)}</div>
      <div class="subtitle">${reports.length} event${reports.length === 1 ? "" : "s"} · ${totalCodes} discount code${totalCodes === 1 ? "" : "s"} · ${esc(today)}${preparedBy ? ` · ${esc(preparedBy)}` : ""}</div>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-v">${totalSignups.toLocaleString()}</div><div class="kpi-l">Signups</div></div>
      <div class="kpi"><div class="kpi-v" style="color:#8fc7ae">${anyApprox ? "≈" : ""}${totalPaying.toLocaleString()}</div><div class="kpi-l">Paying</div></div>
      <div class="kpi"><div class="kpi-v" style="color:#e7bd27">${esc(pct(blended, anyApprox))}</div><div class="kpi-l">Conversion</div></div>
    </div>
  </header>

  <div class="body">
    <aside class="rail">
      ${reports.length > 1 && signupsChart ? `
        <div>
          <div class="sec-t">Signups by event</div>
          <div class="panel">${signupsChart}</div>
        </div>` : ""}
      ${reports.length > 1 && conversionChart ? `
        <div>
          <div class="sec-t">Conversion by event</div>
          <div class="panel">${conversionChart}</div>
        </div>` : ""}
      <div>
        <div class="sec-t">What this says</div>
        <div class="verdict"><ul>${verdicts.join("")}</ul></div>
      </div>
    </aside>

    <section class="main">
      ${multiPage ? `
        <div class="sec-t">All events at a glance</div>
        <table class="sum-t">
          <thead><tr><th>Event</th><th class="n">Codes</th><th class="n">Signups</th><th class="n">Paying</th><th class="n">Conv</th><th class="n">YoY</th></tr></thead>
          <tbody>${summaryRows}</tbody>
        </table>
        <p class="cont-note">Year-by-year detail and the code list for every event continue on page 2.</p>
      ` : `
        <div class="sec-t">Year over year${showCharts ? " · signups split into paying vs. didn't convert" : ""}</div>
        <div class="grid">${cards}</div>
      `}
    </section>
  </div>

  ${footerHtml}
</div>

${multiPage ? `
<div class="sheet sheet-2">
  <header class="hdr hdr-slim">
    <div class="hdr-l">
      <div class="brandline">
        <img class="logo" src="${FP_LOGO}" alt="FreshPrep">
        <div class="vr"></div>
        <span class="eyebrow">Business Development · Event Comparison</span>
      </div>
      <div class="title-slim">${esc(title)} — event detail</div>
    </div>
    <div class="pg">Page 2 of 2</div>
  </header>
  <div class="body body-2">
    <section class="main">
      <div class="sec-t">Year over year${showCharts ? " · signups split into paying vs. didn't convert" : ""} · every code listed</div>
      <div class="grid">${cards}</div>
    </section>
  </div>
  ${footerHtml}
</div>` : ""}
</body>
</html>`;
}
