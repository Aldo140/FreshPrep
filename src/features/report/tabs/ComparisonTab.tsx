import React, { useMemo } from "react";
import { AnalyzedCodeReport } from "../../../types";
import { EventStats } from "../../../hooks/useCustomerData";
import { TrendingUp, TrendingDown, Minus, ArrowRight, CalendarDays, BarChart2 } from "lucide-react";

const PROV_COLOR: Record<string, string> = {
  BC: "#4d8970", AB: "#c9a000", ON: "#2b5346",
  QC: "#9b4a1c", SK: "#6b8e9f", MB: "#8a6f00",
};
const provColor = (p: string) => PROV_COLOR[p] ?? "#888";

interface ComparisonTabProps {
  foundReports: AnalyzedCodeReport[];
  editionLabels: Record<string, string>;
  rawPastedCodes: string[];
  eventStats: EventStats[];
}

interface Edition {
  code: string;
  label: string;
  report: AnalyzedCodeReport;
}

type VerdictDirection = "up" | "down" | "mixed" | "insufficient";

interface Verdict {
  direction: VerdictDirection;
  recommendation: string;
}

function computeVerdict(editions: Edition[]): Verdict {
  if (editions.length < 2) {
    return { direction: "insufficient", recommendation: "Add more editions to see trend direction." };
  }
  const last = editions[editions.length - 1];
  const prev = editions[editions.length - 2];
  const convUp = last.report.calculatedConversion > prev.report.calculatedConversion;
  const ltvUp = last.report["Avg LTV 12"] >= prev.report["Avg LTV 12"];
  const signupsUp = last.report.Signups >= prev.report.Signups;

  if (convUp && (ltvUp || signupsUp)) {
    return { direction: "up", recommendation: "Conversion and LTV are improving — strong case to return." };
  }
  if (!convUp) {
    return { direction: "down", recommendation: "Performance declining — reassess offer or venue before committing." };
  }
  return { direction: "mixed", recommendation: "Conversion up but customer quality or volume declining — consider refining the target audience." };
}

const TW = 560, TH = 200;
const TPAD = { t: 24, r: 28, b: 44, l: 60 };
const TPW = TW - TPAD.l - TPAD.r;
const TPH = TH - TPAD.t - TPAD.b;

const VW = 560, VH = 160;
const VPAD = { t: 16, r: 28, b: 36, l: 60 };
const VPW = VW - VPAD.l - VPAD.r;
const VPH = VH - VPAD.t - VPAD.b;

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtMonth(mk: string): string {
  const [y, m] = mk.split("-");
  return `${MONTH_ABBR[Number(m) - 1]} ${y}`;
}

