/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AnalyzedCodeReport, ChannelSummary } from "../types";
import { BarChart3, PieChart, Layers, Trophy, Award } from "lucide-react";

interface PerformanceChartProps {
  reports: AnalyzedCodeReport[];
  channels: ChannelSummary[];
}

export default function PerformanceChart({ reports, channels }: PerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "channels" | "funnel">("leaderboard");

  if (reports.length === 0) {
    return (
      <div id="chart-placeholder" className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
        <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">No matched discount codes located</p>
        <p className="text-xs text-slate-400 mt-1">
          Provide a valid promotion export and submit target codes to generate interactive visualizations.
        </p>
      </div>
    );
  }

  // Get Top 5 sorted by conversion
  const leaderboardCodes = [...reports]
    .sort((a, b) => b.calculatedConversion - a.calculatedConversion)
    .slice(0, 5);

  // Get Top 5 sorted by signups for visual breakdown
  const acquisitionCodes = [...reports]
    .sort((a, b) => b.Signups - a.Signups)
    .slice(0, 5);

  // Helper to determine color classes based on conversion percentage or ratings
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Strong":    return "bg-[#2b5346]";
      case "Good":      return "bg-[#3d7060]";
      case "Average":   return "bg-[#e7bd27]";
      case "Weak":      return "bg-[#e78a58]";
      case "Poor":      return "bg-[#850b0b]";
      case "Too Early": return "bg-[#c0c0c0]";
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
      case "Too Early": return "text-[#a1a1a1] font-medium";
      default:          return "text-[#a1a1a1] font-medium";
    }
  };

  // Channel metrics logic
  const totalSignupsSum = channels.reduce((sum, c) => sum + c.totalSignups, 0);

  return (
    <div id="performance-chart-container" className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs font-sans animate-fade-in">
      
      {/* Chart Headers and Navigation Links */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 mb-5 gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#2b5346] rounded-full shrink-0" />
            Performance Analytics
          </h3>
          <p className="text-[11px] text-slate-500 font-sans">
            Executive visual metrics of funnel conversions and promotional avenues
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-150 p-1 rounded-xl" id="chart-tabs">
          <button
            id="tab-leaderboard-btn"
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "leaderboard"
                ? "bg-white text-[#2b5346] shadow-2xs border border-slate-205"
                : "text-slate-550 hover:text-slate-800"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#2b5346]" />
            Conversion Leaderboard
          </button>
          <button
            id="tab-funnel-btn"
            onClick={() => setActiveTab("funnel")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "funnel"
                ? "bg-white text-[#2b5346] shadow-2xs border border-slate-205"
                : "text-slate-550 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#2b5346]" />
            Volume Funnel
          </button>
          <button
            id="tab-channels-btn"
            onClick={() => setActiveTab("channels")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "channels"
                ? "bg-white text-[#2b5346] shadow-2xs border border-slate-205"
                : "text-slate-550 hover:text-slate-800"
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-[#2b5346]" />
            Channel Breakdown
          </button>
        </div>
      </div>

      {/* Render selected analytics */}
      {activeTab === "leaderboard" && (
        <div id="chart-leaderboard-panel" className="space-y-4.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Top 5 Promo Codes by Conversion %
            </h4>
            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
              RANKINGS
            </span>
          </div>

          <div className="space-y-3.5">
            {leaderboardCodes.map((item, idx) => (
              <div key={`${item.discount_code}-${item.Province || "ON"}-${idx}`} className="group relative">
                <div className="flex items-center justify-between text-xs font-medium mb-1 leading-none">
                  <div className="flex items-center gap-2">
                    <span className="w-4.5 h-4.5 flex items-center justify-center font-mono rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-slate-850 group-hover:text-[#2b5346] transition-colors">
                      {item.discount_code}
                    </span>
                    <span className="text-[10px] text-slate-450 px-1.5 py-0.2 rounded border border-slate-150 font-normal">
                      {item.channel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-450 font-normal">
                      ({item["Paying cx"]} of {item.Signups})
                    </span>
                    <span className={`font-mono ${getRatingTextColor(item.performanceRating)} text-right min-w-12`}>
                      {item.calculatedConversion.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Vector Bar */}
                <div className="h-2 w-full bg-slate-100/80 rounded-full overflow-hidden border border-slate-150/40">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${getRatingColor(
                      item.performanceRating
                    )}`}
                    style={{ width: `${Math.min(100, item.calculatedConversion)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard Rating Legend */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-1 border-t border-slate-100 pt-3.5 mt-2 text-[9px] font-bold text-slate-400 text-center font-mono uppercase tracking-wider">
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-[#2b5346]" />
              <span>Strong (&ge;40%)</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-[#3d7060]" />
              <span>Good (30-40%)</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-[#e7bd27]" />
              <span>Average (20-30%)</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-[#e78a58]" />
              <span>Weak (10-20%)</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-[#850b0b]" />
              <span>Poor (&lt;10%)</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-[#c0c0c0]" />
              <span>Too Early</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "funnel" && (
        <div id="chart-funnel-panel" className="space-y-4 animate-fade-in font-sans">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Contribution Pool: Signups vs. Paying Customers
            </h4>
            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
              VOLUMES
            </span>
          </div>

          <div className="space-y-4">
            {acquisitionCodes.map((item, idx) => {
              const maxSignups = Math.max(...reports.map(r => r.Signups), 1);
              const pctSignups = (item.Signups / maxSignups) * 100;
              const pctPaying = (item["Paying cx"] / maxSignups) * 105; // slightly boost visually or leave raw

              return (
                <div key={`${item.discount_code}-${item.Province || "ON"}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {item.discount_code}
                      </span>
                      <span className="text-[10px] text-slate-450">
                        {item.channel}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 font-medium">
                      <strong className="text-[#2b5346] font-bold">{item["Paying cx"]}</strong> paying customer{item["Paying cx"] === 1 ? "" : "s"} / {item.Signups} leads
                    </span>
                  </div>

                  {/* Grouped Visual Bar */}
                  <div className="space-y-1.5 bg-slate-50 p-2 border border-slate-150/80 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[8.5px] font-bold font-mono uppercase text-slate-450 shrink-0">Signups:</span>
                      <div className="h-2 w-full bg-slate-150 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3d7060] rounded-full transition-[width]"
                          style={{ width: `${pctSignups}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[10px] text-slate-600 font-bold">{item.Signups}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[8.5px] font-bold font-mono uppercase text-slate-450 shrink-0">Paying:</span>
                      <div className="h-2 w-full bg-slate-150 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2b5346] rounded-full transition-[width]"
                          style={{ width: `${pctPaying}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[10px] text-[#2b5346] font-bold">{item["Paying cx"]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "channels" && (
        <div id="chart-channels-panel" className="space-y-4 animate-fade-in font-sans">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Registration Volume Share & Conversion Indices
            </h4>
            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
              CHANNELS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1.5">
            <div className="space-y-4">
              {channels.map((chan) => {
                const signupShare = totalSignupsSum > 0 ? (chan.totalSignups / totalSignupsSum) * 100 : 0;
                return (
                  <div key={chan.channel} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {chan.channel}
                      </span>
                      <span className="font-mono text-slate-500">
                        {chan.totalSignups.toLocaleString()} leads ({signupShare.toFixed(1)}%)
                      </span>
                    </div>
                    {/* Share visual meter bar */}
                    <div className="h-2 w-full bg-slate-100 border border-slate-150 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2b5346] rounded-full"
                        style={{ width: `${signupShare}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-[9.5px] text-slate-450 font-sans font-medium">
                      <span>Mapped Codes: {chan.codeCount}</span>
                      <span>Paying Subscribers: {chan.totalPayingCustomers}</span>
                      <span className="text-[#2b5346] font-bold">Avg Conversion: {chan.averageConversion.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right side: Concise Summary card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider font-mono block">
                Acquisition Summary
              </span>

              <div className="space-y-2 mt-1">
                <div className="flex justify-between items-center border-b border-dashed border-slate-205 pb-2 text-xs">
                  <span className="text-slate-500">Primary Channel:</span>
                  <span className="font-bold text-slate-800">
                    {channels[0]?.channel || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-205 pb-2 text-xs">
                  <span className="text-slate-500">Total Active Vector Channels:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {channels.length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-slate-500">Top-Performing Channel:</span>
                  <span className="font-bold text-[#2b5346]">
                    {[...channels].sort((a,b) => b.averageConversion - a.averageConversion)[0]?.channel || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 items-center p-3 rounded-lg bg-[#eef4f1]/40 text-[#2b5346] border border-[#2b5346]/20">
                <Award className="w-5 h-5 flex-shrink-0 text-[#2b5346]" />
                <p className="text-[10px] leading-relaxed">
                  Campaign avenues with conversion values **&ge; 30%** represent high conversion channels. Focus future budget allocations toward these segments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
