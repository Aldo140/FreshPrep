import React, { useState, useMemo } from "react";
import { DiscountCodeData, AnalyzedCodeReport } from "../../../types";
import {
  Users, DollarSign, TrendingUp, AlertTriangle,
  Award, TrendingDown, LineChart, Info,
} from "lucide-react";

interface ProvinceIntelligenceProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
}

interface ProvinceMetricSummary {
  province: string;
  totalSignups: number;
  totalPayingCustomers: number;
  conversion: number;
  totalLTV12: number;
  avgLTV12: number;
  totalDiscount: number;
  efficiencyRatio: number;
  metricScore: number;
  grade: "Elite" | "Strong" | "Average" | "Weak";
}

const GRADE_STYLE: Record<string, { pill: string; border: string; bg: string }> = {
  Elite:   { pill: "bg-purple-100 text-purple-900 border-purple-200",    border: "hover:border-purple-300",   bg: "bg-purple-50/20" },
  Strong:  { pill: "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20",   border: "hover:border-[#2b5346]/30", bg: "bg-[#eef4f1]/10" },
  Average: { pill: "bg-[#fdf8e1] text-[#8a6f00] border-[#e7bd27]/30",   border: "hover:border-[#e7bd27]/50", bg: "bg-[#fdf8e1]/20" },
  Weak:    { pill: "bg-[#ffd0d0] text-[#850b0b] border-[#850b0b]/20",   border: "hover:border-[#850b0b]/30", bg: "bg-[#ffd0d0]/10" },
};

const GRADE_DESC: Record<string, string> = {
  Elite:   "Top conversion and LTV — prioritise budget here.",
  Strong:  "Solid results. Worth growing event presence.",
  Average: "Baseline performance. Room to improve.",
  Weak:    "Low conversion or LTV — review fit or event format.",
};

