/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SVG chart generators for the Code Finder comparison report.
 *
 * These return SVG *markup strings* rather than JSX so the exact same chart code
 * serves both the on-screen React report (via dangerouslySetInnerHTML) and the
 * printed PDF (raw HTML string) — one implementation, guaranteed identical output.
 * All interpolated text is escaped; all other values are numbers.
 *
 * Palette rationale (validated with the dataviz skill's validator against a white
 * surface): paying = brand green #2b5346, remainder = #8c8c86. That pair clears
 * CVD separation (ΔE 21.3 protan), the normal-vision floor (23.5), and the 3:1
 * contrast floor. The remainder is deliberately a low-chroma neutral — it's the
 * ground in a part-to-whole, not a competing identity — and both segments carry
 * direct labels so identity is never color-alone.
 */

export const CHART_COLORS = {
  paying: "#2b5346",
  remainder: "#8c8c86",
  target: "#c9a000",
  grid: "#ececea",
  axis: "#b0b0aa",
  ink: "#0f0f0f",
  inkMuted: "#8a8a84",
  approx: "#c9a000",
} as const;

const TARGET_CONVERSION = 0.4; // the 40% benchmark used across this app

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Rect path with selectively rounded corners — the dataviz mark spec wants a 4px
 * rounded data-end anchored to the baseline, which a plain <rect rx> can't express
 * (it rounds all four). Segments of a stack round only their outer end.
 */
function barPath(x: number, y: number, w: number, h: number, r: number, corners: "top" | "bottom" | "both" | "none"): string {
  if (h <= 0) return "";
  const rad = Math.max(0, Math.min(r, h / 2, w / 2));
  const top = corners === "top" || corners === "both";
  const bot = corners === "bottom" || corners === "both";
  const rt = top ? rad : 0;
  const rb = bot ? rad : 0;
  return [
    `M${x},${y + rt}`,
    rt ? `Q${x},${y} ${x + rt},${y}` : "",
    `L${x + w - rt},${y}`,
    rt ? `Q${x + w},${y} ${x + w},${y + rt}` : "",
    `L${x + w},${y + h - rb}`,
    rb ? `Q${x + w},${y + h} ${x + w - rb},${y + h}` : "",
    `L${x + rb},${y + h}`,
    rb ? `Q${x},${y + h} ${x},${y + h - rb}` : "",
    "Z",
  ].filter(Boolean).join(" ");
}

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

export interface YearBar {
  year: number | string;
  signups: number | null;
  paying: number | null;
  conversionPct: number | null; // 0..1
  approximate: boolean;
}

/**
 * Part-to-whole stacked column per year: paying customers vs the rest of the
 * signups. Answers the BD team's actual question — "is this event growing, and is
 * it converting?" — in one mark. Total signups labeled above each column,
 * conversion % below the axis label.
 */
