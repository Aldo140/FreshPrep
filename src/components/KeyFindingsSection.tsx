/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { AnalyzedCodeReport, KPIReportSummary } from "../types";
import { Lightbulb, TrendingUp, TrendingDown, ClipboardCheck, Zap } from "lucide-react";

interface KeyFindingsSectionProps {
  reports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
}

export default function KeyFindingsSection({ reports, summary }: KeyFindingsSectionProps) {
  const calculations = useMemo(() => {
    if (reports.length === 0) return null;

    // 1. Count codes with conversion rate exceed 40%
    const thresholdCount = reports.filter(r => r.calculatedConversion > 40).length;

    // 2. Highest LTV code (either Average LTV 12 or Sum LTV 12)
    const sortedByLTV = [...reports].sort((a, b) => b["Avg LTV 12"] - a["Avg LTV 12"]);
    const highestLTVCode = sortedByLTV[0];

    // 3. Lowest performer
    const sortedByConv = [...reports].sort((a, b) => a.calculatedConversion - b.calculatedConversion);
    const lowestPerformer = sortedByConv[0];

    // 4. Mean conversion rate
    const avgConversion = reports.reduce((sum, r) => sum + r.calculatedConversion, 0) / reports.length;

    // 5. Best opportunity
    const sortedOpportunities = [...reports].sort((a,b) => {
      const scoreA = a.calculatedConversion * a.efficiencyRatio;
      const scoreB = b.calculatedConversion * b.efficiencyRatio;
      return scoreB - scoreA;
    });
    const bestOpportunity = sortedOpportunities[0];

    return {
      thresholdCount,
      highestLTVCode,
      lowestPerformer,
      avgConversion,
      bestOpportunity
    };
  }, [reports]);

  if (!calculations) return null;

  const { thresholdCount, highestLTVCode, lowestPerformer, avgConversion, bestOpportunity } = calculations;

  return (
    <div 
      id="key-findings-container" 
      className="p-4 sm:p-5 rounded-2xl border border-emerald-100 bg-emerald-50/15 shadow-2xs animate-fade-in"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-tight">
            Key Findings & Operational Decisions
          </h3>
          <p className="text-[10px] text-slate-500 font-sans">
            Executive performance actions based on live validated marketing metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
        
        {/* Bullet listings in tidy slate box */}
        <div className="bg-white border border-slate-205 p-4 rounded-xl flex flex-col justify-between">
          <ul className="space-y-3 text-slate-700 leading-relaxed font-sans" id="findings-bullet-list">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
              <span>
                <strong>{thresholdCount} promo codes</strong> exceed the target 40% conversion rate threshold, proving exceptional target segment traction.
              </span>
            </li>
            
            {highestLTVCode && (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  The highest customer segment longevity is registered by code{" "}
                  <strong className="text-slate-900 font-mono">{highestLTVCode.discount_code}</strong>{" "}
                  with a 12M Average LTV of{" "}
                  <strong className="text-emerald-700 font-bold">
                    ${highestLTVCode["Avg LTV 12"].toFixed(0)}
                  </strong>.
                </span>
              </li>
            )}
            
            {lowestPerformer && (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  The lowest converting promotional asset is{" "}
                  <strong className="text-slate-900 font-mono">{lowestPerformer.discount_code}</strong>{" "}
                  performing at a conversion rate of{" "}
                  <strong className="text-rose-600 font-bold">{lowestPerformer.calculatedConversion.toFixed(1)}%</strong>.
                </span>
              </li>
            )}

            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
              <span>
                The current average benchmark across searched vouchers sits at{" "}
                <strong className="text-slate-900">{avgConversion.toFixed(1)}%</strong>.
              </span>
            </li>
          </ul>
        </div>

        {/* Opportunity Card */}
        {bestOpportunity && (
          <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-800 mb-2">
                <Zap className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span className="font-bold uppercase text-[10px] tracking-wider font-mono">Recommended Scale Path</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Marketing program <strong className="text-slate-950 font-mono">{bestOpportunity.discount_code}</strong> represents our best expansion route. It registers a high conversion of <strong className="text-emerald-800 font-bold font-mono">{bestOpportunity.calculatedConversion.toFixed(1)}%</strong> backed by an outstanding efficiency coefficient of{" "}
                <strong className="text-emerald-800 font-bold font-mono">{bestOpportunity.efficiencyRatio.toFixed(1)}x</strong> return on coupon allowances.
              </p>
            </div>
            
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 flex justify-between items-center text-[10.5px]">
              <div>
                <span className="text-slate-400 uppercase text-[8px] font-bold block font-mono">Recommendation</span>
                <span className="font-semibold text-slate-800 text-xs">Scale affiliate spend allocations</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold font-mono text-[9px] uppercase">
                Active
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