export function ComparisonTab({ foundReports, editionLabels, rawPastedCodes, eventStats }: ComparisonTabProps): React.ReactElement {
  // Build date + province context from eventStats
  const dateByCode = new Map<string, { label: string; month: string }>();
  const provByCode = new Map<string, string>();
  for (const e of eventStats) {
    if (e.eventDateLabel && e.eventMonth) {
      dateByCode.set(e.code, { label: e.eventDateLabel, month: e.eventMonth });
    }
    if (e.homeProvince) provByCode.set(e.code, e.homeProvince);
  }

  // BD-only volume comparison: aggregate eventStats by edition group when no Looker reports
  const bdGroups = useMemo(() => {
    if (foundReports.length > 0 || rawPastedCodes.length < 2) return null;
    const statsByCode = new Map<string, EventStats>(eventStats.map(e => [e.code, e]));
    type Grp = { codes: string[]; totalSignups: number; provinces: string[]; dateMonths: string[] };
    const groups: Record<string, Grp> = {};
    for (const code of rawPastedCodes) {
      const lbl = editionLabels[code] ?? "Edition A";
      if (!groups[lbl]) groups[lbl] = { codes: [], totalSignups: 0, provinces: [], dateMonths: [] };
      const stat = statsByCode.get(code);
      if (stat) {
        groups[lbl].codes.push(code);
        groups[lbl].totalSignups += stat.totalSignups;
        if (stat.homeProvince && !groups[lbl].provinces.includes(stat.homeProvince)) {
          groups[lbl].provinces.push(stat.homeProvince);
        }
        if (stat.eventMonth && !groups[lbl].dateMonths.includes(stat.eventMonth)) {
          groups[lbl].dateMonths.push(stat.eventMonth);
        }
      }
    }
    const list = Object.entries(groups);
    return list.length >= 2 ? list : null;
  }, [foundReports.length, rawPastedCodes, editionLabels, eventStats]);

  const editions: Edition[] = rawPastedCodes
    .map(code => {
      const report = foundReports.find(r => r.discount_code === code);
      return report ? { code, label: editionLabels[code] ?? code, report } : null;
    })
    .filter((e): e is Edition => e !== null);

  // BD-only mode: show volume comparison from eventStats
  if (editions.length < 2 && bdGroups) {
    const maxSignups = Math.max(1, ...bdGroups.map(([, g]) => g.totalSignups));
    const winner = bdGroups.reduce((a, b) => a[1].totalSignups >= b[1].totalSignups ? a : b);
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Comparison Analysis · BD Events</p>
          <h2 className="text-[20px] font-black text-[#0f0f0f]">Volume Comparison</h2>
          <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">
            Upload a Looker file to unlock conversion, LTV, and trend analysis.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {bdGroups.map(([label, grp], idx) => {
            const isWinner = label === winner[0];
            const barW = maxSignups > 0 ? (grp.totalSignups / maxSignups) * 100 : 0;
            return (
              <div key={label} className={`bg-white rounded-2xl border p-5 ${isWinner ? "border-[#2b5346]/30" : "border-[#e5e5e5]"}`}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#a1a1a1] font-mono">{label}</span>
                      {grp.provinces.map(p => (
                        <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                          style={{ color: provColor(p), borderColor: provColor(p) + "40", backgroundColor: provColor(p) + "12" }}>
                          {p}
                        </span>
                      ))}
                      {grp.dateMonths.length > 0 && (
                        <span className="text-[9px] font-mono text-[#a1a1a1] bg-[#f5f5f3] border border-[#e8e8e8] px-2 py-0.5 rounded">
                          {fmtMonth(grp.dateMonths.sort()[0])}{grp.dateMonths.length > 1 ? ` + ${grp.dateMonths.length - 1} more` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#a1a1a1] font-mono mt-1">{grp.codes.join(", ")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black font-mono" style={{ color: isWinner ? "#2b5346" : "#1a1a1a" }}>{grp.totalSignups.toLocaleString()}</p>
                    <p className="text-[9px] font-mono text-[#a1a1a1] uppercase tracking-wide">signups</p>
                  </div>
                </div>
                <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, backgroundColor: isWinner ? "#2b5346" : "#a1a1a1" }} />
                </div>
                {idx > 0 && bdGroups[0][1].totalSignups > 0 && (
                  <p className="text-[10px] font-mono mt-2" style={{ color: grp.totalSignups >= bdGroups[0][1].totalSignups ? "#2b5346" : "#9b4a1c" }}>
                    {grp.totalSignups >= bdGroups[0][1].totalSignups ? "+" : ""}
                    {(((grp.totalSignups - bdGroups[0][1].totalSignups) / bdGroups[0][1].totalSignups) * 100).toFixed(0)}% vs {bdGroups[0][0]}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-[#f8f7f5] rounded-xl border border-[#e8e8e8] px-5 py-4 flex items-center gap-3">
          <BarChart2 className="w-4 h-4 text-[#a1a1a1] shrink-0" />
          <p className="text-xs text-[#3d3d3d]">
            <strong>Volume only</strong> — Upload a Looker export to see conversion rates, LTV trajectory, and trend direction.
          </p>
        </div>
      </div>
    );
  }

  if (editions.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <p className="text-sm text-[#a1a1a1] font-mono">Select at least 2 codes in the Compare flow to see analysis.</p>
      </div>
    );
  }

  const verdict = computeVerdict(editions);

  // ── Conversion trend ──────────────────────────────────────────────────────
  const convValues = editions.map(e => e.report.calculatedConversion);
  const convMax = Math.ceil(Math.max(80, ...convValues) / 10) * 10;
  const xPos = (i: number) =>
    TPAD.l + (editions.length > 1 ? (i / (editions.length - 1)) * TPW : TPW / 2);
  const convY = (v: number) => TPAD.t + TPH - (v / convMax) * TPH;
  const convPath = editions
    .map((e, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${convY(e.report.calculatedConversion).toFixed(1)}`)
    .join(" ");
  const targetY = convY(40);
  const convTicks = [0, Math.round(convMax * 0.5), convMax];

  // ── Volume bars ───────────────────────────────────────────────────────────
  const maxVol = Math.max(1, ...editions.map(e => e.report.Signups), ...editions.map(e => e.report["Paying cx"]));
  const barGroupW = VPW / editions.length;
  const barW = Math.min(22, barGroupW * 0.28);

  // ── LTV trajectory ────────────────────────────────────────────────────────
  const ltvValues = editions.map(e => e.report["Avg LTV 12"]);
  const ltvRaw = Math.max(...ltvValues) * 1.2;
  const ltvMax = Math.ceil(ltvRaw / 50) * 50 || 100;
  const ltvY = (v: number) => TPAD.t + TPH - (v / ltvMax) * TPH;
  const ltvPath = editions
    .map((e, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${ltvY(e.report["Avg LTV 12"]).toFixed(1)}`)
    .join(" ");
  const ltvTicks = [0, Math.round(ltvMax * 0.5), ltvMax];

  // ── Verdict colours ───────────────────────────────────────────────────────
  const VC: Record<VerdictDirection, { bg: string; text: string; border: string }> = {
    up:           { bg: "#eef4f1", text: "#2b5346", border: "rgba(43,83,70,0.25)" },
    down:         { bg: "#fff4f4", text: "#850b0b", border: "rgba(133,11,11,0.25)" },
    mixed:        { bg: "#fdf8e1", text: "#8a6f00", border: "rgba(231,189,39,0.35)" },
    insufficient: { bg: "#f8f7f5", text: "#a1a1a1", border: "#e5e5e5" },
  };
  const vc = VC[verdict.direction];
  const VIcon = verdict.direction === "up" ? TrendingUp : verdict.direction === "down" ? TrendingDown : Minus;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col gap-10">

      {/* Header */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Comparison Analysis · BD Events</p>
        <h2 className="text-[20px] font-black text-[#0f0f0f] leading-tight flex flex-wrap items-center gap-1">
          {editions.map((e, i) => (
            <span key={e.code} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="w-4 h-4 text-[#c8c8c8] shrink-0" />}
              {e.label}
            </span>
          ))}
        </h2>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <p className="text-xs text-[#a1a1a1] font-mono">
            {editions.length} edition{editions.length !== 1 ? "s" : ""}
          </p>
          {/* Date context chips when static data has matching event info */}
          {editions.some(e => dateByCode.has(e.code)) && (
            <>
              <span className="text-[#e5e5e5] font-mono">·</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <CalendarDays className="w-3 h-3 text-[#b0b0b0]" />
                {editions.map((e, i) => {
                  const dc = dateByCode.get(e.code);
                  const prov = provByCode.get(e.code);
                  if (!dc) return null;
                  return (
                    <span key={e.code} className="flex items-center gap-1">
                      {i > 0 && <span className="text-[#d8d8d8] font-mono text-[10px]">→</span>}
                      <span className="text-[10px] font-mono text-[#3d3d3d] bg-[#f5f5f3] border border-[#e8e8e8] px-2 py-0.5 rounded flex items-center gap-1.5">
                        <span className="text-[#a1a1a1]">{e.label}: </span>{fmtMonth(dc.month)}
                        {prov && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ color: provColor(prov), backgroundColor: provColor(prov) + "18" }}>{prov}</span>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Verdict */}
      <div className="rounded-2xl p-5 flex items-start gap-4" style={{ backgroundColor: vc.bg, border: `1.5px solid ${vc.border}` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: vc.text + "18" }}>
          <VIcon className="w-5 h-5" style={{ color: vc.text }} />
        </div>
        <div>
          <p className="font-black text-[15px]" style={{ color: vc.text }}>
            {verdict.direction === "up" ? "Trending Up" :
             verdict.direction === "down" ? "Trending Down" :
             verdict.direction === "mixed" ? "Mixed Results" : "Insufficient Data"}
          </p>
          <p className="text-sm text-[#3d3d3d] mt-0.5 leading-relaxed">{verdict.recommendation}</p>
        </div>
      </div>

      {/* Conversion trend line */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">Conversion Rate Trend</p>
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-4 overflow-x-auto">
          <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`} style={{ maxWidth: "100%", display: "block" }}>
            {convTicks.map(v => (
              <g key={v}>
                <line x1={TPAD.l} y1={convY(v)} x2={TW - TPAD.r} y2={convY(v)}
                  stroke={v === 0 ? "#e5e5e5" : "#f0f0ee"} strokeWidth="1" />
                <text x={TPAD.l - 6} y={convY(v) + 4} textAnchor="end" fontSize="9" fill="#c0c0c0" fontFamily="monospace">{v}%</text>
              </g>
            ))}
            {/* 40% target dashed line */}
            <line x1={TPAD.l} y1={targetY} x2={TW - TPAD.r} y2={targetY}
              stroke="#2b5346" strokeWidth="1" strokeDasharray="4 3" opacity="0.45" />
            <text x={TW - TPAD.r + 3} y={targetY + 4} fontSize="8" fill="#2b5346" opacity="0.6" fontFamily="monospace">40%</text>
            {/* Line */}
            <path d={convPath} fill="none" stroke="#2b5346" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* Points */}
            {editions.map((e, i) => {
              const cx = xPos(i);
              const cy = convY(e.report.calculatedConversion);
              const below = e.report.calculatedConversion < 40;
              return (
                <g key={e.code}>
                  <circle cx={cx} cy={cy} r="5" fill={below ? "#850b0b" : "#2b5346"} />
                  <text x={cx} y={cy - 11} textAnchor="middle" fontSize="10" fontWeight="700"
                    fill={below ? "#850b0b" : "#2b5346"} fontFamily="monospace">
                    {e.report.calculatedConversion.toFixed(1)}%
                  </text>
                  <text x={cx} y={TH - 18} textAnchor="middle" fontSize="9" fill="#888" fontFamily="monospace">{e.label}</text>
                  {dateByCode.has(e.code) && (
                    <text x={cx} y={TH - 6} textAnchor="middle" fontSize="8" fill="#b8b8b8" fontFamily="monospace">
                      {fmtMonth(dateByCode.get(e.code)!.month)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Volume bars */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">Signups vs Paying Customers</p>
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-4 overflow-x-auto">
          <svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`} style={{ maxWidth: "100%", display: "block" }}>
            {/* Baseline */}
            <line x1={VPAD.l} y1={VPAD.t + VPH} x2={VW - VPAD.r} y2={VPAD.t + VPH} stroke="#e5e5e5" strokeWidth="1" />
            {editions.map((e, i) => {
              const cx = VPAD.l + i * barGroupW + barGroupW / 2;
              const sh = (e.report.Signups / maxVol) * VPH;
              const ph = (e.report["Paying cx"] / maxVol) * VPH;
              const sy = VPAD.t + VPH - sh;
              const py = VPAD.t + VPH - ph;
              const sx = cx - barW - 2;
              const px = cx + 2;
              return (
                <g key={e.code}>
                  <rect x={sx} y={sy} width={barW} height={sh} fill="#86b09e" rx="2" />
                  <rect x={px} y={py} width={barW} height={ph} fill="#2b5346" rx="2" />
                  <text x={sx + barW / 2} y={sy - 3} textAnchor="middle" fontSize="8" fill="#86b09e" fontFamily="monospace">{e.report.Signups}</text>
                  <text x={px + barW / 2} y={py - 3} textAnchor="middle" fontSize="8" fill="#2b5346" fontFamily="monospace">{e.report["Paying cx"]}</text>
                  <text x={cx} y={VH - 18} textAnchor="middle" fontSize="9" fill="#888" fontFamily="monospace">{e.label}</text>
                  {dateByCode.has(e.code) && (
                    <text x={cx} y={VH - 6} textAnchor="middle" fontSize="8" fill="#b8b8b8" fontFamily="monospace">
                      {fmtMonth(dateByCode.get(e.code)!.month)}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Legend */}
            <rect x={VPAD.l} y={4} width={8} height={8} fill="#86b09e" rx="1" />
            <text x={VPAD.l + 11} y={12} fontSize="8" fill="#888" fontFamily="monospace">Signups</text>
            <rect x={VPAD.l + 60} y={4} width={8} height={8} fill="#2b5346" rx="1" />
            <text x={VPAD.l + 71} y={12} fontSize="8" fill="#888" fontFamily="monospace">Paying</text>
          </svg>
        </div>
      </div>

      {/* LTV trajectory */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">Avg LTV 12-Month Trajectory</p>
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-4 overflow-x-auto">
          <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`} style={{ maxWidth: "100%", display: "block" }}>
            {ltvTicks.map(v => (
              <g key={v}>
                <line x1={TPAD.l} y1={ltvY(v)} x2={TW - TPAD.r} y2={ltvY(v)}
                  stroke={v === 0 ? "#e5e5e5" : "#f0f0ee"} strokeWidth="1" />
                <text x={TPAD.l - 6} y={ltvY(v) + 4} textAnchor="end" fontSize="9" fill="#c0c0c0" fontFamily="monospace">${v}</text>
              </g>
            ))}
            <path d={ltvPath} fill="none" stroke="#c9a000" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {editions.map((e, i) => (
              <g key={e.code}>
                <circle cx={xPos(i)} cy={ltvY(e.report["Avg LTV 12"])} r="5" fill="#c9a000" />
                <text x={xPos(i)} y={ltvY(e.report["Avg LTV 12"]) - 11} textAnchor="middle"
                  fontSize="10" fontWeight="700" fill="#c9a000" fontFamily="monospace">
                  ${e.report["Avg LTV 12"].toFixed(0)}
                </text>
                <text x={xPos(i)} y={TH - 18} textAnchor="middle" fontSize="9" fill="#888" fontFamily="monospace">{e.label}</text>
                {dateByCode.has(e.code) && (
                  <text x={xPos(i)} y={TH - 6} textAnchor="middle" fontSize="8" fill="#b8b8b8" fontFamily="monospace">
                    {fmtMonth(dateByCode.get(e.code)!.month)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Detail table */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">Edition Details</p>
        <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#f0f0ee] bg-[#fafafa]">
                {["Edition", "Code", "Event Date", "Signups", "Paying", "Conversion", "Avg LTV 12", "Grade"].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 font-semibold text-[#a1a1a1] font-mono uppercase tracking-wide text-[9px]${i >= 3 && i <= 6 ? " text-right" : i === 7 ? " text-center" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f3]">
              {editions.map(e => (
                <tr key={e.code} className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#1a1a1a]">{e.label}</td>
                  <td className="px-4 py-3 font-mono text-[10.5px] text-[#3d3d3d]">{e.code}</td>
                  <td className="px-4 py-3">
                    {dateByCode.has(e.code) ? (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3 text-[#b0b0b0] shrink-0" />
                        <span className="font-mono text-[10.5px] text-[#3d3d3d]">{fmtMonth(dateByCode.get(e.code)!.month)}</span>
                        <span className="font-mono text-[9px] text-[#b8b8b8]">{dateByCode.get(e.code)!.label}</span>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-[#d0d0d0]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-[#1a1a1a]">{e.report.Signups.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-right text-[#1a1a1a]">{e.report["Paying cx"].toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-right font-semibold" style={{ color: e.report.calculatedConversion >= 40 ? "#2b5346" : "#850b0b" }}>
                    {e.report.calculatedConversion.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-[#1a1a1a]">${e.report["Avg LTV 12"].toFixed(0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono font-black text-[11px]" style={{ color: e.report.calculatedConversion >= 40 ? "#2b5346" : "#850b0b" }}>
                      {e.report.performanceGrade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
