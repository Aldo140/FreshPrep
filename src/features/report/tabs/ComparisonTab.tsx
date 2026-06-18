import React from "react";
import { AnalyzedCodeReport } from "../../../types";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

interface ComparisonTabProps {
  foundReports: AnalyzedCodeReport[];
  editionLabels: Record<string, string>;
  rawPastedCodes: string[];
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

export function ComparisonTab({ foundReports, editionLabels, rawPastedCodes }: ComparisonTabProps): React.ReactElement {
  const editions: Edition[] = rawPastedCodes
    .map(code => {
      const report = foundReports.find(r => r.discount_code === code);
      return report ? { code, label: editionLabels[code] ?? code, report } : null;
    })
    .filter((e): e is Edition => e !== null);

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
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Comparison Analysis</p>
        <h2 className="text-[20px] font-black text-[#0f0f0f] leading-tight flex flex-wrap items-center gap-1">
          {editions.map((e, i) => (
            <span key={e.code} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="w-4 h-4 text-[#c8c8c8] shrink-0" />}
              {e.label}
            </span>
          ))}
        </h2>
        <p className="text-xs text-[#a1a1a1] font-mono mt-1">
          {editions.length} edition{editions.length !== 1 ? "s" : ""}
        </p>
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
                  <text x={cx} y={TH - 8} textAnchor="middle" fontSize="9" fill="#888" fontFamily="monospace">{e.label}</text>
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
                  <text x={cx} y={VH - 6} textAnchor="middle" fontSize="9" fill="#888" fontFamily="monospace">{e.label}</text>
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
                <text x={xPos(i)} y={TH - 8} textAnchor="middle" fontSize="9" fill="#888" fontFamily="monospace">{e.label}</text>
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
                {["Edition", "Code", "Signups", "Paying", "Conversion", "Avg LTV 12", "Grade"].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 font-semibold text-[#a1a1a1] font-mono uppercase tracking-wide text-[9px]${i >= 2 && i <= 5 ? " text-right" : i === 6 ? " text-center" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f3]">
              {editions.map(e => (
                <tr key={e.code} className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#1a1a1a]">{e.label}</td>
                  <td className="px-4 py-3 font-mono text-[10.5px] text-[#3d3d3d]">{e.code}</td>
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
