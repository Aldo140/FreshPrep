import React, { useState, useMemo } from "react";
import { DiscountCodeData, AnalyzedCodeReport } from "../../../types";
import {
  Users, DollarSign, TrendingUp,
  Award, Info, Search, X, ChevronRight,
} from "lucide-react";
import { MetricInfo } from "../../../components/MetricInfo";

interface ProvinceIntelligenceProps {
  dbRows: DiscountCodeData[];
  foundReports: AnalyzedCodeReport[];
  channelScope?: string;
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
  grade: "Leading" | "Growing" | "Developing" | "Weak";
}

const GRADE_STYLE: Record<string, { pill: string; border: string; bg: string }> = {
  Leading:    { pill: "bg-purple-100 text-purple-900 border-purple-200",    border: "hover:border-purple-300",   bg: "bg-purple-50/20" },
  Growing:    { pill: "bg-[#eef4f1] text-[#2b5346] border-[#2b5346]/20",   border: "hover:border-[#2b5346]/30", bg: "bg-[#eef4f1]/10" },
  Developing: { pill: "bg-[#fdf8e1] text-[#8a6f00] border-[#e7bd27]/30",   border: "hover:border-[#e7bd27]/50", bg: "bg-[#fdf8e1]/20" },
  Weak:       { pill: "bg-[#ffd0d0] text-[#850b0b] border-[#850b0b]/20",   border: "hover:border-[#850b0b]/30", bg: "bg-[#ffd0d0]/10" },
};

const GRADE_DESC: Record<string, string> = {
  Leading:    "Top conversion and LTV — strong signal for continued investment.",
  Growing:    "Solid momentum. Opportunity to deepen event presence.",
  Developing: "Positive early signals. Events building awareness and pipeline.",
  Weak:       "Low conversion or LTV — review fit or event format.",
};

