/**
 * Channel Intelligence — "Reach & Yield"
 *
 * This tab used to be a revenue/LTV view. The 2026 Looker export carries no LTV or
 * spend columns, so the tab is built on what the data actually proves: how many
 * people each channel reaches (signups) and how many of those become paying
 * customers (yield). Every mark on this page uses the same encoding —
 * width = reach, fill = yield, so filled area = paying customers acquired.
 *
 * Real LTV only appears when summary.hasLtvData is true (legacy Client LTV uploads),
 * as a clearly-labelled bonus section — never as the backbone.
 */

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Compass, DollarSign, Layers, MapPin, Sparkles } from "lucide-react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import PortfolioSummaryWidget from "../components/PortfolioSummaryWidget";
import { MetricInfo } from "../../../components/MetricInfo";

interface RevenueTabProps {
  summary: KPIReportSummary;
  foundReports: AnalyzedCodeReport[];
  channelSummary: ChannelSummary[];
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  Strong: "#2b5346",
  Good: "#3d7060",
  Average: "#c9a000",
  Weak: "#c87a3c",
  Poor: "#c84040",
};
const TIER_ORDER = ["Strong", "Good", "Average", "Weak", "Poor"];

/** Index-matched channel palettes: one reads on white, one reads on the dark hero. */
const CHANNEL_INK = ["#2b5346", "#c9a000", "#4d8970", "#9b4a1c", "#6b8e9f", "#8a6f00", "#b0662f", "#5a5a5a"];
const CHANNEL_LIT = ["#8ec0ab", "#e7bd27", "#b9d8c9", "#e0a06c", "#a9c6d4", "#d8bd52", "#e8b184", "#c4c4c4"];

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
  NS: "#5a5a5a", NB: "#888888",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#2b5346";

const TARGET_CONV = 40;

/** "BusinessDevelopment" → "Business Development" */
function prettyChannel(name: string): string {
  return (name || "Direct / Unknown").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
}
function shortChannel(name: string, max = 15): string {
  const p = prettyChannel(name);
  return p.length > max ? p.slice(0, max - 1) + "…" : p;
}

