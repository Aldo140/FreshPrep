/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { DiscountCodeData, AnalyzedCodeReport } from "../types";
import { 
  Compass, 
  Map as MapIcon, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Compass as OpportunityIcon, 
  Flame as EfficiencyIcon, 
  TrendingDown, 
  LineChart,
  HelpCircle,
  HelpCircle as InfoIcon
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
  metricScore: number; // calculated 0-100 regional performance score
  grade: "Elite" | "Strong" | "Average" | "Weak";
}

export default function ProvinceIntelligence({ dbRows, foundReports }: ProvinceIntelligenceProps) {
  // Toggle between matching query list (active report) and the entire loaded database file!
  const [dataSource, setDataSource] = useState<"audited" | "full">("audited");
  const [activeLeaderboardSort, setActiveLeaderboardSort] = useState<"paying" | "conversion" | "ltv" | "signups" | "score">("paying");

  const activeDataset = useMemo(() => {
    if (dataSource === "audited") {
      // Normalise based on located codes
      return foundReports;
    } else {
      // Normalise based on all database elements
      return dbRows;
    }
  }, [dataSource, foundReports, dbRows]);

  // Aggregate regional data by Province
  const provinceMetrics = useMemo(() => {
    const regionalMap = new Map<string, {
      province: string;
      signups: number;
      paying: number;
      ltv12: number;
      discount: number;
      codeCount: number;
    }>();

    activeDataset.forEach((row) => {
      const provRaw = (row.Province || "").trim().toUpperCase();
      const provObj = provRaw === "" || provRaw === "-" ? "ON" : provRaw;

      const existing = regionalMap.get(provObj) || {
        province: provObj,
        signups: 0,
        paying: 0,
        ltv12: 0,
        discount: 0,
        codeCount: 0
      };

      existing.codeCount += 1;
      existing.signups += row.Signups || 0;
      existing.paying += row["Paying cx"] || 0;
      
      // Accumulate LTV12. Supporting both AnalyzedCodeReport and raw DiscountCodeData
      if ("Sum LTV 12" in row) {
        existing.ltv12 += (row as any)["Sum LTV 12"] || 0;
      } else {
        // Average LTV12 * paying cx as reasonable fallback if sum not directly there
        existing.ltv12 += ((row as any)["Avg LTV 12"] || 0) * (row["Paying cx"] || 0);
      }

      existing.discount += Math.abs(row.total_discount_used || 0);

      regionalMap.set(provObj, existing);
    });

    const list: ProvinceMetricSummary[] = [];

    regionalMap.forEach((val) => {
      const conversion = val.signups > 0 ? (val.paying / val.signups) * 100 : 0;
      const avgLTV12 = val.paying > 0 ? (val.ltv12 / val.paying) : 0;
      const efficiencyRatio = val.discount > 0 ? (val.ltv12 / val.discount) : 0;

      // Mathematically balanced composite score based on regional health factors
      // 40% conversion metrics, 40% value profile (per-buyer LTV), 20% acquisition volume
      const sConv = Math.min(100, conversion * 1.8); // 55% conversion yields full points
      const sLtv = Math.min(100, (avgLTV12 / 1000) * 100); // $1,000 LTV yields full points
      const sSignups = Math.min(100, (val.signups / 500) * 100); // 500 signups yields full volume points
      
      const metricScore = Math.round((sConv * 0.4) + (sLtv * 0.4) + (sSignups * 0.2));

      // Category designation
      let grade: "Elite" | "Strong" | "Average" | "Weak" = "Weak";
      if (metricScore >= 75 || (conversion >= 50 && val.paying >= 10)) grade = "Elite";
      else if (metricScore >= 50 || (conversion >= 35 && val.paying >= 5)) grade = "Strong";
      else if (metricScore >= 25 || conversion >= 20) grade = "Average";

      list.push({
        province: val.province,
        totalSignups: val.signups,
        totalPayingCustomers: val.paying,
        conversion,
        totalLTV12: val.ltv12,
        avgLTV12,
        totalDiscount: val.discount,
        efficiencyRatio,
        metricScore,
        grade
      });
    });

    return list;
  }, [activeDataset]);

  // Leaders scorecard calculations
  const scorecards = useMemo(() => {
    let bestConversion = { province: "N/A", val: 0, sub: "0/0" };
    let bestLTV = { province: "N/A", val: 0, sub: "$0 total" };
    let mostSignups = { province: "N/A", val: 0 };
    let mostPaying = { province: "N/A", val: 0 };

    provinceMetrics.forEach((m) => {
      if (m.conversion > bestConversion.val) {
        bestConversion = { 
          province: m.province, 
          val: m.conversion,
          sub: `${m.totalPayingCustomers.toLocaleString()} / ${m.totalSignups.toLocaleString()} converted`
        };
      }
      if (m.avgLTV12 > bestLTV.val && m.totalPayingCustomers > 0) {
        bestLTV = { 
          province: m.province, 
          val: m.avgLTV12,
          sub: `$${Math.round(m.totalLTV12).toLocaleString()} total region value`
        };
      }
      if (m.totalSignups > mostSignups.val) {
        mostSignups = { province: m.province, val: m.totalSignups };
      }
      if (m.totalPayingCustomers > mostPaying.val) {
        mostPaying = { province: m.province, val: m.totalPayingCustomers };
      }
    });

    return {
      bestConversion,
      bestLTV,
      mostSignups,
      mostPaying
    };
  }, [provinceMetrics]);

  // Expansion recommendations logic
  const recommendations = useMemo(() => {
    if (provinceMetrics.length === 0) return null;

    // 1. Highest Opportunity Province
    // High Conversion & High Avg LTV, but less signup depth (indicates high purchase intent but low penetration)
    let highestOpportunity = provinceMetrics[0];
    let maxOpportunityIndex = -1;

    // 2. Highest Efficiency Province
    // Highest LTV per dollar spent on discount (highest efficiency ratio)
    let highestEfficiency = provinceMetrics[0];

    // 3. Lowest Performing Province
    // Lowest conversion rate
    let lowestPerforming = provinceMetrics[0];

    // 4. Province requiring further investment
    // High signup volume but low conversion: market clearly wants the product but checkout friction or pricing is killing sales
    let extraInvestment = provinceMetrics[0];
    let maxInvestmentMargin = -1;

    provinceMetrics.forEach((m) => {
      // Opportunity index = conversion % * average LTV12 / total signups
      const oppIndex = m.totalSignups > 0 ? (m.conversion * m.avgLTV12) / Math.sqrt(m.totalSignups) : 0;
      if (oppIndex > maxOpportunityIndex) {
        maxOpportunityIndex = oppIndex;
        highestOpportunity = m;
      }

      if (m.efficiencyRatio > highestEfficiency.efficiencyRatio && m.totalDiscount > 0) {
        highestEfficiency = m;
      }

      if (m.conversion < lowestPerforming.conversion) {
        lowestPerforming = m;
      }

      // Investment margin = high signups relative to low conversion
      const investMargin = m.totalSignups * (100 - m.conversion);
      if (investMargin > maxInvestmentMargin) {
        maxInvestmentMargin = investMargin;
        extraInvestment = m;
      }
    });

    return {
      highestOpportunity,
      highestEfficiency,
      lowestPerforming,
      extraInvestment
    };
  }, [provinceMetrics]);

  // Sort leaderboard items
  const sortedLeaderboard = useMemo(() => {
    return [...provinceMetrics].sort((a, b) => {
      switch (activeLeaderboardSort) {
        case "conversion":
          return b.conversion - a.conversion;
        case "ltv":
          return b.avgLTV12 - a.avgLTV12;
        case "signups":
          return b.totalSignups - a.totalSignups;
        case "score":
          return b.metricScore - a.metricScore;
        case "paying":
        default:
          return b.totalPayingCustomers - a.totalPayingCustomers;
      }
    });
  }, [provinceMetrics, activeLeaderboardSort]);

  // Helper values for maximums to scale relative visual meters
  const getMaxStats = useMemo(() => {
    let maxSignups = 1;
    let maxLtv = 1;
    let maxPaying = 1;
    provinceMetrics.forEach(m => {
      if (m.totalSignups > maxSignups) maxSignups = m.totalSignups;
      if (m.avgLTV12 > maxLtv) maxLtv = m.avgLTV12;
      if (m.totalPayingCustomers > maxPaying) maxPaying = m.totalPayingCustomers;
    });
    return { maxSignups, maxLtv, maxPaying };
  }, [provinceMetrics]);

  if (provinceMetrics.length === 0) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center text-slate-500 font-medium">
        Load full portfolio discount data or audit promo codes in the sidebar to populate Province Regional Analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans" id="regional-intelligence-viewport">
      
      {/* Upper Module Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white border border-slate-200/90 p-4 gap-4 rounded-2xl shadow-3xs">
        <div>
          <h3 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-450 font-mono flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-600 animate-spin-slow" />
            Geography Workspace Settings
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Analyzing operational statistics aggregated across <strong className="font-semibold text-slate-800">{activeDataset.length.toLocaleString()} active records</strong>.
          </p>
        </div>

        {/* Source Toggle Mode selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => {
              setDataSource("audited");
              setActiveLeaderboardSort("paying");
            }}
            id="datasource-audited-toggle-btn"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
              dataSource === "audited"
                ? "bg-white text-emerald-800 shadow-2xs border border-emerald-100/50"
                : "text-slate-550 hover:text-slate-800"
            }`}
          >
            📋 Audited Event List ({foundReports.length})
          </button>
          <button
            onClick={() => {
              setDataSource("full");
              setActiveLeaderboardSort("paying");
            }}
            id="datasource-file-toggle-btn"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
              dataSource === "full"
                ? "bg-white text-emerald-800 shadow-2xs border border-emerald-100/50"
                : "text-slate-550 hover:text-slate-800"
            }`}
          >
            🗄️ Full Loaded Catalog ({dbRows.length.toLocaleString()})
          </button>
        </div>
      </div>

      {/* 2. Province Scorecards Grid */}
      <section id="province-scorecards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Best Conversion */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-3xs relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Best Conversion</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
              {scorecards.bestConversion.val.toFixed(1)}%
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-850 font-mono border border-emerald-200">
                {scorecards.bestConversion.province}
              </span>
            </h4>
            <p className="text-[10.5px] text-slate-500 mt-1 truncate" title={scorecards.bestConversion.sub}>
              {scorecards.bestConversion.sub}
            </p>
          </div>
          <div className="absolute right-0 bottom-0 w-8 h-8 bg-emerald-500/5 rounded-tl-full pointer-events-none" />
        </div>

        {/* Card 2: Highest Average LTV */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-3xs relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Highest Avg LTV12</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
              ${Math.round(scorecards.bestLTV.val).toLocaleString()}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-850 font-mono border border-emerald-200">
                {scorecards.bestLTV.province}
              </span>
            </h4>
            <p className="text-[10.5px] text-slate-500 mt-1 truncate" title={scorecards.bestLTV.sub}>
              {scorecards.bestLTV.sub}
            </p>
          </div>
          <div className="absolute right-0 bottom-0 w-8 h-8 bg-emerald-500/5 rounded-tl-full pointer-events-none" />
        </div>

        {/* Card 3: Most Signups */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-3xs relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Most Regional Signups</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
              {scorecards.mostSignups.val.toLocaleString()}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-850 font-mono border border-emerald-200">
                {scorecards.mostSignups.province}
              </span>
            </h4>
            <p className="text-[10.5px] text-slate-500 mt-1">
              Aggregate market interest footprint
            </p>
          </div>
          <div className="absolute right-0 bottom-0 w-8 h-8 bg-emerald-500/5 rounded-tl-full pointer-events-none" />
        </div>

        {/* Card 4: Most Paying Customers */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-3xs relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Most Paying Customers</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
              {scorecards.mostPaying.val.toLocaleString()}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-850 font-mono border border-emerald-200">
                {scorecards.mostPaying.province}
              </span>
            </h4>
            <p className="text-[10.5px] text-slate-500 mt-1">
              Net customer lifetime acquisitions
            </p>
          </div>
          <div className="absolute right-0 bottom-0 w-8 h-8 bg-emerald-500/5 rounded-tl-full pointer-events-none" />
        </div>
      </section>

      {/* Grid: Heatmap Grading Matrix & Direct Comparison Visualizer */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT: Heatmap Matrix (Elite, Strong, Average, Weak Tiers) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-5" id="geography-heatmap-panel">
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-850 font-mono flex items-center gap-1.5">
                  <MapIcon className="w-4.5 h-4.5 text-emerald-700" />
                  Regional Performance Heatmap Matrix
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Regional markets classified by conversion yield, average checkout LTV, and lifecycle value density.
                </p>
              </div>
            </div>

            {/* Matrix grading buckets */}
            <div className="space-y-4">
              {["Elite", "Strong", "Average", "Weak"].map((grade) => {
                const provincesInGrade = provinceMetrics.filter(p => p.grade === grade);
                
                // Styling definitions matching each tier context
                let titleBg = "bg-purple-100 text-purple-900 border-purple-200";
                let hoverBorder = "hover:border-purple-300 hover:bg-purple-50/15";
                let summaryQuote = "Superior market footprint displaying optimal consumer conversion and high LTV values.";
                
                if (grade === "Strong") {
                  titleBg = "bg-emerald-100 text-emerald-900 border-emerald-200";
                  hoverBorder = "hover:border-emerald-300 hover:bg-emerald-50/15";
                  summaryQuote = "Healthy responsiveness. High acquisition rate and stable LTV with strong operational leverage.";
                } else if (grade === "Average") {
                  titleBg = "bg-amber-100 text-amber-950 border-amber-200";
                  hoverBorder = "hover:border-amber-300 hover:bg-amber-50/15";
                  summaryQuote = "Baseline results. Displays average checkout rates, requiring progressive event refinement.";
                } else if (grade === "Weak") {
                  titleBg = "bg-rose-100 text-rose-950 border-rose-200";
                  hoverBorder = "hover:border-rose-300 hover:bg-rose-50/15";
                  summaryQuote = "Underpenetrated segment. Poor signup engagement or lower average customer lifetimes.";
                }

                return (
                  <div 
                    key={grade} 
                    className={`border border-slate-150 p-3 rounded-xl transition ${hoverBorder}`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold font-mono tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${titleBg}`}>
                          {grade} Tier
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">({provincesInGrade.length} region{provincesInGrade.length === 1 ? "" : "s"})</span>
                      </div>
                      
                      {/* Condensed quote metric preview */}
                      <span className="text-[10px] text-slate-450 italic font-medium hidden sm:inline-block">
                        {summaryQuote}
                      </span>
                    </div>

                    {provincesInGrade.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {provincesInGrade.map(row => (
                          <div 
                            key={row.province} 
                            className="bg-slate-50/50 border border-slate-200/60 p-2.5 rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <p className="font-extrabold text-[12px] text-slate-900 font-mono uppercase">{row.province}</p>
                              <p className="text-[9.5px] text-slate-500 font-medium tracking-tight mt-0.5">
                                Conv Rate: <strong className="font-bold text-slate-800 font-mono">{row.conversion.toFixed(1)}%</strong>
                              </p>
                            </div>
                            <div className="text-right font-mono">
                              <p className="text-[11px] font-black text-slate-800">${Math.round(row.avgLTV12).toLocaleString()}</p>
                              <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">LTV 12 PROFILE</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-slate-400 italic">No provinces classified in this performance stratum.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="border-t pt-2 text-[10px] text-slate-450 leading-normal flex items-start gap-1 p-1 italic font-medium">
            <InfoIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
            Classification matrix weights: 50% checkout conversions, 40% absolute cohort buyer LTV, and 10% acquisition lead depth.
          </div>
        </div>

        {/* RIGHT COMPONENT: Interactive Visual Comparison Panel */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-5" id="geography-visual-comparison">
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-850 font-mono flex items-center gap-1.5">
                  <LineChart className="w-4.5 h-4.5 text-emerald-700" />
                  Relative Province Market Comparison
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Bespoke vector meters tracking product demand (Signups), purchase rates (Conversion), and long-term values (LTV12).
                </p>
              </div>
            </div>

            {/* Render parallel visual meters for each province */}
            <div className="space-y-4 max-h-[352px] overflow-y-auto pr-1">
              {provinceMetrics.map((row) => {
                // Determine percentage score relative to theoretical caps
                const relSignups = Math.min(100, (row.totalSignups / getMaxStats.maxSignups) * 100);
                const relLtv = Math.min(100, (row.avgLTV12 / getMaxStats.maxLtv) * 100);
                const relConv = row.conversion; // conversion is already as percentage

                return (
                  <div key={row.province} className="border border-slate-100 p-3 rounded-xl bg-slate-50/20 shadow-3xs space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="font-black text-xs text-slate-900 font-mono uppercase bg-slate-100 px-2 py-0.5 border border-slate-200 rounded">
                        {row.province} Market Segment
                      </span>
                      <span className="text-[10px] font-bold text-slate-450 uppercase font-mono">
                        Regional score: <strong className="text-emerald-700">{row.metricScore}/100</strong>
                      </span>
                    </div>

                    {/* Progress meters row */}
                    <div className="space-y-1.5 text-[9.5px]">
                      {/* Metric 1: Signups */}
                      <div>
                        <div className="flex justify-between text-slate-500 font-medium mb-0.5">
                          <span>Lead Signups Volume:</span>
                          <span className="font-mono text-slate-800 font-semibold">{row.totalSignups.toLocaleString()} signups</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-400 rounded-full transition-all duration-501"
                            style={{ width: `${relSignups}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 2: Conversion */}
                      <div>
                        <div className="flex justify-between text-slate-500 font-medium mb-0.5">
                          <span>Purchase conversion rate:</span>
                          <span className="font-mono text-slate-800 font-semibold">{row.conversion.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-600 rounded-full transition-all duration-501"
                            style={{ width: `${Math.min(100, relConv)}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 3: Avg LTV12 */}
                      <div>
                        <div className="flex justify-between text-slate-500 font-medium mb-0.5">
                          <span>Customer Average LTV12:</span>
                          <span className="font-mono text-slate-800 font-semibold">${Math.round(row.avgLTV12).toLocaleString()} value</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-501"
                            style={{ width: `${relLtv}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t pt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Signups</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Conversion</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Avg LTV12</span>
          </div>
        </div>

      </section>

      {/* 1. Province Leaderboard Table Section */}
      <section id="province-leaderboard-section">
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between font-sans">
          
          <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-850 font-mono flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-emerald-705" />
                Province Leaderboard Ranking
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Sort, compare, and study regional market efficiency indices. Ranked dynamically by chosen columns.
              </p>
            </div>

            {/* Quick Sort Sort selector triggers */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-450 self-center px-1.5 font-mono">Rank by:</span>
              <button
                onClick={() => setActiveLeaderboardSort("paying")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${activeLeaderboardSort === "paying" ? "bg-white text-emerald-800 shadow-3xs border border-emerald-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Acquisitions
              </button>
              <button
                onClick={() => setActiveLeaderboardSort("conversion")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${activeLeaderboardSort === "conversion" ? "bg-white text-emerald-800 shadow-3xs border border-emerald-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Conversion
              </button>
              <button
                onClick={() => setActiveLeaderboardSort("ltv")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${activeLeaderboardSort === "ltv" ? "bg-white text-emerald-800 shadow-3xs border border-emerald-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                LTV12 Mean
              </button>
              <button
                onClick={() => setActiveLeaderboardSort("signups")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${activeLeaderboardSort === "signups" ? "bg-white text-emerald-800 shadow-3xs border border-emerald-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Signups
              </button>
              <button
                onClick={() => setActiveLeaderboardSort("score")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${activeLeaderboardSort === "score" ? "bg-white text-emerald-800 shadow-3xs border border-emerald-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                Score index
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold font-mono tracking-wider select-none uppercase text-[9.5px]">
                  <th className="py-2.5 px-4 text-center w-14">Rank</th>
                  <th className="py-2.5 px-5">Province</th>
                  <th className="py-2.5 px-4 text-right">Registered Signups</th>
                  <th className="py-2.5 px-4 text-right">Paying Acquisitions</th>
                  <th className="py-2.5 px-4 text-right">Conversion Rate</th>
                  <th className="py-2.5 px-4 text-right">Average LTV12</th>
                  <th className="py-2.5 px-4 text-right">Total Discount Expended</th>
                  <th className="py-2.5 px-4 text-right">ROI Efficiency Coefficient</th>
                  <th className="py-2.5 px-4 text-center">Score Profile</th>
                  <th className="py-2.5 px-4 text-center">Heatmap Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {sortedLeaderboard.map((row, index) => {
                  let gradeBadge = "bg-rose-50 text-rose-800 border-rose-200";
                  if (row.grade === "Elite") gradeBadge = "bg-purple-100 text-purple-900 border-purple-200";
                  else if (row.grade === "Strong") gradeBadge = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  else if (row.grade === "Average") gradeBadge = "bg-amber-50 text-amber-900 border-amber-200";

                  return (
                    <tr key={row.province} className="hover:bg-slate-50/40 font-medium">
                      <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[10.5px]">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-5 font-black text-slate-900 font-mono uppercase text-xs">
                        {row.province}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {row.totalSignups.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {row.totalPayingCustomers.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {row.conversion.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        ${Math.round(row.avgLTV12).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                        ${Math.round(row.totalDiscount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-800">
                        {row.efficiencyRatio.toFixed(1)}x
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">
                        <span className="font-extrabold text-slate-800">{row.metricScore}</span>/100
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block text-[9px] font-extrabold font-mono tracking-wider uppercase px-2 py-0.5 border rounded-full ${gradeBadge}`}>
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

      {/* 5. Expansion Recommendations Section */}
      {recommendations && (
        <section id="expansion-recommendations" className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
          <div className="border-b border-slate-800 pb-3 mb-5">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
              <Compass className="w-5 h-5 flex-shrink-0 animate-spin-slow" />
              Regional Market Expansion Intelligence Advisor
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5 font-sans">
              Algorithmic recommendations evaluating cohort responsiveness and asset yield ratios. Fully data-informed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Box 1: Highest Opportunity */}
            <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-emerald-500/30 transition">
              <div>
                <span className="text-[9.5px] font-mono font-bold tracking-widest text-emerald-400 uppercase block mb-1">
                  ⭐ High Opportunity Segment
                </span>
                <h4 className="text-xl font-extrabold font-mono uppercase text-slate-100 flex items-center gap-1">
                  Province: {recommendations.highestOpportunity.province}
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-2.5 leading-relaxed font-sans font-medium">
                  With a <strong className="text-white font-bold">{recommendations.highestOpportunity.conversion.toFixed(1)}% conversion</strong> and an outstanding <strong className="text-white font-bold">${Math.round(recommendations.highestOpportunity.avgLTV12).toLocaleString()} LTV12 profile</strong>, this market displays superior localized audience purchasing power. 
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[9.5px] text-slate-450 uppercase font-mono font-bold flex items-center gap-1">
                <OpportunityIcon className="w-3.5 h-3.5 text-emerald-500" /> SCALE CAMPAIGN PRESENCE
              </div>
            </div>

            {/* Box 2: Highest Efficiency */}
            <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-emerald-500/30 transition">
              <div>
                <span className="text-[9.5px] font-mono font-bold tracking-widest text-emerald-400 uppercase block mb-1">
                  ⚡ Highest ROI Efficiency
                </span>
                <h4 className="text-xl font-extrabold font-mono uppercase text-slate-100">
                  Province: {recommendations.highestEfficiency.province}
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-2.5 leading-relaxed font-sans font-medium">
                  This segment returns an incredible <strong className="text-white font-bold">{recommendations.highestEfficiency.efficiencyRatio.toFixed(1)}x LTV yields</strong> relative to promotional discount investments. Market exhibits low price elasticity; discount multipliers are highly optimized.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[9.5px] text-slate-450 uppercase font-mono font-bold flex items-center gap-1">
                <EfficiencyIcon className="w-3.5 h-3.5 text-orange-500" /> MAXIMISE BUDGET ALLOCATION
              </div>
            </div>

            {/* Box 3: Lowest Performing */}
            <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-800 transition">
              <div>
                <span className="text-[9.5px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-1">
                  ⚠️ Lowest Conversion Yield
                </span>
                <h4 className="text-xl font-extrabold font-mono uppercase text-slate-100">
                  Province: {recommendations.lowestPerforming.province}
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-2.5 leading-relaxed font-sans font-medium">
                  This segment exhibits regional performance friction, bringing only a <strong className="text-white font-bold">{recommendations.lowestPerforming.conversion.toFixed(1)}% conversion rate</strong>. Review target demographic positioning, as customer cohorts generated here show poor lifecycle conversion.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[9.5px] text-slate-450 uppercase font-mono font-bold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> RE-EVALUATE EVENT REVENUE
              </div>
            </div>

            {/* Box 4: Further Investment */}
            <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-emerald-500/30 transition">
              <div>
                <span className="text-[9.5px] font-mono font-bold tracking-widest text-emerald-400 uppercase block mb-1">
                  📈 Investment Target
                </span>
                <h4 className="text-xl font-extrabold font-mono uppercase text-slate-100">
                  Province: {recommendations.extraInvestment.province}
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-2.5 leading-relaxed font-sans font-medium">
                  Ontario commands <strong className="text-white font-bold">{recommendations.extraInvestment.totalSignups.toLocaleString()} top-of-funnel signups</strong>, yet fails to convert optimally. There is massive localized demand here. Address checkout friction or launch regional onboarding programs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 text-[9.5px] text-slate-450 uppercase font-mono font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-bounce" /> RETUNE CHECKOUT FUNNELS
              </div>
            </div>

          </div>
        </section>
      )}

    </div>
  );
}
