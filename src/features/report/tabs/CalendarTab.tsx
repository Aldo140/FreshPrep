import React, { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MonthStats, CustomerDataResult } from "../../../hooks/useCustomerData";

interface CalendarTabProps {
  customerData: CustomerDataResult;
}

const PROVINCE_COLORS: Record<string, string> = {
  ON: "#2b5346",
  BC: "#4d8970",
  AB: "#86b09e",
  QC: "#c9a000",
  SK: "#8a6f00",
  MB: "#6b8e9f",
  NS: "#9b4a1c",
  NB: "#a1a1a1",
};

function provColor(prov: string): string {
  return PROVINCE_COLORS[prov] ?? "#c8c8c8";
}

function DeltaBadge({ delta }: { delta: number | null }): React.ReactElement {
  if (delta === null) return <span className="text-[9px] font-mono text-[#c8c8c8]">no prior yr</span>;
  const up = delta >= 0;
  return (
    <span className={`text-[9px] font-mono font-semibold flex items-center gap-0.5 ${up ? "text-[#2b5346]" : "text-[#850b0b]"}`}>
      {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {up ? "+" : ""}{delta}
    </span>
  );
}

interface BarChartProps {
  monthStats: MonthStats[];
}

function MonthTotalsChart({ monthStats }: BarChartProps): React.ReactElement {
  const now = new Date();
  const currentYear = now.getFullYear();
  const priorYear = currentYear - 1;

  const currentYearData: Record<string, number> = {};
  const priorYearData: Record<string, number> = {};

  for (const ms of monthStats) {
    const [y, m] = ms.monthKey.split("-");
    if (Number(y) === currentYear) currentYearData[m] = ms.totalSignups;
    if (Number(y) === priorYear) priorYearData[m] = ms.totalSignups;
  }

  const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const allValues = [...Object.values(currentYearData), ...Object.values(priorYearData)];
  const maxVal = Math.max(1, ...allValues);

  const W = 600, H = 180;
  const PAD = { t: 16, r: 16, b: 36, l: 44 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;
  const slotW = pw / 12;
  const barW = Math.min(14, slotW * 0.35);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Monthly Signups</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2.5 rounded-sm bg-[#2b5346]" />
            <span className="text-[9px] font-mono text-[#a1a1a1]">{currentYear}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2.5 rounded-sm bg-[#86b09e]" />
            <span className="text-[9px] font-mono text-[#a1a1a1]">{priorYear}</span>
          </span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#e5e5e5] p-4 overflow-x-auto">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%", display: "block" }}>
          <line x1={PAD.l} y1={PAD.t + ph} x2={W - PAD.r} y2={PAD.t + ph} stroke="#e5e5e5" strokeWidth="1" />
          <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" fontSize="8" fill="#c0c0c0" fontFamily="monospace">{maxVal}</text>
          <text x={PAD.l - 6} y={PAD.t + ph + 4} textAnchor="end" fontSize="8" fill="#c0c0c0" fontFamily="monospace">0</text>
          {months.map((m, i) => {
            const cx = PAD.l + i * slotW + slotW / 2;
            const barTop = (v: number) => PAD.t + ph - (v / maxVal) * ph;
            const curVal = currentYearData[m] ?? 0;
            const priVal = priorYearData[m] ?? 0;
            const curH = (curVal / maxVal) * ph;
            const priH = (priVal / maxVal) * ph;
            return (
              <g key={m}>
                <rect x={cx - barW - 1} y={barTop(curVal)} width={barW} height={curH} fill="#2b5346" rx="2" opacity={curVal === 0 ? 0.15 : 1} />
                <rect x={cx + 1} y={barTop(priVal)} width={barW} height={priH} fill="#86b09e" rx="2" opacity={priVal === 0 ? 0.15 : 1} />
                <text x={cx} y={H - 6} textAnchor="middle" fontSize="8" fill="#888" fontFamily="monospace">{monthLabels[i]}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

interface DrillDownProps {
  selected: MonthStats;
  priorYear: MonthStats | null;
}

function DrillDown({ selected, priorYear }: DrillDownProps): React.ReactElement {
  return (
    <div className="border border-[#e5e5e5] rounded-2xl bg-white overflow-hidden">
      <div className="flex items-stretch divide-x divide-[#f0f0ee] border-b border-[#f0f0ee]">
        <div className="flex-1 px-5 py-4">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-0.5">Selected</p>
          <p className="text-[15px] font-black text-[#0f0f0f]">{selected.label}</p>
          <p className="text-2xl font-black text-[#2b5346] mt-1">{selected.totalSignups.toLocaleString()}</p>
          <p className="text-[9px] font-mono text-[#a1a1a1]">signups</p>
        </div>
        <div className="flex-1 px-5 py-4 bg-[#fafafa]">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-0.5">Prior year</p>
          {priorYear ? (
            <>
              <p className="text-[15px] font-black text-[#3d3d3d]">{priorYear.label}</p>
              <p className="text-2xl font-black text-[#86b09e] mt-1">{priorYear.totalSignups.toLocaleString()}</p>
              <p className="text-[9px] font-mono text-[#a1a1a1]">signups</p>
            </>
          ) : (
            <p className="text-sm text-[#c8c8c8] font-mono mt-2">No data</p>
          )}
        </div>
      </div>

      {selected.codeBreakdown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#f0f0ee] bg-[#fafafa]">
                {["Code", "Signups", "Active", "Paused"].map((h, i) => (
                  <th key={h} className={`px-4 py-2 font-semibold text-[#a1a1a1] font-mono uppercase tracking-wide text-[9px]${i > 0 ? " text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f3]">
              {selected.codeBreakdown.map(cb => (
                <tr key={cb.code} className="hover:bg-[#fafafa]">
                  <td className="px-4 py-2.5 font-mono text-[10.5px] text-[#1a1a1a]">{cb.code}</td>
                  <td className="px-4 py-2.5 font-mono text-right text-[#1a1a1a] font-semibold">{cb.signups}</td>
                  <td className="px-4 py-2.5 font-mono text-right text-[#2b5346]">{cb.active}</td>
                  <td className="px-4 py-2.5 font-mono text-right text-[#850b0b]">{cb.paused}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CalendarTab({ customerData }: CalendarTabProps): React.ReactElement {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { monthStats, hasData } = customerData;

  if (!hasData || monthStats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <p className="text-sm text-[#a1a1a1] font-mono">No matching customer data found for your codes.</p>
      </div>
    );
  }

  const rolling12 = [...monthStats.slice(0, 12)].reverse();

  const statsByKey: Record<string, MonthStats> = {};
  for (const ms of monthStats) statsByKey[ms.monthKey] = ms;

  const selectedStats = selectedMonth ? (statsByKey[selectedMonth] ?? null) : null;
  const priorYearStats = selectedMonth
    ? (statsByKey[selectedMonth.replace(/^(\d{4})/, y => String(Number(y) - 1))] ?? null)
    : null;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col gap-10">

      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1] mb-1">Calendar View</p>
        <h2 className="text-[20px] font-black text-[#0f0f0f]">12-Month Event Activity</h2>
        <p className="text-xs text-[#a1a1a1] font-mono mt-1">Click a month to see per-code breakdown and YoY comparison.</p>
      </div>

      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">Rolling 12 Months</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rolling12.map(ms => {
            const isSelected = selectedMonth === ms.monthKey;
            const topProvs = Object.entries(ms.signupsByProvince)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5);
            return (
              <button
                key={ms.monthKey}
                onClick={() => setSelectedMonth(prev => prev === ms.monthKey ? null : ms.monthKey)}
                className={`text-left rounded-2xl border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#2b5346] bg-[#eef4f1] shadow-sm"
                    : "border-[#e5e5e5] bg-white hover:border-[#2b5346]/40 hover:bg-[#f8f7f5]"
                }`}
                style={{ transition: "border-color 150ms var(--ease-out), background-color 150ms var(--ease-out)" }}
              >
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-1">{ms.label}</p>
                <p className={`text-2xl font-black ${ms.totalSignups === 0 ? "text-[#c8c8c8]" : "text-[#0f0f0f]"}`}>
                  {ms.totalSignups}
                </p>
                <p className="text-[9px] font-mono text-[#a1a1a1]">signups</p>
                <div className="flex flex-wrap gap-1 mt-2 min-h-[10px]">
                  {topProvs.map(([prov, count]) => (
                    <span key={prov} className="flex items-center gap-0.5" title={`${prov}: ${count}`}>
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: provColor(prov) }} />
                      <span className="text-[8px] font-mono text-[#888]">{prov}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-1.5">
                  <DeltaBadge delta={ms.yoyDelta} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedStats && (
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1] mb-3">
            {selectedStats.label} — Detail
          </p>
          <DrillDown selected={selectedStats} priorYear={priorYearStats} />
        </div>
      )}

      <MonthTotalsChart monthStats={monthStats} />

      {customerData.provinces.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {customerData.provinces.map(prov => (
            <span key={prov} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: provColor(prov) }} />
              <span className="text-[10px] font-mono text-[#3d3d3d]">{prov}</span>
            </span>
          ))}
        </div>
      )}

    </div>
  );
}