type Segment = "scale" | "leaky" | "underbooked" | "prune";
const SEGMENT_META: Record<Segment, { label: string; color: string; note: string }> = {
  scale:       { label: "Scale",       color: "#2b5346", note: "closes above blended, at volume" },
  leaky:       { label: "Leaky",       color: "#c87a3c", note: "big reach, weak close" },
  underbooked: { label: "Under-booked", color: "#c9a000", note: "strong close, small room" },
  prune:       { label: "Review",      color: "#a8a8a8", note: "below on both" },
};
function segmentOf(conv: number, signups: number, convLine: number, volLine: number): Segment {
  const hiConv = conv >= convLine;
  const hiVol  = signups >= volLine;
  if (hiConv && hiVol) return "scale";
  if (!hiConv && hiVol) return "leaky";
  if (hiConv && !hiVol) return "underbooked";
  return "prune";
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

interface ChannelRow {
  channel: string;
  codeCount: number;
  signups: number;
  paying: number;
  yield: number;   // blended: paying / signups
  ink: string;
  lit: string;
}

// ── Signature: the reach × yield strip (a Marimekko band) ─────────────────────
// Segment width  = share of total signups (reach)
// Fill height    = that channel's blended conversion (yield)
// → filled area  = paying customers acquired. One mark, both dimensions, no lying.
function ReachYieldStrip({ rows, totalSignups }: { rows: ChannelRow[]; totalSignups: number }) {
  if (rows.length === 0 || totalSignups <= 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[8px] md:text-[8.5px] font-mono uppercase tracking-[0.16em] text-white/35">
          Fill height = % converted
        </span>
        <span className="text-[8px] md:text-[8.5px] font-mono uppercase tracking-[0.16em] text-white/35">
          Width = share of signups
        </span>
      </div>

      <div className="flex w-full h-[74px] md:h-[92px]">
        {rows.map(row => {
          const widthPct = (row.signups / totalSignups) * 100;
          const wide = widthPct >= 13;
          return (
            <div
              key={row.channel}
              className="relative h-full shrink-0"
              style={{ width: `${widthPct}%` }}
              title={`${prettyChannel(row.channel)} — ${row.signups.toLocaleString()} signups · ${row.paying.toLocaleString()} paying · ${row.yield.toFixed(1)}% yield`}
            >
              <div className="absolute inset-y-0 left-0 right-[2px] rounded-[3px] overflow-hidden bg-white/[0.07]">
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{ height: `${Math.min(row.yield, 100)}%`, backgroundColor: row.lit }}
                />
                {wide && (
                  <span className="absolute left-1.5 top-1.5 text-[8.5px] md:text-[9px] font-mono font-bold text-white/75 leading-none">
                    {row.yield.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend — carries the colour key used by every card below */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-white/[0.09]">
        {rows.map(row => (
          <span key={row.channel} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: row.lit }} />
            <span className="text-[9.5px] font-mono text-white/70 truncate">{shortChannel(row.channel, 18)}</span>
            <span className="text-[9.5px] font-mono text-white/35">{row.signups.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Code Yield Map (repurposed scatter: conversion × signup volume) ───────────
interface HoveredBubble {
  key: string;
  report: AnalyzedCodeReport;
  color: string;
}

function CodeYieldMap({
  reports, convLine, volLine,
}: { reports: AnalyzedCodeReport[]; convLine: number; volLine: number }) {
  const [hovered,     setHovered]     = useState<HoveredBubble | null>(null);
  const [mousePos,    setMousePos]    = useState({ x: 0, y: 0 });
  const [activeTiers, setActiveTiers] = useState<Set<string>>(() => new Set(TIER_ORDER));

  const pool = reports.filter(r => r.Signups >= 5);
  const eligibleReports = pool.length >= 4 ? pool : reports;
  if (eligibleReports.length === 0) return null;

  const W = 700, H = 430;
  const PAD = { t: 46, r: 46, b: 62, l: 62 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  const maxConvRaw = Math.max(...eligibleReports.map(r => r.calculatedConversion), 1);
  const maxSig     = Math.max(...eligibleReports.map(r => r.Signups), 1);
  const maxPaying  = Math.max(...eligibleReports.map(r => r["Paying cx"]), 1);
  const maxConv    = Math.max(Math.ceil(maxConvRaw / 10) * 10 + 10, 50);

  const xs = (v: number) => (v / maxConv) * pw;
  // √ scale on volume: signup counts are heavy-tailed, a linear axis buries the pack.
  const ys = (v: number) => ph - (Math.sqrt(Math.max(v, 0)) / Math.sqrt(maxSig)) * ph;
  const br = (p: number) => 6.5 + (Math.sqrt(p) / Math.sqrt(maxPaying)) * 17;

  const xTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80].filter(v => v <= maxConv);
  const yTicks = [0, 10, 25, 50, 100, 200, 400, 800, 1500, 3000, 6000, 12000].filter(v => v <= maxSig * 0.98);

  const showConvLine = convLine > 0 && convLine <= maxConv;
  const showVolLine  = volLine  > 0 && volLine  <= maxSig;

  const topCodes = new Set(
    [...eligibleReports].sort((a, b) => b["Paying cx"] - a["Paying cx"]).slice(0, 8)
      .map(r => r.discount_code + (r.Province ?? "")),
  );

  const presentTiers = TIER_ORDER.filter(t => eligibleReports.some(r => r.performanceRating === t));
  const filteredReports = eligibleReports.filter(r => activeTiers.has(r.performanceRating));

  function toggleTier(tier: string) {
    setActiveTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) {
        if (next.size === 1) return prev;
        next.delete(tier);
      } else next.add(tier);
      return next;
    });
  }

  const hoveredSeg = hovered
    ? SEGMENT_META[segmentOf(hovered.report.calculatedConversion, hovered.report.Signups, convLine, volLine)]
    : null;

  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
      <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #1e3d31 0%, #2b5346 40%, #4d8970 75%, #86b09e 100%)" }} />

      <div className="px-4 md:px-6 pt-5 pb-0">
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#eef4f1] flex items-center justify-center shrink-0">
              <Compass className="w-3.5 h-3.5 text-[#2b5346]" />
            </div>
            Code Yield Map
            <MetricInfo
              text="Every bubble is one promo code. Right = converts well. Up = reached a lot of people. Bubble size = paying customers won. The two dashed lines are the portfolio's own blended conversion and median event size, so each quadrant always has codes in it."
              side="bottom"
            />
          </h3>
          <p className="text-[10.5px] md:text-[11px] text-[#a8a8a8] font-mono mt-1.5 leading-relaxed">
            X = conversion &nbsp;·&nbsp; Y = signups (√ scale) &nbsp;·&nbsp; size = paying customers
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-[#f5f5f3]">
          <span className="text-[9px] text-[#c8c8c8] font-mono uppercase tracking-widest">Filter:</span>
          {presentTiers.map(tier => {
            const active = activeTiers.has(tier);
            const count  = eligibleReports.filter(r => r.performanceRating === tier).length;
            return (
              <button
                key={tier}
                onClick={() => toggleTier(tier)}
                className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-[10px] font-semibold font-mono cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2b5346]/30"
                style={{
                  backgroundColor: active ? TIER_COLOR[tier] + "15" : "#f5f5f5",
                  color:           active ? TIER_COLOR[tier] : "#c0c0c0",
                  border:          `1.5px solid ${active ? TIER_COLOR[tier] + "55" : "#ebebeb"}`,
                }}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: active ? TIER_COLOR[tier] : "#d8d8d8" }} />
                {tier}
                <span className="opacity-50 text-[9px]">{count}</span>
              </button>
            );
          })}
          {activeTiers.size < presentTiers.length && (
            <button onClick={() => setActiveTiers(new Set(TIER_ORDER))} className="text-[9px] text-[#2b5346] font-mono cursor-pointer hover:underline ml-1">
              show all
            </button>
          )}
        </div>
      </div>

      <div className="px-2 md:px-4 pb-5 pt-3 relative overflow-x-auto" onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>
        <div className="min-w-[600px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
            <defs>
              <pattern id="ym-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="0.85" fill="#e2e2e0" />
              </pattern>
              <filter id="ym-glow" x="-70%" y="-70%" width="240%" height="240%">
                <feDropShadow dx="0" dy="4" stdDeviation="7" floodOpacity="0.20" />
              </filter>
            </defs>

            <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="#f9f9f8" rx="7" />
            <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="url(#ym-dots)" rx="7" />

            {/* Scale quadrant tint */}
            {showConvLine && showVolLine && (
              <rect
                x={PAD.l + xs(convLine)} y={PAD.t}
                width={pw - xs(convLine)} height={ys(volLine)}
                fill="#2b5346" fillOpacity="0.045"
              />
            )}

            {yTicks.map(v => (
              <line key={`yg${v}`} x1={PAD.l + 1} y1={PAD.t + ys(v)} x2={PAD.l + pw - 1} y2={PAD.t + ys(v)} stroke="#eeeeed" strokeWidth="1" />
            ))}
            {xTicks.filter(v => v > 0).map(v => (
              <line key={`xg${v}`} x1={PAD.l + xs(v)} y1={PAD.t + 1} x2={PAD.l + xs(v)} y2={PAD.t + ph - 1} stroke="#f0f0ee" strokeWidth="1" />
            ))}

            {/* Quadrant names — the actual decision each corner implies */}
            {showConvLine && showVolLine && (<>
              <text x={PAD.l + pw - 12} y={PAD.t + 20}      fontSize="9.5" fill="#2b5346" fillOpacity="0.42" textAnchor="end"   fontFamily="monospace" fontWeight="700">SCALE ↗</text>
              <text x={PAD.l + 12}      y={PAD.t + 20}      fontSize="9"   fill="#c87a3c" fillOpacity="0.42" textAnchor="start" fontFamily="monospace">leaky funnel</text>
              <text x={PAD.l + pw - 12} y={PAD.t + ph - 12} fontSize="9"   fill="#c9a000" fillOpacity="0.50" textAnchor="end"   fontFamily="monospace">under-booked</text>
              <text x={PAD.l + 12}      y={PAD.t + ph - 12} fontSize="9"   fill="#bbbbbb" fillOpacity="0.60" textAnchor="start" fontFamily="monospace">review</text>
            </>)}

            {/* Blended conversion divider */}
            {showConvLine && (
              <g>
                <line x1={PAD.l + xs(convLine)} y1={PAD.t} x2={PAD.l + xs(convLine)} y2={PAD.t + ph}
                  stroke="#2b5346" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.26" />
                <rect x={PAD.l + xs(convLine) - 42} y={PAD.t - 2} width={84} height={19} rx="9" fill="#eef4f1" />
                <text x={PAD.l + xs(convLine)} y={PAD.t + 13} fontSize="8.5" fill="#2b5346" fillOpacity="0.78" textAnchor="middle" fontFamily="monospace" fontWeight="600">
                  blended {convLine.toFixed(1)}%
                </text>
              </g>
            )}

            {/* Median event size divider */}
            {showVolLine && (
              <g>
                <line x1={PAD.l} y1={PAD.t + ys(volLine)} x2={PAD.l + pw} y2={PAD.t + ys(volLine)}
                  stroke="#888888" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.22" />
                <rect x={PAD.l + pw - 96} y={PAD.t + ys(volLine) - 19} width={96} height="19" rx="9" fill="#f2f2f0" />
                <text x={PAD.l + pw - 48} y={PAD.t + ys(volLine) - 6} fontSize="8.5" fill="#7a7a7a" textAnchor="middle" fontFamily="monospace">
                  median {Math.round(volLine)} signups
                </text>
              </g>
            )}

            <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="none" stroke="#e2e2e0" strokeWidth="1.5" rx="7" />

            {xTicks.map(v => (
              <g key={`xt${v}`}>
                <line x1={PAD.l + xs(v)} y1={PAD.t + ph} x2={PAD.l + xs(v)} y2={PAD.t + ph + 6} stroke="#d4d4d2" />
                <text x={PAD.l + xs(v)} y={PAD.t + ph + 21} fontSize="10.5" fill="#b4b4b2" textAnchor="middle" fontFamily="monospace">{v}%</text>
              </g>
            ))}
            {yTicks.filter(v => v > 0).map(v => (
              <text key={`yt${v}`} x={PAD.l - 10} y={PAD.t + ys(v) + 4} fontSize="10.5" fill="#b4b4b2" textAnchor="end" fontFamily="monospace">
                {v >= 1000 ? `${v / 1000}k` : v}
              </text>
            ))}

            <text x={PAD.l + pw / 2} y={H - 9} fontSize="10" fill="#c8c8c6" textAnchor="middle" fontFamily="monospace" fontStyle="italic">
              Conversion rate →
            </text>
            <text transform={`translate(15, ${PAD.t + ph / 2}) rotate(-90)`} fontSize="10" fill="#c8c8c6" textAnchor="middle" fontFamily="monospace" fontStyle="italic">
              Signups →
            </text>

            {[...filteredReports]
              .sort((a, b) => {
                const ak = `${a.discount_code}${a.Province ?? ""}`;
                const bk = `${b.discount_code}${b.Province ?? ""}`;
                if (hovered?.key === ak) return 1;
                if (hovered?.key === bk) return -1;
                return b["Paying cx"] - a["Paying cx"];
              })
              .map((r, i) => {
                const cx    = PAD.l + xs(Math.min(r.calculatedConversion, maxConv));
                const cy    = PAD.t + ys(Math.min(r.Signups, maxSig));
                const rad   = br(r["Paying cx"]);
                const color = TIER_COLOR[r.performanceRating] || "#b0b0ae";
                const key   = `${r.discount_code}${r.Province ?? ""}`;
                const isHov = hovered?.key === key;

                return (
                  <g key={`${key}-${i}`}
                    onMouseEnter={() => setHovered({ key, report: r, color })}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: "default" }}
                  >
                    {isHov && <circle cx={cx} cy={cy} r={rad + 12} fill={color} fillOpacity="0.07" />}
                    <circle cx={cx} cy={cy} r={isHov ? rad + 3.5 : rad + 1} fill="white" />
                    <circle
                      cx={cx} cy={cy} r={isHov ? rad + 3.5 : rad}
                      fill={color} fillOpacity={isHov ? 0.92 : 0.74}
                      stroke="white" strokeWidth={isHov ? 2.5 : 2}
                      filter={isHov ? "url(#ym-glow)" : undefined}
                      style={{ transition: "r 150ms ease, fill-opacity 150ms ease" }}
                    />
                    {topCodes.has(key) && !isHov && (
                      <text x={cx} y={cy - rad - 8} fontSize="8" fill="#1a1a1a" textAnchor="middle"
                        fontFamily="monospace" fontWeight="700" style={{ pointerEvents: "none", userSelect: "none" }}>
                        {r.discount_code.length > 13 ? r.discount_code.slice(0, 13) + "…" : r.discount_code}
                      </text>
                    )}
                    {!isHov && (
                      <title>{r.discount_code} · {r.calculatedConversion.toFixed(1)}% · {r.Signups} signups · {r["Paying cx"]} paying</title>
                    )}
                  </g>
                );
              })}
          </svg>
        </div>

        <p className="md:hidden text-[9px] font-mono text-[#c0c0c0] mt-2 px-2">Scroll sideways to see the full map →</p>

        {hovered && hoveredSeg && (
          <div className="fixed z-50 pointer-events-none hidden md:block" style={{ left: mousePos.x + 20, top: mousePos.y - 16 }}>
            <div className="rounded-xl overflow-hidden" style={{
              width: 218,
              boxShadow: "0 12px 32px rgba(0,0,0,0.14), 0 3px 8px rgba(0,0,0,0.07)",
              border: "1.5px solid #e8e8e6",
              backgroundColor: "white",
            }}>
              <div style={{ height: 5, backgroundColor: hovered.color }} />
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="font-mono font-bold text-[13px] text-[#0f0f0f] leading-tight break-all">{hovered.report.discount_code}</p>
                  <span className="shrink-0 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap"
                    style={{ backgroundColor: hovered.color + "18", color: hovered.color }}>
                    {hovered.report.performanceRating}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-3">
                  {[
                    { label: "Conversion", value: `${hovered.report.calculatedConversion.toFixed(1)}%`, accent: true },
                    { label: "Signups",    value: hovered.report.Signups.toLocaleString(),              accent: false },
                    { label: "Paying cx",  value: hovered.report["Paying cx"].toLocaleString(),         accent: false },
                    { label: "Grade",      value: hovered.report.performanceGrade,                      accent: false },
                  ].map(({ label, value, accent }) => (
                    <div key={label}>
                      <p className="text-[8px] text-[#b8b8b8] font-mono uppercase tracking-wider leading-none mb-0.5">{label}</p>
                      <p className="text-[13px] font-bold font-mono leading-none" style={{ color: accent ? hovered.color : "#1a1a1a" }}>{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#a8a8a8] font-mono mb-3 truncate">
                  {prettyChannel(hovered.report.channel)}{hovered.report.Province ? ` · ${hovered.report.Province}` : ""}
                </p>
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#f2f2f0]">
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: hoveredSeg.color + "16", color: hoveredSeg.color }}>
                    {hoveredSeg.label}
                  </span>
                  <span className="text-[8.5px] font-mono" style={{ color: hovered.report.calculatedConversion >= TARGET_CONV ? "#2b5346" : "#c0c0c0" }}>
                    {hovered.report.calculatedConversion >= TARGET_CONV
                      ? "hits 40% target"
                      : `${(TARGET_CONV - hovered.report.calculatedConversion).toFixed(1)} pts off 40%`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Province × Channel matrix ─────────────────────────────────────────────────
function ProvinceChannelMatrix({
  reports, channels,
}: { reports: AnalyzedCodeReport[]; channels: ChannelRow[] }) {
  const { provinces, grid, columns } = useMemo(() => {
    const cols = channels.slice(0, 5);
    const colKeys = new Set(cols.map(c => c.channel));

    const reach = new Map<string, number>();
    const g = new Map<string, { signups: number; paying: number }>();
    for (const r of reports) {
      const p = (r.Province ?? "").trim();
      if (!p) continue;
      reach.set(p, (reach.get(p) ?? 0) + r.Signups);
      const key = `${p}|${colKeys.has(r.channel) ? r.channel : "__other"}`;
      const cell = g.get(key) ?? { signups: 0, paying: 0 };
      g.set(key, { signups: cell.signups + r.Signups, paying: cell.paying + r["Paying cx"] });
    }

    const hasOther = Array.from(g.keys()).some(k => k.endsWith("|__other"));
    return {
      provinces: Array.from(reach.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p),
      grid: g,
      columns: [
        ...cols.map(c => ({ key: c.channel, label: shortChannel(c.channel, 13), ink: c.ink })),
        ...(hasOther ? [{ key: "__other", label: "Other", ink: "#a8a8a8" }] : []),
      ],
    };
  }, [reports, channels]);

  if (provinces.length < 2) return null;

  const cellsFlat = provinces.flatMap(p => columns.map(c => grid.get(`${p}|${c.key}`)).filter(Boolean) as { signups: number; paying: number }[]);
  const maxConv = Math.max(...cellsFlat.map(c => (c.signups > 0 ? (c.paying / c.signups) * 100 : 0)), 1);

  const rowTotal = (p: string) => columns.reduce((acc, c) => {
    const cell = grid.get(`${p}|${c.key}`);
    return cell ? { signups: acc.signups + cell.signups, paying: acc.paying + cell.paying } : acc;
  }, { signups: 0, paying: 0 });

  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
      <div className="px-4 md:px-6 pt-5 pb-4">
        <h3 className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#eef4f1] flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#2b5346]" />
          </div>
          Where each channel actually works
          <MetricInfo text="Conversion rate for every province × channel pair. Darker green = converts better. The small number is signups behind that rate — treat pale, low-signup cells as noise, not signal." side="bottom" />
        </h3>
        <p className="text-[10.5px] md:text-[11px] text-[#a8a8a8] font-mono mt-1.5">
          Conversion % · signups underneath · darker = closes better
        </p>
      </div>

      <div className="overflow-x-auto border-t border-[#f0f0f0]">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="bg-[#fcfcfb]">
              <th className="text-left px-4 md:px-6 py-2.5 text-[9px] font-mono uppercase tracking-widest text-[#a8a8a8] font-medium">Province</th>
              {columns.map(c => (
                <th key={c.key} className="px-2 py-2.5 text-[9px] font-mono uppercase tracking-wider text-[#8a8a8a] font-medium text-center">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: c.ink }} />
                    {c.label}
                  </span>
                </th>
              ))}
              <th className="px-3 md:px-5 py-2.5 text-[9px] font-mono uppercase tracking-widest text-[#a8a8a8] font-medium text-right">All</th>
            </tr>
          </thead>
          <tbody>
            {provinces.map(p => {
              const tot = rowTotal(p);
              const totConv = tot.signups > 0 ? (tot.paying / tot.signups) * 100 : 0;
              return (
                <tr key={p} className="border-t border-[#f5f5f3]">
                  <td className="px-4 md:px-6 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-[3px] h-4 rounded-full" style={{ backgroundColor: provColor(p) }} />
                      <span className="font-mono font-bold text-[12px] text-[#1a1a1a]">{p}</span>
                    </span>
                  </td>
                  {columns.map(c => {
                    const cell = grid.get(`${p}|${c.key}`);
                    if (!cell || cell.signups === 0) {
                      return <td key={c.key} className="px-2 py-2 text-center text-[11px] font-mono text-[#e0e0de]">–</td>;
                    }
                    const conv = (cell.paying / cell.signups) * 100;
                    const alpha = 0.05 + (conv / maxConv) * 0.62;
                    const dark = alpha > 0.42;
                    return (
                      <td key={c.key} className="px-1.5 py-1.5 text-center">
                        <div className="rounded-md py-1.5 px-1" style={{ backgroundColor: `rgba(43, 83, 70, ${alpha.toFixed(3)})` }}>
                          <p className="text-[12px] font-bold font-mono leading-none" style={{ color: dark ? "#ffffff" : "#1a1a1a" }}>
                            {conv.toFixed(0)}%
                          </p>
                          <p className="text-[8.5px] font-mono leading-none mt-1" style={{ color: dark ? "rgba(255,255,255,0.6)" : "#a8a8a8" }}>
                            {cell.signups.toLocaleString()}
                          </p>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 md:px-5 py-2.5 text-right">
                    <p className="text-[12px] font-bold font-mono text-[#2b5346] leading-none">{totConv.toFixed(1)}%</p>
                    <p className="text-[8.5px] font-mono text-[#a8a8a8] leading-none mt-1">{tot.signups.toLocaleString()} signups</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function RevenueTab({ summary, foundReports, channelSummary }: RevenueTabProps): React.ReactElement {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [ltvOpen,      setLtvOpen]      = useState(false);

  const prefersReduced = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fadeUp = (delay: number) => (prefersReduced ? {} : {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.24, delay, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  });

  // Channel rows — prefer the supplied ChannelSummary, fall back to deriving from codes.
  const channelRows: ChannelRow[] = useMemo(() => {
    const base = channelSummary.length > 0
      ? channelSummary.map(c => ({
          channel: c.channel,
          codeCount: c.codeCount,
          signups: c.totalSignups,
          paying: c.totalPayingCustomers,
        }))
      : Array.from(
          foundReports.reduce((map, r) => {
            const key = r.channel || "Direct / Unknown";
            const ex = map.get(key) ?? { channel: key, codeCount: 0, signups: 0, paying: 0 };
            map.set(key, { channel: key, codeCount: ex.codeCount + 1, signups: ex.signups + r.Signups, paying: ex.paying + r["Paying cx"] });
            return map;
          }, new Map<string, { channel: string; codeCount: number; signups: number; paying: number }>()).values(),
        );

    return base
      .filter(c => c.signups > 0 || c.paying > 0)
      .sort((a, b) => b.paying - a.paying || b.signups - a.signups)
      .map((c, i) => ({
        ...c,
        yield: c.signups > 0 ? (c.paying / c.signups) * 100 : 0,
        ink: CHANNEL_INK[i % CHANNEL_INK.length],
        lit: CHANNEL_LIT[i % CHANNEL_LIT.length],
      }));
  }, [channelSummary, foundReports]);

  // Strip: keep the top 6 channels, roll the tail into one honest "Other" band.
  const stripRows: ChannelRow[] = useMemo(() => {
    const byReach = [...channelRows].sort((a, b) => b.signups - a.signups);
    if (byReach.length <= 6) return byReach;
    const head = byReach.slice(0, 6);
    const tail = byReach.slice(6);
    const signups = tail.reduce((s, c) => s + c.signups, 0);
    const paying  = tail.reduce((s, c) => s + c.paying, 0);
    return [...head, {
      channel: `Other (${tail.length})`,
      codeCount: tail.reduce((s, c) => s + c.codeCount, 0),
      signups, paying,
      yield: signups > 0 ? (paying / signups) * 100 : 0,
      ink: "#a8a8a8", lit: "#c4c4c4",
    }];
  }, [channelRows]);

  const totalSignups = channelRows.reduce((s, c) => s + c.signups, 0) || summary.totalSignups;
  const maxChannelSignups = Math.max(...channelRows.map(c => c.signups), 1);

  const convLine = summary.blendedConversionRate;
  const volLine  = useMemo(() => median(foundReports.map(r => r.Signups)), [foundReports]);

  const provinceCount = useMemo(
    () => new Set(foundReports.map(r => (r.Province ?? "").trim()).filter(Boolean)).size,
    [foundReports],
  );

  const bestChannel = useMemo(() => {
    const meaningful = channelRows.filter(c => c.signups >= Math.max(20, totalSignups * 0.05));
    const pool = meaningful.length > 0 ? meaningful : channelRows;
    return [...pool].sort((a, b) => b.yield - a.yield)[0] ?? null;
  }, [channelRows, totalSignups]);

  // LTV bonus section data — only ever read when hasLtvData is true.
  const ltvLeaders = useMemo(
    () => (summary.hasLtvData ? [...foundReports].sort((a, b) => b["Sum LTV 12"] - a["Sum LTV 12"]).slice(0, 8) : []),
    [foundReports, summary.hasLtvData],
  );
  const maxLtvSum = ltvLeaders[0]?.["Sum LTV 12"] ?? 1;

  if (foundReports.length === 0) {
    return (
      <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 md:gap-5 max-w-6xl mx-auto w-full">
        <div>
          <p className="text-[9px] font-mono text-[#2b5346] uppercase tracking-[0.2em] mb-1">Channel Intelligence</p>
          <h2 className="text-[18px] font-black text-[#0f0f0f] leading-tight tracking-tight">Reach &amp; Yield</h2>
        </div>
        <div className="bg-white rounded-xl md:rounded-2xl border border-dashed border-[#d8ddda] p-8 text-center">
          <p className="text-sm font-semibold text-[#1a1a1a]">No matched codes yet</p>
          <p className="text-[12px] text-[#a1a1a1] mt-1.5 max-w-sm mx-auto leading-relaxed">
            Add promo codes that exist in the active database, and this tab will show which channels reach the most people and which ones actually close them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 pb-24 md:pb-5 flex flex-col gap-4 md:gap-5 max-w-6xl mx-auto w-full">

      {/* Page header */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-mono text-[#2b5346] uppercase tracking-[0.2em] mb-1">Channel Intelligence</p>
          <h2 className="text-[18px] font-black text-[#0f0f0f] leading-tight tracking-tight">
            {summary.totalPayingCustomers.toLocaleString()}
            <span className="text-[13px] font-medium text-[#a8a8a8] ml-2 tracking-normal">paying customers won</span>
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0 pt-1">
          {[
            { label: "signups", val: summary.totalSignups.toLocaleString() },
            { label: "blended yield", val: `${summary.blendedConversionRate.toFixed(1)}%` },
            { label: "channels", val: `${channelRows.length}` },
          ].map(({ label, val }) => (
            <div key={label} className="text-right">
              <p className="text-[11px] font-bold font-mono text-[#1a1a1a]">{val}</p>
              <p className="text-[8px] text-[#b8b8b8] font-mono uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Hero — the thesis: reach on one axis, yield on the other, in a single band */}
      <motion.div {...fadeUp(0.04)} className="rounded-xl md:rounded-2xl overflow-hidden shadow-md"
        style={{ background: "linear-gradient(135deg, #142b22 0%, #2b5346 55%, #3a6b58 100%)" }}>
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[9px] text-white/35 font-mono uppercase tracking-[0.18em]">Reach &amp; Yield</p>
            <p className="text-[9px] text-white/30 font-mono uppercase tracking-[0.14em] text-right">
              {summary.numCodesFound} codes · {channelRows.length} channel{channelRows.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mt-4">
            <div>
              <p className="text-[8.5px] text-white/35 uppercase tracking-widest font-mono mb-1.5">Paying customers acquired</p>
              <p className="text-[2.25rem] md:text-[3rem] font-black font-mono text-white leading-none tracking-tight">
                {summary.totalPayingCustomers.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-6 md:gap-8 mb-1">
              <div>
                <p className="text-[8.5px] text-white/35 uppercase tracking-widest font-mono mb-1">From signups</p>
                <p className="text-base md:text-lg font-semibold font-mono text-white/70 leading-none">{summary.totalSignups.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[8.5px] text-white/35 uppercase tracking-widest font-mono mb-1">Blended yield</p>
                <p className="text-base md:text-lg font-semibold font-mono text-white/70 leading-none">{summary.blendedConversionRate.toFixed(1)}%</p>
              </div>
              {bestChannel && (
                <div className="hidden sm:block">
                  <p className="text-[8.5px] text-white/35 uppercase tracking-widest font-mono mb-1">Best closer</p>
                  <p className="text-base md:text-lg font-semibold font-mono leading-none" style={{ color: bestChannel.lit }}>
                    {bestChannel.yield.toFixed(1)}%
                    <span className="text-[10px] text-white/40 ml-1.5 font-normal">{shortChannel(bestChannel.channel, 14)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 md:px-6 pb-5 md:pb-6">
          <ReachYieldStrip rows={stripRows} totalSignups={totalSignups} />
        </div>
      </motion.div>

      {/* Channel board — same encoding as the hero band, ranked */}
      <motion.div {...fadeUp(0.08)} className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 pt-5 pb-4 border-b border-[#f0f0f0]">
          <h3 className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#eef4f1] flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 text-[#2b5346]" />
            </div>
            Channel board
            <MetricInfo text="Bar length is that channel's share of reach against the biggest channel. The solid part is the share of those signups that started paying — so the coloured area is customers won, not just traffic." side="bottom" />
          </h3>
          <p className="text-[10.5px] md:text-[11px] text-[#a8a8a8] font-mono mt-1.5">
            Ranked by customers won · bar length = reach · solid = converted
          </p>
        </div>

        <div className="divide-y divide-[#f6f6f4]">
          {channelRows.map(row => {
            const reachPct = (row.signups / maxChannelSignups) * 100;
            const delta = row.yield - summary.blendedConversionRate;
            return (
              <div key={row.channel} className="px-4 md:px-6 py-3.5">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: row.ink }} />
                    <span className="font-semibold text-[13px] text-[#1a1a1a] truncate">{prettyChannel(row.channel)}</span>
                    <span className="text-[9.5px] font-mono text-[#b8b8b8] shrink-0">{row.codeCount} code{row.codeCount === 1 ? "" : "s"}</span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-[15px] font-black font-mono" style={{ color: row.ink }}>{row.yield.toFixed(1)}%</span>
                    <span
                      className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: delta >= 0 ? "#eef4f1" : "#f7f2ee",
                        color: delta >= 0 ? "#2b5346" : "#c87a3c",
                      }}
                    >
                      {delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(1)} pts
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-3 rounded-[3px] bg-[#f3f3f1] overflow-hidden" style={{ width: `${Math.max(reachPct, 4)}%` }}>
                      <div className="h-full" style={{ width: `${Math.min(row.yield, 100)}%`, backgroundColor: row.ink }} />
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-[#a1a1a1] shrink-0 tabular-nums">
                    <span className="font-bold text-[#1a1a1a]">{row.paying.toLocaleString()}</span> of {row.signups.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Code Yield Map */}
      <motion.div {...fadeUp(0.12)}>
        <CodeYieldMap reports={foundReports} convLine={convLine} volLine={volLine} />
      </motion.div>

      {/* Province × channel cross-cut — only when the upload carries more than one province */}
      {provinceCount >= 2 && (
        <motion.div {...fadeUp(0.16)}>
          <ProvinceChannelMatrix reports={foundReports} channels={channelRows} />
        </motion.div>
      )}

      {/* Next-move briefing */}
      <motion.div {...fadeUp(0.20)}>
        <button
          onClick={() => setBriefingOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#e8e8e8] bg-white hover:bg-[#fafafa] transition-colors text-left shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2b5346]/30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#2b5346] shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Where to put the next event</p>
              <p className="text-[10px] text-[#a1a1a1] font-mono truncate">Scale · fix the funnel · under-booked · review</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-[10px] text-[#a1a1a1] font-mono hidden sm:block">{briefingOpen ? "Collapse" : "Expand"}</span>
            <ChevronDown className={`w-4 h-4 text-[#a1a1a1] transition-transform duration-200 ${briefingOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {briefingOpen && (
          <div className="mt-2">
            <PortfolioSummaryWidget summary={summary} reports={foundReports} channels={channelSummary} />
          </div>
        )}
      </motion.div>

      {/* Bonus: customer value — only when the upload genuinely carries LTV columns */}
      {summary.hasLtvData && (
        <motion.div {...fadeUp(0.24)} className="bg-white rounded-xl md:rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
          <button
            onClick={() => setLtvOpen(v => !v)}
            className="w-full px-4 md:px-6 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2b5346]/30"
          >
            <div className="flex items-center gap-3 min-w-0">
              <DollarSign className="w-3.5 h-3.5 text-[#8a6f00] shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                  Customer value
                  <span className="text-[8.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fdf8e1] text-[#8a6f00] border border-[#e7bd27]/30">
                    LTV upload
                  </span>
                </h3>
                <p className="text-[11px] text-[#a1a1a1] font-mono mt-0.5 truncate">
                  ${summary.totalLTV12.toLocaleString()} over 12 months · ${Math.round(summary.averageLTV12).toLocaleString()} avg per code
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#a1a1a1] shrink-0 ml-3 transition-transform duration-200 ${ltvOpen ? "rotate-180" : ""}`} />
          </button>

          {ltvOpen && (
            <div className="border-t border-[#f0f0f0]">
              <div className="grid grid-cols-3 divide-x divide-[#f2f2f0] border-b border-[#f0f0f0]">
                {[
                  { label: "3 months",  val: summary.totalLTV3 },
                  { label: "6 months",  val: summary.totalLTV6 },
                  { label: "12 months", val: summary.totalLTV12 },
                ].map(({ label, val }, i) => (
                  <div key={label} className="px-3 md:px-6 py-4">
                    <p className="text-[8.5px] font-mono uppercase tracking-widest text-[#b8b8b8] mb-1.5">{label}</p>
                    <p className="text-[15px] md:text-[19px] font-black font-mono leading-none"
                      style={{ color: ["#86b09e", "#4d8970", "#2b5346"][i] }}>
                      ${val.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-4 md:px-6 py-3 border-b border-[#f5f5f3]">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#a8a8a8]">Top codes by 12-month revenue</p>
              </div>
              <div className="divide-y divide-[#f8f8f6]">
                {ltvLeaders.map((code, idx) => {
                  const pct = maxLtvSum > 0 ? (code["Sum LTV 12"] / maxLtvSum) * 100 : 0;
                  return (
                    <div key={`${code.discount_code}-${code.Province ?? ""}-${idx}`} className="px-4 md:px-6 py-3 flex items-center gap-3">
                      <span className="text-[10px] font-bold font-mono text-[#d8d8d8] w-3 shrink-0 text-center">{idx + 1}</span>
                      <div className="flex flex-col w-24 md:w-32 shrink-0 min-w-0">
                        <span className="font-mono font-semibold text-[11.5px] text-[#1a1a1a] truncate">{code.discount_code}</span>
                        <span className="text-[9px] text-[#a1a1a1] truncate">{prettyChannel(code.channel)}</span>
                      </div>
                      <div className="flex-1 h-2 bg-[#f2f2f0] rounded-full overflow-hidden min-w-0">
                        <div className="h-full bg-[#2b5346] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-right shrink-0 w-[86px]">
                        <p className="text-[12px] font-bold font-mono text-[#2b5346]">${code["Sum LTV 12"].toLocaleString()}</p>
                        <p className="text-[9px] text-[#a1a1a1] font-mono">${code["Avg LTV 12"].toFixed(0)} / cx</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