export function yearComparisonChart(bars: YearBar[], opts?: { width?: number; height?: number }): string {
  const W = opts?.width ?? 460;
  const H = opts?.height ?? 188;
  const PAD = { t: 22, r: 12, b: 40, l: 40 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  const usable = bars.filter(b => (b.signups ?? 0) > 0);
  if (usable.length === 0) {
    return `<svg viewBox="0 0 ${W} ${H}" class="cf-chart" role="img" aria-label="No signup data available">
      <text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="11" fill="${CHART_COLORS.inkMuted}" font-family="'DM Mono',monospace">No signup data for these codes</text>
    </svg>`;
  }

  const max = niceMax(Math.max(...usable.map(b => b.signups ?? 0)));
  const y = (v: number) => PAD.t + ph - (v / max) * ph;
  const slot = pw / bars.length;
  const barW = Math.min(58, slot * 0.56);

  const gridVals = [0, max * 0.5, max];
  const grid = gridVals.map(v => `
    <line x1="${PAD.l}" y1="${y(v).toFixed(1)}" x2="${PAD.l + pw}" y2="${y(v).toFixed(1)}" stroke="${CHART_COLORS.grid}" stroke-width="1"/>
    <text x="${PAD.l - 6}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="8" fill="${CHART_COLORS.inkMuted}" font-family="'DM Mono',monospace">${v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : v}</text>`).join("");

  const cols = bars.map((b, i) => {
    const cx = PAD.l + slot * i + slot / 2;
    const x = cx - barW / 2;
    const sig = b.signups ?? 0;
    if (sig <= 0) {
      return `<text x="${cx}" y="${PAD.t + ph - 6}" text-anchor="middle" font-size="8" fill="${CHART_COLORS.inkMuted}" font-family="'DM Mono',monospace">no data</text>
        <text x="${cx}" y="${PAD.t + ph + 15}" text-anchor="middle" font-size="10" font-weight="700" fill="${CHART_COLORS.ink}" font-family="'DM Mono',monospace">${esc(String(b.year))}</text>`;
    }
    const pay = Math.max(0, Math.min(b.paying ?? 0, sig));
    const rest = sig - pay;

    const yTop = y(sig);
    const totalH = PAD.t + ph - yTop;
    const payH = sig > 0 ? (pay / sig) * totalH : 0;
    const restH = Math.max(0, totalH - payH);
    // 2px surface gap between stacked segments (dataviz spacer rule)
    const GAP = restH > 3 && payH > 3 ? 2 : 0;
    const payY = PAD.t + ph - payH;
    const restY = yTop;
    const restHAdj = Math.max(0, restH - GAP);

    const convLabel = b.conversionPct != null ? `${b.approximate ? "≈" : ""}${(b.conversionPct * 100).toFixed(0)}%` : "—";

    return `
      ${restHAdj > 0 ? `<path d="${barPath(x, restY, barW, restHAdj, 4, "top")}" fill="${CHART_COLORS.remainder}"/>` : ""}
      ${payH > 0 ? `<path d="${barPath(x, payY, barW, payH, 4, restHAdj > 0 ? "none" : "top")}" fill="${CHART_COLORS.paying}"/>` : ""}
      <text x="${cx}" y="${(yTop - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${CHART_COLORS.ink}" font-family="'DM Mono',monospace">${sig.toLocaleString()}</text>
      <text x="${cx}" y="${PAD.t + ph + 15}" text-anchor="middle" font-size="10" font-weight="700" fill="${CHART_COLORS.ink}" font-family="'DM Mono',monospace">${esc(String(b.year))}</text>
      <text x="${cx}" y="${PAD.t + ph + 27}" text-anchor="middle" font-size="8.5" fill="${b.approximate ? CHART_COLORS.approx : CHART_COLORS.paying}" font-family="'DM Mono',monospace">${convLabel} conv</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" class="cf-chart" role="img" aria-label="Signups and paying customers by year">
    ${grid}
    <line x1="${PAD.l}" y1="${PAD.t + ph}" x2="${PAD.l + pw}" y2="${PAD.t + ph}" stroke="${CHART_COLORS.axis}" stroke-width="1"/>
    ${cols}
  </svg>`;
}

export interface EventConversionRow {
  name: string;
  conversionPct: number | null;
  signups: number | null;
  approximate: boolean;
}

/**
 * Cross-event signup volume — the "how big was it" view, paired with the conversion
 * view so reach and quality are read separately rather than conflated. Single series,
 * one hue, no legend; sorted high→low.
 */
export function signupsComparisonChart(rows: EventConversionRow[], opts?: { width?: number }): string {
  const usable = rows.filter(r => (r.signups ?? 0) > 0);
  if (usable.length === 0) return "";

  const sorted = [...usable].sort((a, b) => (b.signups ?? 0) - (a.signups ?? 0));
  const W = opts?.width ?? 340;
  const rowH = sorted.length <= 4 ? 22 : sorted.length <= 6 ? 18 : 15;
  const PAD = { t: 8, r: 46, b: 8, l: 108 };
  const H = PAD.t + sorted.length * rowH + PAD.b;
  const pw = W - PAD.l - PAD.r;

  const max = Math.max(...sorted.map(r => r.signups ?? 0));
  const bars = sorted.map((r, i) => {
    const cy = PAD.t + i * rowH;
    const barH = Math.min(12, rowH - 4);
    const by = cy + (rowH - barH) / 2;
    const w = Math.max(1, ((r.signups ?? 0) / max) * pw);
    const name = r.name.length > 20 ? r.name.slice(0, 19) + "…" : r.name;
    return `
      <text x="${PAD.l - 8}" y="${(by + barH - 2.5).toFixed(1)}" text-anchor="end" font-size="9" fill="${CHART_COLORS.ink}" font-family="'DM Sans',sans-serif" font-weight="600">${esc(name)}</text>
      <path d="${barPath(PAD.l, by, w, barH, 4, "both")}" fill="${CHART_COLORS.paying}" fill-opacity="0.82"/>
      <text x="${(PAD.l + w + 6).toFixed(1)}" y="${(by + barH - 2.5).toFixed(1)}" font-size="9" font-weight="700" fill="${CHART_COLORS.ink}" font-family="'DM Mono',monospace">${(r.signups ?? 0).toLocaleString()}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" class="cf-chart" role="img" aria-label="Total signups by event, highest first">${bars}</svg>`;
}

export interface TrendPoint {
  year: number | string;
  conversionPct: number | null;
  approximate: boolean;
}

/**
 * One event's conversion across years — a slope line, the clearest read of "is this
 * getting better or worse?" Rendered per event (small multiples) rather than all
 * events on shared axes, which would need a colour per event and turn to spaghetti.
 * Deliberately separate from the volume chart: conversion is a rate and signups are
 * a count, so putting them on one frame would mean two y-scales.
 */
export function conversionTrendChart(points: TrendPoint[], opts?: { width?: number; height?: number }): string {
  const usable = points.filter(p => p.conversionPct != null && p.year !== "—" && p.year !== "No date");
  if (usable.length < 2) return ""; // a trend needs at least two points

  const W = opts?.width ?? 460;
  const H = opts?.height ?? 92;
  const PAD = { t: 20, r: 18, b: 20, l: 34 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  const vals = usable.map(p => p.conversionPct ?? 0);
  const rawMax = Math.max(...vals, TARGET_CONVERSION);
  const max = Math.min(1, Math.ceil(rawMax * 10) / 10 + 0.05);
  const y = (v: number) => PAD.t + ph - (v / max) * ph;
  const x = (i: number) => usable.length === 1 ? PAD.l + pw / 2 : PAD.l + (i / (usable.length - 1)) * pw;

  const path = usable.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.conversionPct ?? 0).toFixed(1)}`).join(" ");
  const showTarget = TARGET_CONVERSION <= max;

  const pts = usable.map((p, i) => {
    const cx = x(i), cy = y(p.conversionPct ?? 0);
    const label = `${p.approximate ? "≈" : ""}${((p.conversionPct ?? 0) * 100).toFixed(0)}%`;
    // Keep the last label from running off the right edge
    const anchor = i === usable.length - 1 && usable.length > 1 ? "end" : i === 0 && usable.length > 1 ? "start" : "middle";
    return `
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${CHART_COLORS.paying}" stroke="#fff" stroke-width="2"/>
      <text x="${cx.toFixed(1)}" y="${(cy - 8).toFixed(1)}" text-anchor="${anchor}" font-size="8.5" font-weight="700" fill="${p.approximate ? CHART_COLORS.approx : CHART_COLORS.paying}" font-family="'DM Mono',monospace">${label}</text>
      <text x="${cx.toFixed(1)}" y="${(PAD.t + ph + 13).toFixed(1)}" text-anchor="${anchor}" font-size="8" fill="${CHART_COLORS.inkMuted}" font-family="'DM Mono',monospace">${esc(String(p.year))}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" class="cf-chart" role="img" aria-label="Conversion rate trend across years">
    ${showTarget ? `
      <line x1="${PAD.l}" y1="${y(TARGET_CONVERSION).toFixed(1)}" x2="${PAD.l + pw}" y2="${y(TARGET_CONVERSION).toFixed(1)}" stroke="${CHART_COLORS.target}" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>
      <text x="${PAD.l - 5}" y="${(y(TARGET_CONVERSION) + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="${CHART_COLORS.target}" font-family="'DM Mono',monospace">40%</text>` : ""}
    <path d="${path}" fill="none" stroke="${CHART_COLORS.paying}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts}
  </svg>`;
}

/**
 * Cross-event conversion comparison — horizontal bars, sorted high→low, against
 * the 40% target. Single series, so one hue and no legend; the target line is the
 * only reference mark. This is the report's lead visual: "which of these events
 * actually converts?"
 */
export function conversionComparisonChart(rows: EventConversionRow[], opts?: { width?: number }): string {
  const usable = rows.filter(r => r.conversionPct != null);
  if (usable.length === 0) return "";

  const sorted = [...usable].sort((a, b) => (b.conversionPct ?? 0) - (a.conversionPct ?? 0));
  const W = opts?.width ?? 940;
  // Height is rows × rowH, and the SVG scales by width — so a long list in a narrow
  // rail gets very tall. Tighten the rows as the list grows to keep it bounded.
  const rowH = sorted.length <= 4 ? 26 : sorted.length <= 6 ? 20 : 16;
  const PAD = { t: 26, r: 54, b: 22, l: 190 };
  const H = PAD.t + sorted.length * rowH + PAD.b;
  const pw = W - PAD.l - PAD.r;

  const maxPct = Math.max(0.5, ...sorted.map(r => r.conversionPct ?? 0));
  const x = (v: number) => (v / maxPct) * pw;

  const targetX = PAD.l + x(TARGET_CONVERSION);
  const showTarget = TARGET_CONVERSION <= maxPct;

  const bars = sorted.map((r, i) => {
    const cy = PAD.t + i * rowH;
    const barH = Math.min(13, rowH - 5);
    const by = cy + (rowH - barH) / 2 - 2;
    const w = Math.max(1, x(r.conversionPct ?? 0));
    const label = `${r.approximate ? "≈" : ""}${((r.conversionPct ?? 0) * 100).toFixed(1)}%`;
    const name = r.name.length > 30 ? r.name.slice(0, 29) + "…" : r.name;
    return `
      <text x="${PAD.l - 10}" y="${(by + barH - 2).toFixed(1)}" text-anchor="end" font-size="10" fill="${CHART_COLORS.ink}" font-family="'DM Sans',sans-serif" font-weight="600">${esc(name)}</text>
      <path d="${barPath(PAD.l, by, w, barH, 4, "both")}" fill="${CHART_COLORS.paying}"/>
      <text x="${(PAD.l + w + 7).toFixed(1)}" y="${(by + barH - 2).toFixed(1)}" font-size="9.5" font-weight="700" fill="${r.approximate ? CHART_COLORS.approx : CHART_COLORS.ink}" font-family="'DM Mono',monospace">${label}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" class="cf-chart" role="img" aria-label="Conversion rate by event, sorted highest to lowest">
    ${showTarget ? `
      <line x1="${targetX.toFixed(1)}" y1="${PAD.t - 8}" x2="${targetX.toFixed(1)}" y2="${PAD.t + sorted.length * rowH - 4}" stroke="${CHART_COLORS.target}" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.75"/>
      <text x="${targetX.toFixed(1)}" y="${PAD.t - 13}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${CHART_COLORS.target}" font-family="'DM Mono',monospace">40% target</text>` : ""}
    ${bars}
  </svg>`;
}

/** Legend markup for the stacked year chart — required whenever ≥2 series render. */
export function yearChartLegend(): string {
  return `<div class="cf-legend">
    <span class="cf-legend-item"><span class="cf-swatch" style="background:${CHART_COLORS.paying}"></span>Paying customers</span>
    <span class="cf-legend-item"><span class="cf-swatch" style="background:${CHART_COLORS.remainder}"></span>Signed up, didn't convert</span>
  </div>`;
}
