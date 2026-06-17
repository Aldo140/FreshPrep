/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AnalyzedCodeReport, ChannelSummary } from "../types";
import { BarChart3, Layers, Trophy, Award } from "lucide-react";

interface PerformanceChartProps {
  reports: AnalyzedCodeReport[];
  channels: ChannelSummary[];
}

export default function PerformanceChart({ reports, channels }: PerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "breakdown" | "channels">("leaderboard");

  if (reports.length === 0) {
    return (
      <div id="chart-placeholder" className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
        <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">No matched discount codes located</p>
        <p className="text-xs text-slate-400 mt-1">
          Provide a valid promotion export and submit target codes to generate visualizations.
        </p>
      </div>
    );
  }

  // Top 5 by conversion rate
  const leaderboardCodes = [...reports]
    .sort((a, b) => b.calculatedConversion - a.calculatedConversion)
    .slice(0, 5);

  // All codes sorted by signups for per-code breakdown
  const bySignups = [...reports].sort((a, b) => b.Signups - a.Signups).slice(0, 8);

  const totalSignupsSum = channels.reduce((sum, c) => sum + c.totalSignups, 0);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Strong":    return "bg-[#2b5346]";
      case "Good":      return "bg-[#3d7060]";
      case "Average":   return "bg-[#e7bd27]";
      case "Weak":      return "bg-[#e78a58]";
      case "Poor":      return "bg-[#850b0b]";
      case "Undisclosed": return "bg-[#c0c0c0]";
      default:          return "bg-[#c0c0c0]";
    }
  };

  const getRatingTextColor = (rating: string) => {
    switch (rating) {
      case "Strong":    return "text-[#2b5346] font-bold";
      case "Good":      return "text-[#3d7060] font-semibold";
      case "Average":   return "text-[#8a6f00] font-medium";
      case "Weak":      return "text-[#9b4a1c]";
      case "Poor":      return "text-[#850b0b]";
      case "Undisclosed": return "text-[#a1a1a1] font-medium";
      default:          return "text-[#a1a1a1] font-medium";
    }
  };

  const tabs = [
    { id: "leaderboard" as const, label: "Top by Conversion", icon: Trophy,   desc: "Which codes converted best" },
    { id: "breakdown"   as const, label: "Signup Breakdown",  icon: BarChart3, desc: "Signups vs. paying per code" },
    { id: "channels"    as const, label: "By Channel",        icon: Award,     desc: "How channels compared" },
  ];

  return (
    <div id="performance-chart-container" className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs font-sans animate-fade-in">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between border-b border-slate-100 pb-4 mb-5 gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#2b5346] rounded-full shrink-0" />
            Code Performance
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
            {tabs.find(t => t.id === activeTab)?.desc}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-150 p-1 rounded-xl" id="chart-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-[#2b5346] shadow-2xs border border-slate-205"
                    : "text-slate-550 hover:text-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#2b5346]" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Top by Conversion */}
      {activeTab === "leaderboard" && (
        <div id="chart-leaderboard-panel" className="space-y-4 animate-fade-in">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Top {leaderboardCodes.length} codes · ranked by conversion rate
          </p>

          <div className="space-y-3.5">
            {leaderboardCodes.map((item, idx) => (
              <div key={`${item.discount_code}-${item.Province ?? ""}-${idx}`} className="group">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5 leading-none">
                  <div className="flex items-center gap-2">
                    <span className="w-4.5 h-4.5 flex items-center justify-center font-mono rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-slate-850 group-hover:text-[#2b5346] transition-colors">
                      {item.discount_code}
                    </span>
                    <span className="text-[10px] text-slate-450 px-1.5 py-0.5 rounded border border-slate-150 font-normal">
                      {item.channel}
                    </span>
                    {item.performanceRating === "Undisclosed" && (
                      <span className="text-[9px] text-[#a1a1a1] font-mono italic">too early</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-450 font-normal">
                      {item["Paying cx"]} of {item.Signups}
                    </span>
                    <span className={`font-mono ${getRatingTextColor(item.performanceRating)} text-right min-w-12`}>
                      {item.calculatedConversion.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100/80 rounded-full overflow-hidden border border-slate-150/40">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${getRatingColor(item.performanceRating)}`}
                    style={{ width: `${Math.min(100, item.calculatedConversion)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-1 border-t border-slate-100 pt-3.5 mt-2 text-[9px] font-bold text-slate-400 text-center font-mono uppercase tracking-wider">
            {[
              { color: "#2b5346", label: "Strong ≥40%" },
              { color: "#3d7060", label: "Good 30–40%" },
              { color: "#e7bd27", label: "Avg 20–30%" },
              { color: "#e78a58", label: "Weak 10–20%" },
              { color: "#850b0b", label: "Poor <10%" },
              { color: "#c0c0c0", label: "Undisclosed" },
            ].map(t => (
              <div key={t.label} className="flex flex-col items-center gap-0.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Signup Breakdown — one stacked bar per code */}
      {activeTab === "breakdown" && (
        <div id="chart-breakdown-panel" className="space-y-3 animate-fade-in font-sans">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Top {bySignups.length} codes by signup volume · green = converted
          </p>

          <div className="space-y-3">
            {bySignups.map((item, idx) => {
              const convFraction = item.Signups > 0 ? item["Paying cx"] / item.Signups : 0;
              const convPct = (convFraction * 100).toFixed(1);

              return (
                <div key={`${item.discount_code}-${item.Province ?? ""}-${idx}`}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{item.discount_code}</span>
                      <span className="text-[10px] text-slate-450">{item.channel}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-400">{item.Signups} leads</span>
                      <span className="font-semibold text-[#2b5346]">{item["Paying cx"]} paying</span>
                      <span className={`font-bold ${getRatingTextColor(item.performanceRating)}`}>{convPct}%</span>
                    </div>
                  </div>

                  {/* Single stacked bar: green = paying, gray = not converted */}
                  <div className="h-5 w-full bg-[#f0f0f0] rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-[#2b5346] rounded-lg transition-[width] duration-700 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(convFraction * 100, 2)}%` }}
                    >
                      {convFraction >= 0.18 && (
                        <span className="text-[9px] text-white font-mono font-bold">{convPct}%</span>
                      )}
                    </div>
                    {convFraction < 0.18 && (
                      <span className="absolute left-[calc(var(--w)+4px)] top-1/2 -translate-y-1/2 text-[9px] text-[#a1a1a1] font-mono" style={{ "--w": `${convFraction * 100}%` } as React.CSSProperties}>
                        {convPct}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2b5346]" />
                      {item["Paying cx"]} converted
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8e8e8] border border-[#d0d0d0]" />
                      {item.Signups - item["Paying cx"]} didn't subscribe
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: By Channel */}
      {activeTab === "channels" && (
        <div id="chart-channels-panel" className="space-y-4 animate-fade-in font-sans">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Signup volume and conversion rate by marketing channel
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="space-y-4">
              {channels.map((chan) => {
                const signupShare = totalSignupsSum > 0 ? (chan.totalSignups / totalSignupsSum) * 100 : 0;
                return (
                  <div key={chan.channel} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{chan.channel}</span>
                      <span className="font-mono text-slate-500">
                        {chan.totalSignups.toLocaleString()} signups · {signupShare.toFixed(1)}% of total
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 border border-slate-150 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2b5346] rounded-full" style={{ width: `${signupShare}%` }} />
                    </div>
                    <div className="flex gap-4 text-[9.5px] text-slate-450 font-medium">
                      <span>{chan.codeCount} code{chan.codeCount !== 1 ? "s" : ""}</span>
                      <span>{chan.totalPayingCustomers} paying customers</span>
                      <span className="text-[#2b5346] font-bold">{chan.averageConversion.toFixed(1)}% avg conversion</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Channel summary card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Channel Summary
              </span>

              <div className="space-y-2 mt-1">
                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 text-xs">
                  <span className="text-slate-500">Highest volume:</span>
                  <span className="font-bold text-slate-800">
                    {[...channels].sort((a, b) => b.totalSignups - a.totalSignups)[0]?.channel ?? "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 text-xs">
                  <span className="text-slate-500">Best conversion:</span>
                  <span className="font-bold text-[#2b5346]">
                    {[...channels].sort((a, b) => b.averageConversion - a.averageConversion)[0]?.channel ?? "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Active channels:</span>
                  <span className="font-bold text-slate-800 font-mono">{channels.length}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-200 pt-3">
                Channels with ≥30% conversion are worth prioritizing for future budget allocation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