export default function ProvinceIntelligence({ dbRows, foundReports }: ProvinceIntelligenceProps) {
  const [dataSource, setDataSource] = useState<"audited" | "full">("audited");
  const [sortBy, setSortBy] = useState<"paying" | "conversion" | "ltv" | "signups" | "score">("paying");

  const activeDataset = useMemo(() => {
    if (dataSource === "audited") {
      const analyzedCodes = new Set(
        foundReports.map(r => r.discount_code.trim().toUpperCase()),
      );
      return dbRows.filter(row => analyzedCodes.has(row.discount_code.trim().toUpperCase()));
    }
    return dbRows;
  }, [dataSource, foundReports, dbRows]);

  const provinceMetrics = useMemo(() => {
    const map = new Map<string, {
      province: string; signups: number; paying: number;
      ltv12: number; discount: number;
    }>();

    for (const row of activeDataset) {
      const prov = (row.Province || "").trim().toUpperCase() || "ON";
      const e = map.get(prov) ?? { province: prov, signups: 0, paying: 0, ltv12: 0, discount: 0 };
      e.signups  += row.Signups || 0;
      e.paying   += row["Paying cx"] || 0;
      e.ltv12    += row["Sum LTV 12"] || 0;
      e.discount += Math.abs(row.total_discount_used || 0);
      map.set(prov, e);
    }

    return Array.from(map.values()).map(val => {
      const conversion = val.signups > 0 ? (val.paying / val.signups) * 100 : 0;
      const avgLTV12 = val.paying > 0 ? val.ltv12 / val.paying : 0;
      const efficiencyRatio = val.discount > 0 ? val.ltv12 / val.discount : 0;

      const sConv    = Math.min(100, conversion * 1.8);
      const sLtv     = Math.min(100, (avgLTV12 / 1000) * 100);
      const sSignups = Math.min(100, (val.signups / 500) * 100);
      const metricScore = Math.round(sConv * 0.4 + sLtv * 0.4 + sSignups * 0.2);

      let grade: ProvinceMetricSummary["grade"] = "Weak";
      if (metricScore >= 75 || (conversion >= 50 && val.paying >= 10)) grade = "Elite";
      else if (metricScore >= 50 || (conversion >= 35 && val.paying >= 5)) grade = "Strong";
      else if (metricScore >= 25 || conversion >= 20) grade = "Average";

      return {
        province: val.province, totalSignups: val.signups,
        totalPayingCustomers: val.paying, conversion,
        totalLTV12: val.ltv12, avgLTV12, totalDiscount: val.discount,
        efficiencyRatio, metricScore, grade,
      } satisfies ProvinceMetricSummary;
    });
  }, [activeDataset]);

  const scorecards = useMemo(() => {
    let bestConversion  = { province: "N/A", val: 0, sub: "0/0" };
    let bestLTV         = { province: "N/A", val: 0, sub: "$0 total" };
    let mostSignups     = { province: "N/A", val: 0 };
    let mostPaying      = { province: "N/A", val: 0 };

    for (const m of provinceMetrics) {
      if (m.conversion > bestConversion.val)
        bestConversion = { province: m.province, val: m.conversion,
          sub: `${m.totalPayingCustomers.toLocaleString()} / ${m.totalSignups.toLocaleString()} converted` };
      if (m.avgLTV12 > bestLTV.val && m.totalPayingCustomers > 0)
        bestLTV = { province: m.province, val: m.avgLTV12,
          sub: `$${Math.round(m.totalLTV12).toLocaleString()} total region value` };
      if (m.totalSignups > mostSignups.val)
        mostSignups = { province: m.province, val: m.totalSignups };
      if (m.totalPayingCustomers > mostPaying.val)
        mostPaying = { province: m.province, val: m.totalPayingCustomers };
    }
    return { bestConversion, bestLTV, mostSignups, mostPaying };
  }, [provinceMetrics]);

  const recommendations = useMemo(() => {
    if (provinceMetrics.length === 0) return null;

    let highestOpportunity = provinceMetrics[0];
    let maxOppIdx = -1;
    let highestEfficiency = provinceMetrics[0];
    let lowestPerforming = provinceMetrics[0];
    let extraInvestment = provinceMetrics[0];
    let maxInvestMargin = -1;

    for (const m of provinceMetrics) {
      const oppIdx = m.totalSignups > 0 ? (m.conversion * m.avgLTV12) / Math.sqrt(m.totalSignups) : 0;
      if (oppIdx > maxOppIdx) { maxOppIdx = oppIdx; highestOpportunity = m; }
      if (m.efficiencyRatio > highestEfficiency.efficiencyRatio && m.totalDiscount > 0) highestEfficiency = m;
      if (m.conversion < lowestPerforming.conversion) lowestPerforming = m;
      const investMargin = m.totalSignups * (100 - m.conversion);
      if (investMargin > maxInvestMargin) { maxInvestMargin = investMargin; extraInvestment = m; }
    }
    return { highestOpportunity, highestEfficiency, lowestPerforming, extraInvestment };
  }, [provinceMetrics]);

  const sortedLeaderboard = useMemo(() => [...provinceMetrics].sort((a, b) => {
    if (sortBy === "conversion") return b.conversion - a.conversion;
    if (sortBy === "ltv")        return b.avgLTV12 - a.avgLTV12;
    if (sortBy === "signups")    return b.totalSignups - a.totalSignups;
    if (sortBy === "score")      return b.metricScore - a.metricScore;
    return b.totalPayingCustomers - a.totalPayingCustomers;
  }), [provinceMetrics, sortBy]);

  const maxStats = useMemo(() => {
    let maxSignups = 1, maxLtv = 1, maxPaying = 1;
    for (const m of provinceMetrics) {
      if (m.totalSignups > maxSignups)            maxSignups = m.totalSignups;
      if (m.avgLTV12 > maxLtv)                   maxLtv     = m.avgLTV12;
      if (m.totalPayingCustomers > maxPaying)     maxPaying  = m.totalPayingCustomers;
    }
    return { maxSignups, maxLtv, maxPaying };
  }, [provinceMetrics]);

  if (provinceMetrics.length === 0) {
    return (
      <div className="bg-white border border-[#e5e5e5] rounded-2xl p-10 text-center">
        <p className="text-sm text-[#a1a1a1] font-mono">No regional data available for the current selection.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Data scope toggle ──────────────────────────────── */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between shadow-sm">
        <div>
          <p className="text-xs font-semibold text-[#1a1a1a]">
            {activeDataset.length.toLocaleString()} records in view
          </p>
          <p className="text-[10px] text-[#a1a1a1] font-mono">
            {dataSource === "audited"
              ? "Filtered to your analyzed codes only."
              : "Full uploaded dataset — all codes, all channels."}
          </p>
        </div>
        <div className="flex bg-[#f5f5f3] p-1 rounded-lg border border-[#e5e5e5] shrink-0">
          <button
            onClick={() => { setDataSource("audited"); setSortBy("paying"); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              dataSource === "audited" ? "bg-white text-[#2b5346] shadow-sm border border-[#d0e8e2]" : "text-[#888] hover:text-[#1a1a1a]"
            }`}
          >
            Analyzed codes ({foundReports.length})
          </button>
          <button
            onClick={() => { setDataSource("full"); setSortBy("paying"); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              dataSource === "full" ? "bg-white text-[#2b5346] shadow-sm border border-[#d0e8e2]" : "text-[#888] hover:text-[#1a1a1a]"
            }`}
          >
            Full dataset ({dbRows.length.toLocaleString()})
          </button>
        </div>
      </div>

      {/* ── Top scorecards ──────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Best conversion", icon: <TrendingUp className="w-4 h-4" />, value: `${scorecards.bestConversion.val.toFixed(1)}%`, badge: scorecards.bestConversion.province, sub: scorecards.bestConversion.sub },
          { label: "Highest avg LTV 12m", icon: <DollarSign className="w-4 h-4" />, value: `$${Math.round(scorecards.bestLTV.val).toLocaleString()}`, badge: scorecards.bestLTV.province, sub: scorecards.bestLTV.sub },
          { label: "Most signups", icon: <Users className="w-4 h-4" />, value: scorecards.mostSignups.val.toLocaleString(), badge: scorecards.mostSignups.province, sub: "Highest signup volume" },
          { label: "Most paying customers", icon: <Award className="w-4 h-4" />, value: scorecards.mostPaying.val.toLocaleString(), badge: scorecards.mostPaying.province, sub: "Total paying acquisitions" },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-[#2b5346]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-mono font-semibold uppercase tracking-wider text-[#a1a1a1]">{card.label}</span>
              <div className="w-6 h-6 rounded-lg bg-[#eef4f1] flex items-center justify-center text-[#2b5346]">
                {card.icon}
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[26px] font-black font-mono text-[#1a1a1a] leading-none">{card.value}</span>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#eef4f1] text-[#2b5346] border border-[#2b5346]/20">
                  {card.badge}
                </span>
              </div>
              <p className="text-[10px] text-[#a1a1a1] mt-1.5 truncate">{card.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Performance tiers + Province comparison ─────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Performance tiers */}
        <div className="bg-white border border-[#e5e5e5] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="border-b border-[#f5f5f3] pb-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Classification</p>
            <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5">Performance tiers</h3>
            <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">Provinces ranked by conversion, LTV, and signup volume.</p>
          </div>

          <div className="flex flex-col gap-3">
            {(["Elite", "Strong", "Average", "Weak"] as const).map(grade => {
              const inGrade = provinceMetrics.filter(p => p.grade === grade);
              const gs = GRADE_STYLE[grade];
              return (
                <div key={grade} className={`border border-[#f0f0ee] p-3 rounded-xl transition-colors ${gs.border}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black font-mono tracking-widest px-2 py-0.5 rounded-full border uppercase ${gs.pill}`}>
                        {grade}
                      </span>
                      <span className="text-[9.5px] text-[#a1a1a1]">
                        {inGrade.length} province{inGrade.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="text-[9.5px] text-[#888] italic hidden sm:block">{GRADE_DESC[grade]}</span>
                  </div>

                  {inGrade.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {inGrade.map(row => (
                        <div key={row.province} className={`${gs.bg} border border-[#f0f0ee] p-2.5 rounded-lg flex justify-between items-center`}>
                          <div>
                            <p className="font-black text-[13px] text-[#0f0f0f] font-mono">{row.province}</p>
                            <p className="text-[9px] text-[#888] font-mono mt-0.5">
                              {row.conversion.toFixed(1)}% conv.
                            </p>
                          </div>
                          <div className="text-right font-mono">
                            <p className="text-[11px] font-black text-[#1a1a1a]">${Math.round(row.avgLTV12).toLocaleString()}</p>
                            <p className="text-[8px] uppercase tracking-wider text-[#a1a1a1] font-semibold">avg LTV 12m</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#c0c0c0] italic">No provinces in this tier.</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[9px] font-mono text-[#c8c8c8] border-t border-[#f5f5f3] pt-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Score: 40% conversion · 40% avg LTV · 20% signup volume
          </p>
        </div>

        {/* Province bars */}
        <div className="bg-white border border-[#e5e5e5] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="border-b border-[#f5f5f3] pb-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Comparison</p>
            <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5">Province metrics</h3>
            <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">Signups, conversion rate, and avg LTV — relative to the top province.</p>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-0.5">
            {provinceMetrics.map(row => {
              const relSignups = Math.min(100, (row.totalSignups / maxStats.maxSignups) * 100);
              const relLtv     = Math.min(100, (row.avgLTV12    / maxStats.maxLtv)     * 100);
              const relConv    = Math.min(100, row.conversion);

              return (
                <div key={row.province} className="border border-[#f0f0ee] p-3 rounded-xl bg-[#fafafa] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-[#0f0f0f] font-mono bg-[#f0f0ee] px-2 py-0.5 rounded border border-[#e5e5e5]">
                      {row.province}
                    </span>
                    <span className="text-[10px] font-mono text-[#888]">
                      Score <span className="font-black text-[#2b5346]">{row.metricScore}</span>/100
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-[9.5px]">
                    {[
                      { label: "Signups", value: row.totalSignups.toLocaleString(), pct: relSignups, color: "#c0c0c0" },
                      { label: "Conversion", value: `${row.conversion.toFixed(1)}%`, pct: relConv, color: "#2b5346" },
                      { label: "Avg LTV 12m", value: `$${Math.round(row.avgLTV12).toLocaleString()}`, pct: relLtv, color: "#c9a000" },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between text-[#888] mb-0.5">
                          <span>{m.label}</span>
                          <span className="font-mono font-semibold text-[#3d3d3d]">{m.value}</span>
                        </div>
                        <div className="h-1.5 bg-[#eee] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[9px] font-mono text-[#a1a1a1] border-t border-[#f5f5f3] pt-2">
            {[["#c0c0c0","Signups"],["#2b5346","Conversion"],["#c9a000","Avg LTV 12m"]].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Province leaderboard ─────────────────────────────── */}
      <section>
        <div className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f5f5f3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafafa]">
            <div>
              <h3 className="text-sm font-black text-[#0f0f0f]">Province leaderboard</h3>
              <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">Sort by any column to rerank.</p>
            </div>
            <div className="flex items-center gap-1 bg-[#f0f0ee] p-1 rounded-lg border border-[#e5e5e5] flex-wrap">
              <span className="text-[9px] font-mono uppercase text-[#a1a1a1] px-1 shrink-0">Sort:</span>
              {([
                ["paying",     "Paying cx"],
                ["conversion", "Conversion"],
                ["ltv",        "Avg LTV"],
                ["signups",    "Signups"],
                ["score",      "Score"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md cursor-pointer transition ${
                    sortBy === key ? "bg-white text-[#2b5346] shadow-sm border border-[#d0e8e2]" : "text-[#888] hover:text-[#1a1a1a]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fafafa] border-b border-[#f0f0ee] text-[#a1a1a1] font-semibold font-mono uppercase text-[9px]">
                  <th className="py-2.5 px-4 text-center w-10">#</th>
                  <th className="py-2.5 px-4">Province</th>
                  <th className="py-2.5 px-4 text-right">Signups</th>
                  <th className="py-2.5 px-4 text-right">Paying cx</th>
                  <th className="py-2.5 px-4 text-right">Conversion</th>
                  <th className="py-2.5 px-4 text-right">Avg LTV 12m</th>
                  <th className="py-2.5 px-4 text-right">Discount used</th>
                  <th className="py-2.5 px-4 text-right">LTV / discount</th>
                  <th className="py-2.5 px-4 text-center">Score</th>
                  <th className="py-2.5 px-4 text-center">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f8f8] text-[#3d3d3d]">
                {sortedLeaderboard.map((row, i) => {
                  const gs = GRADE_STYLE[row.grade];
                  return (
                    <tr key={row.province} className="hover:bg-[#fafafa]">
                      <td className="py-2.5 px-4 text-center text-[#c0c0c0] font-mono text-[10.5px]">{i + 1}</td>
                      <td className="py-2.5 px-4 font-black text-[#0f0f0f] font-mono">{row.province}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{row.totalSignups.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{row.totalPayingCustomers.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1a1a1a]">{row.conversion.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 text-right font-mono">${Math.round(row.avgLTV12).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#a1a1a1]">${Math.round(row.totalDiscount).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#2b5346]">{row.efficiencyRatio.toFixed(1)}x</td>
                      <td className="py-2.5 px-4 text-center font-mono text-[#888]">
                        <span className="font-black text-[#1a1a1a]">{row.metricScore}</span>/100
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block text-[8.5px] font-black font-mono tracking-wider uppercase px-2 py-0.5 border rounded-full ${gs.pill}`}>
                          {row.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Regional insights ───────────────────────────────── */}
      {recommendations && (
        <section className="bg-[#1a1a1a] text-white rounded-2xl p-5 border border-[#2a2a2a]">
          <div className="border-b border-[#2a2a2a] pb-3 mb-5">
            <h3 className="text-xs font-black text-[#e7bd27] font-mono uppercase tracking-wider">Regional insights</h3>
            <p className="text-[10px] text-[#888] font-mono mt-0.5">Data-driven read on where to push and where to pull back.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between hover:border-[#e7bd27]/30 transition-colors">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#e7bd27] uppercase block mb-1.5">Best opportunity</span>
                <h4 className="text-xl font-black font-mono text-white">{recommendations.highestOpportunity.province}</h4>
                <p className="text-[10.5px] text-[#888] mt-2.5 leading-relaxed">
                  <strong className="text-white">{recommendations.highestOpportunity.conversion.toFixed(1)}% conversion</strong> and <strong className="text-white">${Math.round(recommendations.highestOpportunity.avgLTV12).toLocaleString()} avg LTV</strong> — strong ROI signal. Worth scaling event presence here.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-[#888] uppercase font-mono font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#e7bd27]" /> Scale up
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between hover:border-[#e78a58]/30 transition-colors">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#e78a58] uppercase block mb-1.5">Most efficient</span>
                <h4 className="text-xl font-black font-mono text-white">{recommendations.highestEfficiency.province}</h4>
                <p className="text-[10.5px] text-[#888] mt-2.5 leading-relaxed">
                  Returns <strong className="text-white">{recommendations.highestEfficiency.efficiencyRatio.toFixed(1)}x LTV</strong> per dollar of discount. Low price sensitivity — discount spend here is well-optimised.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-[#888] uppercase font-mono font-bold flex items-center gap-1">
                <Award className="w-3 h-3 text-[#e78a58]" /> Protect budget here
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between transition-colors">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#888] uppercase block mb-1.5">Lowest conversion</span>
                <h4 className="text-xl font-black font-mono text-white">{recommendations.lowestPerforming.province}</h4>
                <p className="text-[10.5px] text-[#888] mt-2.5 leading-relaxed">
                  Only <strong className="text-white">{recommendations.lowestPerforming.conversion.toFixed(1)}%</strong> conversion rate. Review whether events here are the right fit or if the offer needs adjustment.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-[#888] uppercase font-mono font-bold flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-[#850b0b]" /> Re-evaluate
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between hover:border-[#e7bd27]/30 transition-colors">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#e7bd27] uppercase block mb-1.5">High volume, low close</span>
                <h4 className="text-xl font-black font-mono text-white">{recommendations.extraInvestment.province}</h4>
                <p className="text-[10.5px] text-[#888] mt-2.5 leading-relaxed">
                  <strong className="text-white">{recommendations.extraInvestment.totalSignups.toLocaleString()} signups</strong> but conversion is under-performing. Strong top-of-funnel demand — worth investigating drop-off in onboarding.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-[#888] uppercase font-mono font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-[#e78a58]" /> Investigate drop-off
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