export default function ProvinceIntelligence({ dbRows, foundReports, channelScope }: ProvinceIntelligenceProps) {
  const eventsMode = channelScope === "events";
  const [dataSource, setDataSource] = useState<"audited" | "full">("audited");
  const [sortBy, setSortBy] = useState<"paying" | "conversion" | "ltv" | "signups" | "score">("paying");
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [eventChannel, setEventChannel] = useState("all");
  const [eventConversion, setEventConversion] = useState<"all" | "high" | "medium" | "low">("all");
  const [eventMinSignups, setEventMinSignups] = useState("0");

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
      if (metricScore >= 75 || (conversion >= 50 && val.paying >= 10)) grade = "Leading";
      else if (metricScore >= 50 || (conversion >= 35 && val.paying >= 5)) grade = "Growing";
      else if (metricScore >= 25 || conversion >= 20) grade = "Developing";

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
    let highestLTV = provinceMetrics[0];
    let strongestVolume = provinceMetrics[0];

    for (const m of provinceMetrics) {
      const oppIdx = m.totalSignups > 0 ? (m.conversion * m.avgLTV12) / Math.sqrt(m.totalSignups) : 0;
      if (oppIdx > maxOppIdx) { maxOppIdx = oppIdx; highestOpportunity = m; }
      if (m.efficiencyRatio > highestEfficiency.efficiencyRatio && m.totalDiscount > 0) highestEfficiency = m;
      if (m.avgLTV12 > highestLTV.avgLTV12 && m.totalPayingCustomers > 0) highestLTV = m;
      if (m.totalSignups > strongestVolume.totalSignups) strongestVolume = m;
    }
    return { highestOpportunity, highestEfficiency, highestLTV, strongestVolume };
  }, [provinceMetrics]);

  const sortedLeaderboard = useMemo(() => [...provinceMetrics].sort((a, b) => {
    if (sortBy === "conversion") return b.conversion - a.conversion;
    if (sortBy === "ltv")        return b.avgLTV12 - a.avgLTV12;
    if (sortBy === "signups")    return b.totalSignups - a.totalSignups;
    if (sortBy === "score")      return b.metricScore - a.metricScore;
    return b.totalPayingCustomers - a.totalPayingCustomers;
  }), [provinceMetrics, sortBy]);

  const provinceEvents = useMemo(() => {
    if (!selectedProvince) return [];
    return activeDataset.filter(row =>
      ((row.Province || "").trim().toUpperCase() || "ON") === selectedProvince
    );
  }, [activeDataset, selectedProvince]);

  const eventChannels = useMemo(() =>
    Array.from(new Set(provinceEvents.map(row => row.channel || "Unspecified"))).sort(),
    [provinceEvents],
  );

  const filteredProvinceEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    const minSignups = Math.max(0, Number(eventMinSignups) || 0);

    return provinceEvents
      .filter(row => {
        const conversion = row.Signups > 0 ? (row["Paying cx"] / row.Signups) * 100 : 0;
        const matchesSearch = !query
          || row.discount_code.toLowerCase().includes(query)
          || (row.channel || "").toLowerCase().includes(query);
        const matchesChannel = eventChannel === "all" || (row.channel || "Unspecified") === eventChannel;
        const matchesConversion = eventConversion === "all"
          || (eventConversion === "high" && conversion >= 40)
          || (eventConversion === "medium" && conversion >= 20 && conversion < 40)
          || (eventConversion === "low" && conversion < 20);
        return matchesSearch && matchesChannel && matchesConversion && row.Signups >= minSignups;
      })
      .sort((a, b) => b.Signups - a.Signups);
  }, [provinceEvents, eventSearch, eventChannel, eventConversion, eventMinSignups]);

  const openProvinceEvents = (province: string) => {
    setSelectedProvince(province);
    setEventSearch("");
    setEventChannel("all");
    setEventConversion("all");
    setEventMinSignups("0");
  };

  const selectedProvinceMetric = provinceMetrics.find(row => row.province === selectedProvince);

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
          {eventsMode && (
            <p className="flex items-center gap-1 text-[9.5px] font-mono text-[#a07800] mt-1.5">
              <Info className="w-3 h-3 shrink-0 text-[#c9a000]" />
              Some EV-prefix codes may be missing
              <MetricInfo
                side="bottom"
                text="Codes from 2024 and earlier weren't always tagged 'Events' in the database — they may not appear here. To guarantee all EV-prefix codes are included, enable the EV-prefix toggle in the scope bar above."
              />
            </p>
          )}
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

      {/* ── Province metrics (Comparison) — FIRST ──────────── */}
      <section>
        <div className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0f0ee] bg-[#fafafa] flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Comparison</p>
              <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5">Province metrics</h3>
              <p className="text-[10px] text-[#a1a1a1] font-mono mt-0.5">Signups, conversion, and avg LTV relative to the top province. Click to drill down.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pb-0.5">
              {[["#c0c0c0","Signups"],["#2b5346","Conversion"],["#c9a000","Avg LTV"]].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1 text-[9px] font-mono text-[#a1a1a1]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c }} />{l}
                </span>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#f8f8f8]">
            {provinceMetrics.map(row => {
              const relSignups = Math.min(100, (row.totalSignups / maxStats.maxSignups) * 100);
              const relLtv     = Math.min(100, (row.avgLTV12    / maxStats.maxLtv)     * 100);
              const relConv    = Math.min(100, row.conversion);
              const gs = GRADE_STYLE[row.grade];

              return (
                <button
                  key={row.province}
                  type="button"
                  onClick={() => openProvinceEvents(row.province)}
                  className="w-full text-left flex items-center gap-4 px-5 py-3.5 hover:bg-[#f7faf8] transition-colors cursor-pointer group"
                >
                  {/* Province + grade */}
                  <div className="w-24 shrink-0">
                    <p className="font-black text-[15px] font-mono text-[#0f0f0f] leading-none mb-1">{row.province}</p>
                    <span className={`text-[8px] font-black font-mono tracking-wider uppercase px-1.5 py-0.5 rounded-full border ${gs.pill}`}>
                      {row.grade}
                    </span>
                  </div>

                  {/* Three metric bars */}
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    {[
                      { label: "Signups",    value: row.totalSignups.toLocaleString(),              pct: relSignups, color: "#c0c0c0" },
                      { label: "Conversion", value: `${row.conversion.toFixed(1)}%`,                pct: relConv,    color: "#2b5346" },
                      { label: "Avg LTV",    value: `$${Math.round(row.avgLTV12).toLocaleString()}`, pct: relLtv,    color: "#c9a000" },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[9px] font-mono text-[#a1a1a1]">{m.label}</span>
                          <span className="text-[10.5px] font-mono font-bold text-[#1a1a1a]">{m.value}</span>
                        </div>
                        <div className="h-1 bg-[#eeeeee] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Score + arrow */}
                  <div className="shrink-0 flex items-center gap-2 text-right">
                    <div>
                      <p className="text-[20px] font-black font-mono text-[#1a1a1a] leading-none">{row.metricScore}</p>
                      <p className="text-[8px] font-mono text-[#a1a1a1] leading-none mt-0.5">/ 100</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#d0d0d0] group-hover:text-[#2b5346] transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Performance tiers — SECOND ───────────────────── */}
      <section>
        <div className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0f0ee] bg-[#fafafa]">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#a1a1a1]">Classification</p>
            <h3 className="text-sm font-black text-[#0f0f0f] mt-0.5 flex items-center gap-1.5">
              Performance tiers
              <MetricInfo text="Each province is scored and classified based on how well BD events perform there. Score = 40% conversion + 40% avg customer value + 20% signup volume." />
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#f0f0ee]">
            {(["Leading", "Growing", "Developing", "Weak"] as const).map(grade => {
              const inGrade = provinceMetrics.filter(p => p.grade === grade);
              const gs = GRADE_STYLE[grade];
              return (
                <div key={grade} className="p-4 flex flex-col gap-3">
                  <div>
                    <span className={`inline-block text-[9px] font-black font-mono tracking-widest px-2 py-0.5 rounded-full border uppercase ${gs.pill}`}>
                      {grade}
                    </span>
                    <p className="text-[9px] text-[#a1a1a1] font-mono mt-2 leading-snug italic">{GRADE_DESC[grade]}</p>
                  </div>
                  {inGrade.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {inGrade.map(row => (
                        <div key={row.province} className={`${gs.bg} border border-[#f0f0ee] rounded-lg px-3 py-2 flex items-center justify-between`}>
                          <p className="font-black text-[13px] font-mono text-[#0f0f0f]">{row.province}</p>
                          <div className="text-right">
                            <p className="text-[10px] font-bold font-mono text-[#2b5346]">{row.conversion.toFixed(1)}%</p>
                            <p className="text-[8px] font-mono text-[#a1a1a1]">${Math.round(row.avgLTV12).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#c8c8c8] italic">No provinces</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-5 py-2.5 border-t border-[#f5f5f3] bg-[#fafafa]">
            <p className="text-[9px] font-mono text-[#c8c8c8] flex items-center gap-1">
              <Info className="w-3 h-3" />
              Score: 40% conversion · 40% avg LTV · 20% signup volume
            </p>
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
                  <th className="py-2.5 px-4 text-right"><span className="flex items-center justify-end gap-1">Signups <MetricInfo text="Total people who registered using any BD event code in this province — paid or not." /></span></th>
                  <th className="py-2.5 px-4 text-right"><span className="flex items-center justify-end gap-1">Paying cx <MetricInfo text="Signups who completed their trial and started paying full price — your real conversions." /></span></th>
                  <th className="py-2.5 px-4 text-right"><span className="flex items-center justify-end gap-1">Conversion <MetricInfo text="Paying customers ÷ total signups. How well this province's events turn attendees into subscribers." /></span></th>
                  <th className="py-2.5 px-4 text-right"><span className="flex items-center justify-end gap-1">Avg LTV 12m <MetricInfo text="Average estimated revenue per paying customer over their first 12 months. Higher = more valuable customers." /></span></th>
                  {eventsMode
                    ? <th className="py-2.5 px-4 text-right"><span className="flex items-center justify-end gap-1">Total LTV 12m <MetricInfo text="Sum of all paying customers' 12-month value in this province — the total revenue opportunity." /></span></th>
                    : <><th className="py-2.5 px-4 text-right"><span className="flex items-center justify-end gap-1">Discount used <MetricInfo text="Total monetary discount applied to orders from customers acquired in this province." /></span></th><th className="py-2.5 px-4 text-right"><span className="flex items-center justify-end gap-1">LTV / discount <MetricInfo text="How many dollars of 12-month revenue were generated per dollar of discount spent. Higher is more efficient." /></span></th></>
                  }
                  <th className="py-2.5 px-4 text-center"><span className="flex items-center justify-center gap-1">Score <MetricInfo text="Composite score out of 100 weighted by conversion (40%), avg LTV (40%), and signup volume (20%)." /></span></th>
                  <th className="py-2.5 px-4 text-center"><span className="flex items-center justify-center gap-1">Tier <MetricInfo text="Performance classification: Leading (top conversion + LTV), Growing (solid), Developing (early signals), Weak (needs review)." /></span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8f8f8] text-[#3d3d3d]">
                {sortedLeaderboard.map((row, i) => {
                  const gs = GRADE_STYLE[row.grade];
                  return (
                    <tr
                      key={row.province}
                      onClick={() => openProvinceEvents(row.province)}
                      className="hover:bg-[#fafafa] cursor-pointer"
                      title={`View ${row.province} events`}
                    >
                      <td className="py-2.5 px-4 text-center text-[#c0c0c0] font-mono text-[10.5px]">{i + 1}</td>
                      <td className="py-2.5 px-4 font-black text-[#0f0f0f] font-mono">{row.province}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{row.totalSignups.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{row.totalPayingCustomers.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1a1a1a]">{row.conversion.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 text-right font-mono">${Math.round(row.avgLTV12).toLocaleString()}</td>
                      {eventsMode
                        ? <td className="py-2.5 px-4 text-right font-mono font-bold text-[#2b5346]">${Math.round(row.totalLTV12).toLocaleString()}</td>
                        : <><td className="py-2.5 px-4 text-right font-mono text-[#a1a1a1]">${Math.round(row.totalDiscount).toLocaleString()}</td><td className="py-2.5 px-4 text-right font-mono font-bold text-[#2b5346]">{row.efficiencyRatio.toFixed(1)}x</td></>
                      }
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
            <p className="text-[10px] text-[#888] font-mono mt-0.5">Data-driven read on the strongest regional signals and where momentum is showing up.</p>
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

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between hover:border-[#2b9f75]/30 transition-colors">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#2b9f75] uppercase block mb-1.5">Highest LTV</span>
                <h4 className="text-xl font-black font-mono text-white">{recommendations.highestLTV.province}</h4>
                <p className="text-[10.5px] text-[#888] mt-2.5 leading-relaxed">
                  Delivers <strong className="text-white">${Math.round(recommendations.highestLTV.avgLTV12).toLocaleString()} avg LTV</strong> across <strong className="text-white">{recommendations.highestLTV.totalPayingCustomers.toLocaleString()} paying cx</strong>. Strong customer-value signal.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-[#888] uppercase font-mono font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-[#2b9f75]" /> High value market
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between hover:border-[#e7bd27]/30 transition-colors">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#e7bd27] uppercase block mb-1.5">Strongest volume</span>
                <h4 className="text-xl font-black font-mono text-white">{recommendations.strongestVolume.province}</h4>
                <p className="text-[10.5px] text-[#888] mt-2.5 leading-relaxed">
                  Generated <strong className="text-white">{recommendations.strongestVolume.totalSignups.toLocaleString()} signups</strong> and <strong className="text-white">{recommendations.strongestVolume.totalPayingCustomers.toLocaleString()} paying cx</strong>. Clear proof of regional reach.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-[#888] uppercase font-mono font-bold flex items-center gap-1">
                <Users className="w-3 h-3 text-[#e7bd27]" /> Broadest demand
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Province event drill-down ───────────────────────── */}
      {selectedProvince && selectedProvinceMetric && (
        <div
          className="fixed inset-0 z-50 bg-black/35 flex items-end sm:items-center justify-center p-0 sm:p-5"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelectedProvince(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProvince} events`}
            className="bg-white w-full sm:max-w-5xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[#e5e5e5] shadow-2xl overflow-hidden flex flex-col"
          >
            <header className="px-5 py-4 border-b border-[#ececec] bg-[#fafafa] flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-[#eef4f1] text-[#2b5346] border border-[#2b5346]/20">
                    {selectedProvince}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#a1a1a1]">Province events</span>
                </div>
                <h3 className="text-lg font-black text-[#0f0f0f] mt-1">
                  {provinceEvents.length.toLocaleString()} event{provinceEvents.length !== 1 ? "s" : ""} in {selectedProvince}
                </h3>
                <p className="text-[10px] font-mono text-[#888] mt-0.5">
                  {selectedProvinceMetric.totalSignups.toLocaleString()} signups · {selectedProvinceMetric.conversion.toFixed(1)}% conversion · ${Math.round(selectedProvinceMetric.avgLTV12).toLocaleString()} avg LTV
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="w-8 h-8 rounded-lg border border-[#e5e5e5] bg-white text-[#888] hover:text-[#1a1a1a] hover:border-[#c8c8c8] flex items-center justify-center cursor-pointer"
                aria-label="Close province events"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-5 py-3 border-b border-[#ececec] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_170px_140px] gap-2 bg-white">
              <label className="relative">
                <Search className="w-3.5 h-3.5 text-[#a1a1a1] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={eventSearch}
                  onChange={e => setEventSearch(e.target.value)}
                  placeholder="Search code or channel…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#e5e5e5] text-xs outline-none focus:border-[#2b5346] bg-[#fafafa]"
                  autoFocus
                />
              </label>
              <select
                value={eventChannel}
                onChange={e => setEventChannel(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#e5e5e5] text-xs text-[#3d3d3d] bg-[#fafafa] outline-none focus:border-[#2b5346]"
                aria-label="Filter by channel"
              >
                <option value="all">All channels</option>
                {eventChannels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
              </select>
              <select
                value={eventConversion}
                onChange={e => setEventConversion(e.target.value as "all" | "high" | "medium" | "low")}
                className="h-9 px-3 rounded-lg border border-[#e5e5e5] text-xs text-[#3d3d3d] bg-[#fafafa] outline-none focus:border-[#2b5346]"
                aria-label="Filter by conversion"
              >
                <option value="all">All conversion rates</option>
                <option value="high">High · 40%+</option>
                <option value="medium">Medium · 20–39.9%</option>
                <option value="low">Low · under 20%</option>
              </select>
              <select
                value={eventMinSignups}
                onChange={e => setEventMinSignups(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#e5e5e5] text-xs text-[#3d3d3d] bg-[#fafafa] outline-none focus:border-[#2b5346]"
                aria-label="Filter by minimum signups"
              >
                <option value="0">Any signups</option>
                <option value="10">10+ signups</option>
                <option value="25">25+ signups</option>
                <option value="50">50+ signups</option>
                <option value="100">100+ signups</option>
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#fafafa] border-b border-[#e5e5e5] text-[#a1a1a1] font-semibold font-mono uppercase text-[9px]">
                    <th className="py-2.5 px-5">Event code</th>
                    <th className="py-2.5 px-4">Channel</th>
                    <th className="py-2.5 px-4 text-right">Signups</th>
                    <th className="py-2.5 px-4 text-right">Paying cx</th>
                    <th className="py-2.5 px-4 text-right">Conversion</th>
                    <th className="py-2.5 px-4 text-right">Avg LTV 12m</th>
                    <th className="py-2.5 px-5 text-right">Total LTV 12m</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f3f1]">
                  {filteredProvinceEvents.map((row, index) => {
                    const conversion = row.Signups > 0 ? (row["Paying cx"] / row.Signups) * 100 : 0;
                    const avgLtv = row["Paying cx"] > 0 ? row["Sum LTV 12"] / row["Paying cx"] : 0;
                    return (
                      <tr key={`${row.discount_code}-${row.channel}-${index}`} className="hover:bg-[#fafafa]">
                        <td className="py-3 px-5 font-black font-mono text-[#0f0f0f]">{row.discount_code}</td>
                        <td className="py-3 px-4 text-[#666]">{row.channel || "Unspecified"}</td>
                        <td className="py-3 px-4 text-right font-mono">{row.Signups.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono">{row["Paying cx"].toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#2b5346]">{conversion.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right font-mono">${Math.round(avgLtv).toLocaleString()}</td>
                        <td className="py-3 px-5 text-right font-mono text-[#888]">${Math.round(row["Sum LTV 12"]).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredProvinceEvents.length === 0 && (
                <div className="py-14 px-5 text-center">
                  <p className="text-sm font-semibold text-[#3d3d3d]">No events match these filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEventSearch("");
                      setEventChannel("all");
                      setEventConversion("all");
                      setEventMinSignups("0");
                    }}
                    className="mt-2 text-xs font-semibold text-[#2b5346] cursor-pointer hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <footer className="px-5 py-3 border-t border-[#ececec] bg-[#fafafa] flex items-center justify-between text-[10px] font-mono text-[#888]">
              <span>{filteredProvinceEvents.length.toLocaleString()} of {provinceEvents.length.toLocaleString()} events shown</span>
              <span>{filteredProvinceEvents.reduce((sum, row) => sum + row.Signups, 0).toLocaleString()} signups in filtered view</span>
            </footer>
          </section>
        </div>
      )}

    </div>
  );
}
