import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, TrendingUp, BarChart2, DollarSign, Users, Target } from "lucide-react";
import { AnalyzedCodeReport, KPIReportSummary, ChannelSummary } from "../../../types";
import PortfolioSummaryWidget from "../components/PortfolioSummaryWidget";
import { MetricInfo } from "../../../components/MetricInfo";

interface RevenueTabProps {
  summary: KPIReportSummary;
  foundReports: AnalyzedCodeReport[];
  channelSummary: ChannelSummary[];
}

const TIER_COLOR: Record<string, string> = {
  Strong: "#2b5346",
  Good: "#3d7060",
  Average: "#c9a000",
  Weak: "#c87a3c",
  Poor: "#c84040",
};

const TIER_ORDER = ["Strong", "Good", "Average", "Weak", "Poor"];

// ── Scatter/Bubble Chart ──────────────────────────────────────────────────────
interface HoveredBubble {
  key: string;
  report: AnalyzedCodeReport;
  cx: number;
  cy: number;
  radius: number;
  color: string;
}

function PortfolioMap({ reports, summary }: { reports: AnalyzedCodeReport[]; summary: KPIReportSummary }) {
  const [hovered,     setHovered]     = useState<HoveredBubble | null>(null);
  const [mousePos,    setMousePos]    = useState({ x: 0, y: 0 });
  const [activeTiers, setActiveTiers] = useState<Set<string>>(() => new Set(TIER_ORDER));

  const eligibleReports = reports.filter(r => r.Signups >= 5);

  if (eligibleReports.length === 0) return null;

  const W = 700, H = 420;
  const PAD = { t: 46, r: 46, b: 62, l: 74 };
  const pw = W - PAD.l - PAD.r;  // 580
  const ph = H - PAD.t - PAD.b;  // 312

  const maxConvRaw = Math.max(...eligibleReports.map(r => r.calculatedConversion));
  const maxLtvRaw  = Math.max(...eligibleReports.map(r => r["Avg LTV 12"]));
  const maxPaying  = Math.max(...eligibleReports.map(r => r["Paying cx"]), 1);

  const maxConv = Math.max(Math.ceil(maxConvRaw / 10) * 10 + 10, 50);
  const maxLtv  = Math.max(Math.ceil(maxLtvRaw  / 100) * 100 + 100, 400);

  const xs = (v: number) => (v / maxConv) * pw;
  const ys = (v: number) => ph - (v / maxLtv) * ph;
  const br = (p: number) => 7 + (Math.sqrt(p) / Math.sqrt(maxPaying)) * 17;

  const TARGET_CONV = 40;
  const avgLtv = summary.averageLTV12;

  const xTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80].filter(v => v <= maxConv);
  const yInt   = maxLtv <= 400 ? 100 : maxLtv <= 800 ? 200 : maxLtv <= 2000 ? 500 : 1000;
  const yTicks = Array.from({ length: Math.ceil(maxLtv / yInt) + 1 }, (_, i) => i * yInt).filter(v => v <= maxLtv);

  const topCodes = new Set(
    [...eligibleReports].sort((a, b) => b["Paying cx"] - a["Paying cx"]).slice(0, 10).map(r => r.discount_code + (r.Province ?? ""))
  );

  const presentTiers = TIER_ORDER.filter(t => eligibleReports.some(r => r.performanceRating === t));

  function toggleTier(tier: string) {
    setActiveTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) {
        if (next.size === 1) return prev;
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  }

  const filteredReports = eligibleReports.filter(r => activeTiers.has(r.performanceRating));

  return (
    <div className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
      <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #1e3d31 0%, #2b5346 40%, #4d8970 75%, #86b09e 100%)" }} />

      <div className="px-6 pt-5 pb-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#eef4f1] flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5 text-[#2b5346]" />
              </div>
              Code Portfolio Map <MetricInfo text="A scatter plot where every bubble is one promo code. Codes in the top-right ('ideal zone') have both high conversion and high customer value — those are your best events." side="bottom" />
            </h3>
            <p className="text-[11px] text-[#a8a8a8] font-mono mt-1.5">
              Each bubble = one promo code &nbsp;·&nbsp; <span title="How many signups became paying customers">X = conversion rate</span> &nbsp;·&nbsp; <span title="Avg revenue per paying customer over 12 months">Y = avg customer value (12mo)</span> &nbsp;·&nbsp; size = customers acquired
            </p>
          </div>
        </div>

        {/* Tier filter chips */}
        <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-[#f5f5f3]">
          <span className="text-[9px] text-[#c8c8c8] font-mono uppercase tracking-widest">Filter:</span>
          {presentTiers.map(tier => {
            const active = activeTiers.has(tier);
            const count  = reports.filter(r => r.performanceRating === tier).length;
            return (
              <button
                key={tier}
                onClick={() => toggleTier(tier)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold font-mono cursor-pointer transition-all"
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

      {/* Chart wrapper — onMouseMove here captures position for the HTML tooltip */}
      <div
        className="px-4 pb-5 pt-3 relative"
        onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
          <defs>
            <pattern id="pm-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.85" fill="#e2e2e0" />
            </pattern>
            <filter id="pm-glow" x="-70%" y="-70%" width="240%" height="240%">
              <feDropShadow dx="0" dy="4" stdDeviation="7" floodOpacity="0.20" />
            </filter>
          </defs>

          {/* Plot background */}
          <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="#f9f9f8" rx="7" />
          <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="url(#pm-dots)" rx="7" />

          {/* Ideal-zone tint */}
          {TARGET_CONV <= maxConv && avgLtv > 0 && avgLtv <= maxLtv && (
            <rect x={PAD.l + xs(TARGET_CONV)} y={PAD.t} width={pw - xs(TARGET_CONV)} height={ys(avgLtv)} fill="#2b5346" fillOpacity="0.042" />
          )}

          {/* Horizontal grid lines */}
          {yTicks.map(v => (
            <line key={`yg${v}`} x1={PAD.l + 1} y1={PAD.t + ys(v)} x2={PAD.l + pw - 1} y2={PAD.t + ys(v)} stroke="#eeeeed" strokeWidth="1" />
          ))}
          {/* Vertical grid lines */}
          {xTicks.filter(v => v > 0).map(v => (
            <line key={`xg${v}`} x1={PAD.l + xs(v)} y1={PAD.t + 1} x2={PAD.l + xs(v)} y2={PAD.t + ph - 1} stroke="#f0f0ee" strokeWidth="1" />
          ))}

          {/* Quadrant labels */}
          {TARGET_CONV <= maxConv && avgLtv > 0 && avgLtv <= maxLtv && (<>
            <text x={PAD.l + pw - 12} y={PAD.t + 20}       fontSize="9.5" fill="#2b5346" fillOpacity="0.38" textAnchor="end"   fontFamily="monospace" fontStyle="italic">ideal zone ↗</text>
            <text x={PAD.l + 12}      y={PAD.t + 20}       fontSize="9"   fill="#888"    fillOpacity="0.30" textAnchor="start" fontFamily="monospace" fontStyle="italic">quality gap</text>
            <text x={PAD.l + pw - 12} y={PAD.t + ph - 12}  fontSize="9"   fill="#888"    fillOpacity="0.26" textAnchor="end"   fontFamily="monospace" fontStyle="italic">volume drivers</text>
            <text x={PAD.l + 12}      y={PAD.t + ph - 12}  fontSize="9"   fill="#bbb"    fillOpacity="0.48" textAnchor="start" fontFamily="monospace" fontStyle="italic">needs work</text>
          </>)}

          {/* Target conversion line + pill */}
          {TARGET_CONV <= maxConv && (
            <g>
              <line x1={PAD.l + xs(TARGET_CONV)} y1={PAD.t} x2={PAD.l + xs(TARGET_CONV)} y2={PAD.t + ph}
                stroke="#2b5346" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.24" />
              <rect x={PAD.l + xs(TARGET_CONV) - 32} y={PAD.t - 2} width={64} height={19} rx="9" fill="#eef4f1" />
              <text x={PAD.l + xs(TARGET_CONV)} y={PAD.t + 13}
                fontSize="8.5" fill="#2b5346" fillOpacity="0.72" textAnchor="middle" fontFamily="monospace" fontWeight="600">
                40% target
              </text>
            </g>
          )}

          {/* Avg LTV line + pill */}
          {avgLtv > 0 && avgLtv <= maxLtv && (
            <g>
              <line x1={PAD.l} y1={PAD.t + ys(avgLtv)} x2={PAD.l + pw} y2={PAD.t + ys(avgLtv)}
                stroke="#888" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.20" />
              <rect x={PAD.l + pw - 76} y={PAD.t + ys(avgLtv) - 18} width={78} height={19} rx="9" fill="#f2f2f0" />
              <text x={PAD.l + pw - 37} y={PAD.t + ys(avgLtv) - 5}
                fontSize="8.5" fill="#777" textAnchor="middle" fontFamily="monospace">
                avg ${Math.round(avgLtv)}
              </text>
            </g>
          )}

          {/* Plot border */}
          <rect x={PAD.l} y={PAD.t} width={pw} height={ph} fill="none" stroke="#e2e2e0" strokeWidth="1.5" rx="7" />

          {/* X-axis */}
          {xTicks.map(v => (
            <g key={`xt${v}`}>
              <line x1={PAD.l + xs(v)} y1={PAD.t + ph} x2={PAD.l + xs(v)} y2={PAD.t + ph + 6} stroke="#d4d4d2" />
              <text x={PAD.l + xs(v)} y={PAD.t + ph + 21} fontSize="10.5" fill="#b4b4b2" textAnchor="middle" fontFamily="monospace">{v}%</text>
            </g>
          ))}

          {/* Y-axis */}
          {yTicks.filter(v => v > 0).map(v => (
            <text key={`yt${v}`} x={PAD.l - 10} y={PAD.t + ys(v) + 4} fontSize="10.5" fill="#b4b4b2" textAnchor="end" fontFamily="monospace">
              {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
            </text>
          ))}

          {/* Axis labels */}
          <text x={PAD.l + pw / 2} y={H - 9} fontSize="10" fill="#c8c8c6" textAnchor="middle" fontFamily="monospace" fontStyle="italic">
            Conversion Rate →
          </text>
          <text transform={`translate(17, ${PAD.t + ph / 2}) rotate(-90)`}
            fontSize="10" fill="#c8c8c6" textAnchor="middle" fontFamily="monospace" fontStyle="italic">
            Avg LTV 12M →
          </text>

          {/* Bubbles */}
          {[...filteredReports]
            .sort((a, b) => {
              const ak = `${a.discount_code}${a.Province ?? ""}`;
              const bk = `${b.discount_code}${b.Province ?? ""}`;
              if (hovered?.key === ak) return 1;
              if (hovered?.key === bk) return -1;
              return b["Paying cx"] - a["Paying cx"];
            })
            .map((r, i) => {
              const cx    = PAD.l + xs(r.calculatedConversion);
              const cy    = PAD.t + ys(r["Avg LTV 12"]);
              const rad   = br(r["Paying cx"]);
              const color = TIER_COLOR[r.performanceRating] || "#b0b0ae";
              const key   = `${r.discount_code}${r.Province ?? ""}`;
              const isHov = hovered?.key === key;

              return (
                <g key={`${key}-${i}`}
                  onMouseEnter={() => setHovered({ key, report: r, cx, cy, radius: rad, color })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "default" }}
                >
                  {isHov && <circle cx={cx} cy={cy} r={rad + 12} fill={color} fillOpacity="0.07" />}
                  <circle cx={cx} cy={cy} r={isHov ? rad + 3.5 : rad + 1} fill="white" />
                  <circle
                    cx={cx} cy={cy}
                    r={isHov ? rad + 3.5 : rad}
                    fill={color}
                    fillOpacity={isHov ? 0.92 : 0.76}
                    stroke="white"
                    strokeWidth={isHov ? 2.5 : 2}
                    filter={isHov ? "url(#pm-glow)" : undefined}
                    style={{ transition: "r 150ms ease, fill-opacity 150ms ease" }}
                  />
                  {topCodes.has(key) && !isHov && (
                    <text x={cx} y={cy - rad - 8}
                      fontSize="8" fill="#1a1a1a" textAnchor="middle"
                      fontFamily="monospace" fontWeight="700"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {r.discount_code.length > 13 ? r.discount_code.slice(0, 13) + "…" : r.discount_code}
                    </text>
                  )}
                  {!isHov && (
                    <title>{r.discount_code} · {r.calculatedConversion.toFixed(1)}% · ${r["Avg LTV 12"].toFixed(0)} · {r["Paying cx"]} cx</title>
                  )}
                </g>
              );
            })}
        </svg>

        {/* HTML tooltip — fixed, follows cursor */}
        {hovered && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: mousePos.x + 20, top: mousePos.y - 16 }}
          >
            <div className="rounded-xl overflow-hidden" style={{
              width: 214,
              boxShadow: "0 12px 32px rgba(0,0,0,0.14), 0 3px 8px rgba(0,0,0,0.07)",
              border: "1.5px solid #e8e8e6",
              backgroundColor: "white",
            }}>
              <div style={{ height: 5, backgroundColor: hovered.color }} />
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="font-mono font-bold text-[13px] text-[#0f0f0f] leading-tight break-all">
                    {hovered.report.discount_code}
                  </p>
                  <span className="shrink-0 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap" style={{
                    backgroundColor: hovered.color + "18",
                    color: hovered.color,
                  }}>
                    {hovered.report.performanceRating}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-3">
                  {[
                    { label: "Conversion",   value: `${hovered.report.calculatedConversion.toFixed(1)}%`, accent: true },
                    { label: "Avg LTV 12mo", value: `$${hovered.report["Avg LTV 12"].toFixed(0)}`,         accent: false },
                    { label: "Customers",    value: `${hovered.report["Paying cx"]}`,                       accent: false },
                    { label: "Signups",      value: `${hovered.report.Signups}`,                            accent: false },
                  ].map(({ label, value, accent }) => (
                    <div key={label}>
                      <p className="text-[8px] text-[#b8b8b8] font-mono uppercase tracking-wider leading-none mb-0.5">{label}</p>
                      <p className="text-[13px] font-bold font-mono leading-none" style={{ color: accent ? hovered.color : "#1a1a1a" }}>{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#a8a8a8] font-mono mb-3 truncate">{hovered.report.channel}</p>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[8px] text-[#c0c0c0] font-mono">vs 40% target</span>
                    <span className="text-[8.5px] font-mono font-semibold" style={{ color: hovered.report.calculatedConversion >= TARGET_CONV ? "#2b5346" : "#c87a3c" }}>
                      {hovered.report.calculatedConversion >= TARGET_CONV ? "On target" : `−${(TARGET_CONV - hovered.report.calculatedConversion).toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="h-2 bg-[#f0f0ee] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min((hovered.report.calculatedConversion / maxConv) * 100, 100)}%`,
                      backgroundColor: hovered.color,
                      opacity: 0.78,
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function RevenueTab({ summary, foundReports, channelSummary }: RevenueTabProps): React.ReactElement {
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [ltvOpen,      setLtvOpen]      = useState(false);
  const [revenueOpen,  setRevenueOpen]  = useState(false);

  const sortedByLtv     = useMemo(() => [...foundReports].sort((a, b) => b["Avg LTV 12"] - a["Avg LTV 12"]), [foundReports]);
  const maxAvgLtv12     = sortedByLtv[0]?.["Avg LTV 12"] ?? 1;
  const sortedByRevenue = useMemo(() => [...foundReports].sort((a, b) => b["Sum LTV 12"] - a["Sum LTV 12"]), [foundReports]);
  const maxRevenue      = sortedByRevenue[0]?.["Sum LTV 12"] ?? 1;
  const totalLtv3       = foundReports.reduce((s, r) => s + r["Sum LTV 3"], 0);
  const totalLtv6       = foundReports.reduce((s, r) => s + r["Sum LTV 6"], 0);

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.24, delay, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  });

  return (
    <div className="p-5 flex flex-col gap-5 max-w-6xl mx-auto w-full">

      {/* Page header */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-mono text-[#2b5346] uppercase tracking-[0.2em] mb-1">Revenue Intelligence</p>
          <h2 className="text-[18px] font-black text-[#0f0f0f] leading-tight tracking-tight">
            ${summary.totalLTV12.toLocaleString()}
            <span className="text-[13px] font-medium text-[#a8a8a8] ml-2 tracking-normal">projected 12-month portfolio</span>
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0 pt-1">
          {[
            { label: "avg LTV",    val: `$${Math.round(summary.averageLTV12).toLocaleString()}` },
            { label: "customers",  val: summary.totalPayingCustomers.toLocaleString() },
            { label: "blended conv", val: `${summary.blendedConversionRate.toFixed(1)}%` },
          ].map(({ label, val }) => (
            <div key={label} className="text-right">
              <p className="text-[11px] font-bold font-mono text-[#1a1a1a]">{val}</p>
              <p className="text-[8px] text-[#b8b8b8] font-mono uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Hero */}
      <motion.div {...fadeUp(0.04)} className="rounded-2xl overflow-hidden flex shadow-md" style={{ minHeight: 168 }}>
        <div
          className="flex-1 p-6 flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #162e25 0%, #2b5346 50%, #3a6b58 100%)" }}
        >
          <p className="text-[9px] text-white/35 font-mono uppercase tracking-[0.18em]">Revenue Snapshot</p>

          <div className="flex flex-wrap gap-x-10 gap-y-3 mt-3">
            <div>
              <p className="text-[8.5px] text-white/35 uppercase tracking-widest font-mono mb-1">Portfolio Total (12mo)</p>
              <p className="text-[2rem] font-black font-mono text-white leading-none tracking-tight">
                ${summary.totalLTV12.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-6 self-end mb-0.5">
              {[
                { label: "3 Month",  val: `$${totalLtv3.toLocaleString()}` },
                { label: "6 Month",  val: `$${totalLtv6.toLocaleString()}` },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-[8.5px] text-white/35 uppercase tracking-widest font-mono mb-0.5">{m.label}</p>
                  <p className="text-base font-semibold font-mono text-white/65">{m.val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-8 mt-5 pt-4 border-t border-white/[0.08]">
            {[
              { icon: DollarSign, label: "Avg LTV / Customer", val: `$${Math.round(summary.averageLTV12).toLocaleString()}` },
              { icon: Users,      label: "Paying Customers",    val: summary.totalPayingCustomers.toLocaleString() },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <Icon className="w-3 h-3 text-white/60" />
                </div>
                <div>
                  <p className="text-[8.5px] text-white/35 uppercase tracking-widest font-mono leading-none">{label}</p>
                  <p className="text-[15px] font-bold font-mono text-white/90 leading-tight mt-0.5">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden sm:block w-[26%] shrink-0 relative">
          <img
            src="https://freshprep.imgix.net/landing/carousel/recipe_2.jpg?auto=compress,format&w=400"
            alt="FreshPrep meal"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.75) saturate(1.15)" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #2b5346 0%, transparent 45%)" }} />
        </div>
      </motion.div>

      {/* ── Portfolio Map ── primary visual */}
      <motion.div {...fadeUp(0.08)}>
        <PortfolioMap reports={foundReports} summary={summary} />
      </motion.div>

      {/* ── Customer LTV Progression — collapsible */}
      <motion.div {...fadeUp(0.12)} className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <button
          onClick={() => setLtvOpen(v => !v)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <TrendingUp className="w-3.5 h-3.5 text-[#2b5346] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">Customer LTV Progression <MetricInfo text="LTV (Lifetime Value) is the total revenue a customer generates. This chart shows how value builds at 3, 6, and 12 months — so you can see how quickly event signups become loyal subscribers." side="bottom" /></h3>
              <p className="text-[11px] text-[#a1a1a1] font-mono mt-0.5">
                {foundReports.length} codes · avg ${Math.round(summary.averageLTV12).toLocaleString()} per customer at 12mo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="hidden sm:flex items-center gap-2.5 text-[9px] font-mono text-[#c8c8c8] uppercase tracking-wider">
              {[["#86b09e","3mo"],["#4d8970","6mo"],["#2b5346","12mo"]].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-2 h-1 rounded-full inline-block" style={{ backgroundColor: c }} />{l}
                </span>
              ))}
            </div>
            <ChevronDown className={`w-4 h-4 text-[#a1a1a1] transition-transform duration-200 ${ltvOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {ltvOpen && (
          <div className="border-t border-[#f0f0f0] divide-y divide-[#f8f8f8]">
            {sortedByLtv.map((code) => {
              const pct3  = maxAvgLtv12 > 0 ? (code["Avg LTV 3"]  / maxAvgLtv12) * 100 : 0;
              const pct6  = maxAvgLtv12 > 0 ? (code["Avg LTV 6"]  / maxAvgLtv12) * 100 : 0;
              const pct12 = maxAvgLtv12 > 0 ? (code["Avg LTV 12"] / maxAvgLtv12) * 100 : 0;
              const mult  = code["Avg LTV 3"] > 0 ? code["Avg LTV 12"] / code["Avg LTV 3"] : null;

              return (
                <div key={`${code.discount_code}-${code.Province ?? ""}`} className="px-6 py-4">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[13px] text-[#1a1a1a] truncate">{code.discount_code}</span>
                      <span className="text-[10px] text-[#a1a1a1] px-1.5 py-0.5 rounded bg-[#f8f7f5] border border-[#e8e8e8] shrink-0">{code.channel}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 text-[11px] font-mono">
                      <span className="text-[#a1a1a1]">${code["Avg LTV 3"].toFixed(0)}</span>
                      <span className="text-[#d8d8d8]">→</span>
                      <span className="text-[#a1a1a1]">${code["Avg LTV 6"].toFixed(0)}</span>
                      <span className="text-[#d8d8d8]">→</span>
                      <span className="font-bold text-[#2b5346]">${code["Avg LTV 12"].toFixed(0)}</span>
                      {mult !== null && mult > 0 && (
                        <span className="text-[9px] text-[#a1a1a1] bg-[#f8f7f5] border border-[#e8e8e8] px-1.5 py-0.5 rounded">×{mult.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {([["3mo","#86b09e",pct3,code["Avg LTV 3"]],["6mo","#4d8970",pct6,code["Avg LTV 6"]],["12mo","#2b5346",pct12,code["Avg LTV 12"]]] as [string,string,number,number][]).map(([lbl,col,pct,val]) => (
                      <div key={lbl} className="flex items-center gap-2">
                        <span className="w-8 text-[8px] font-mono text-[#c8c8c8] uppercase text-right shrink-0">{lbl}</span>
                        <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: col }} />
                        </div>
                        <span className="w-12 text-right text-[9px] font-mono shrink-0" style={{ color: col }}>${val.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Revenue Contribution — collapsible */}
      <motion.div {...fadeUp(0.16)} className="bg-white rounded-2xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <button
          onClick={() => setRevenueOpen(v => !v)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <BarChart2 className="w-3.5 h-3.5 text-[#2b5346] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">Revenue Contribution <MetricInfo text="Which codes generate the most total 12-month revenue. The bar width shows each code's share of the whole portfolio." side="bottom" /></h3>
              <p className="text-[11px] text-[#a1a1a1] font-mono mt-0.5">
                {foundReports.length} codes · ${summary.totalLTV12.toLocaleString()} portfolio total (12mo)
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#a1a1a1] shrink-0 ml-4 transition-transform duration-200 ${revenueOpen ? "rotate-180" : ""}`} />
        </button>

        {revenueOpen && (
          <>
            <div className="border-t border-[#f0f0f0] divide-y divide-[#f8f8f8]">
              {sortedByRevenue.map((code, idx) => {
                const pct   = maxRevenue > 0 ? (code["Sum LTV 12"] / maxRevenue) * 100 : 0;
                const share = summary.totalLTV12 > 0 ? (code["Sum LTV 12"] / summary.totalLTV12) * 100 : 0;
                return (
                  <div key={`${code.discount_code}-${code.Province ?? ""}-rev-${idx}`} className="px-6 py-3.5 flex items-center gap-4">
                    <span className="text-[11px] font-bold font-mono text-[#d8d8d8] w-4 shrink-0 text-center">{idx + 1}</span>
                    <div className="flex flex-col w-28 shrink-0 min-w-0">
                      <span className="font-mono font-semibold text-[12px] text-[#1a1a1a] truncate">{code.discount_code}</span>
                      <span className="text-[9px] text-[#a1a1a1]">{code.channel}</span>
                    </div>
                    <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#2b5346] rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-right shrink-0 min-w-[80px]">
                      <p className="text-[13px] font-bold font-mono text-[#2b5346]">${code["Sum LTV 12"].toLocaleString()}</p>
                      <p className="text-[9px] text-[#a1a1a1] font-mono">{code["Paying cx"]} cx · {share.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-[#f0f0f0] flex items-center justify-between bg-[#f8f7f5]">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-[#2b5346]" />
                <span className="text-[11px] font-semibold text-[#a1a1a1] font-mono uppercase tracking-wider">Portfolio Total (12mo)</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold font-mono text-[#1a1a1a]">${summary.totalLTV12.toLocaleString()}</span>
                <p className="text-[10px] text-[#a1a1a1] font-mono">{summary.totalPayingCustomers} total customers</p>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* ── Executive Segment Performance — collapsible */}
      <motion.div {...fadeUp(0.20)}>
        <button
          onClick={() => setInsightsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#e8e8e8] bg-white hover:bg-[#f8f8f8] transition-colors text-left shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#2b5346] shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Executive Segment Performance</p>
              <p className="text-[10px] text-[#a1a1a1] font-mono">Top/bottom performers · LTV breakdown · segment analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[#a1a1a1] font-mono hidden sm:block">{insightsOpen ? "Collapse" : "Expand"}</span>
            <ChevronDown className={`w-4 h-4 text-[#a1a1a1] transition-transform duration-200 ${insightsOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {insightsOpen && (
          <div className="mt-2">
            <PortfolioSummaryWidget summary={summary} reports={foundReports} channels={channelSummary} />
          </div>
        )}
      </motion.div>

    </div>
  );
}
