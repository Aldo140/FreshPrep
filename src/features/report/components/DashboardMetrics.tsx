/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { KPIReportSummary } from "../../../types";
import { MetricTooltip } from "../../../components/DesignSystem";
import { 
  Users, 
  CreditCard, 
  Percent, 
  TrendingUp, 
  DollarSign, 
  FileCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface DashboardMetricsProps {
  summary: KPIReportSummary;
}

export default function DashboardMetrics({ summary }: DashboardMetricsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Primary Metrics
  const primaryKpis = [
    {
      id: "total-signups",
      title: "Total Signups",
      value: summary.totalSignups.toLocaleString(),
      subtitle: "Raw venue registrations",
      icon: Users,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5] hover:border-[#2b5346]/40",
      tooltip: { title: "Total Signups", definition: "Raw registrations captured through all analyzed promo codes.", note: "Includes all sign-ups regardless of whether they converted to paying." },
    },
    {
      id: "paying-customers",
      title: "Paying Customers",
      value: summary.totalPayingCustomers.toLocaleString(),
      subtitle: "Acquired subscriptions",
      icon: CreditCard,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5] hover:border-[#2b5346]/40",
      tooltip: { title: "Paying Customers", definition: "Signups who converted to an active paying subscription.", note: "Primary acquisition metric. Used to calculate conversion rate and LTV." },
    },
    {
      id: "blended-conv",
      title: "Conversion Rate",
      value: `${summary.blendedConversionRate.toFixed(1)}%`,
      subtitle: "Blended cohort output",
      icon: Percent,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5] hover:border-[#2b5346]/40",
      tooltip: { title: "Blended Conversion Rate", definition: "Total paying customers ÷ total signups across all codes in this cohort.", note: "Weighted by volume — high-signup codes pull this number more than low-signup codes." },
    },
    {
      id: "ltv-12",
      title: "Total LTV (12M)",
      value: formatCurrency(summary.totalLTV12),
      subtitle: "Total lifetime valuation",
      icon: DollarSign,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5] hover:border-[#2b5346]/40",
      tooltip: { title: "Total LTV (12 Month)", definition: "Combined 12-month revenue across all customers acquired via these promo codes.", note: "Derived from Sum LTV 12 column. Higher total = higher overall campaign return." },
    }
  ];

  // Secondary/Advanced Metrics
  const advancedKpis = [
    {
      id: "found-codes",
      title: "Vouchers Found",
      value: summary.numCodesFound,
      subtitle: "Successfully matched",
      icon: FileCheck,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5]",
      tooltip: { title: "Vouchers Found", definition: "Promo codes from your input that were matched to records in the uploaded dataset." },
    },
    {
      id: "missing-codes",
      title: "Missing Input Keys",
      value: summary.numCodesMissing,
      subtitle: "Vouchers not matched",
      icon: AlertTriangle,
      color: summary.numCodesMissing > 0 ? "text-[#9b4a1c] bg-[#fef3ed] border-[#e78a58]/30" : "text-[#a1a1a1] bg-[#f8f7f5] border-[#e5e5e5]",
      bgClass: "bg-white border-[#e5e5e5]",
      tooltip: { title: "Missing Codes", definition: "Codes submitted for analysis that had no matching record in the dataset.", note: "Check the Missing Codes section below for fuzzy-match suggestions." },
    },
    {
      id: "avg-conv",
      title: "Avg Conversion Rate",
      value: `${summary.averageConversionRate.toFixed(1)}%`,
      subtitle: "Mean average rate",
      icon: TrendingUp,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5]",
      tooltip: { title: "Average Conversion Rate", definition: "Mean conversion rate per code, unweighted by volume.", note: "Differs from Blended Rate — each code counts equally here regardless of signup volume." },
    },
    {
      id: "top-performer-code",
      title: "Highest Conversion",
      value: summary.topPerformingCodeCode || "N/A",
      subtitle: summary.topPerformingCodeVal > 0 ? `Conv: ${summary.topPerformingCodeVal.toFixed(1)}%` : "No matches",
      icon: TrendingUp,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5]",
      tooltip: { title: "Highest Conversion Code", definition: "The single promo code with the highest signup-to-subscription conversion rate." },
    },
    {
      id: "best-overall-score",
      title: "Top Performer Code",
      value: summary.bestOverallScoreCode || "N/A",
      subtitle: summary.bestOverallScoreVal > 0 ? `Index Rating: ${summary.bestOverallScoreVal}/100` : "No matches",
      icon: FileCheck,
      color: "text-[#2b5346] bg-[#eef4f1] border-[#2b5346]/20",
      bgClass: "bg-white border-[#e5e5e5]",
      tooltip: { title: "Top Performer (Index Score)", definition: "Code with the highest composite score combining conversion rate, LTV, and efficiency ratio.", note: "Score is out of 100. Balances volume, conversion, and customer quality." },
    }
  ];

  return (
    <div className="flex flex-col gap-4 font-sans" id="dashboard-metric-engine-root">
      
      {/* Primary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="primary-kpi-grid">
        {primaryKpis.map((kpi) => {
          const IconComponent = kpi.icon;
          return (
            <MetricTooltip
              key={kpi.id}
              title={kpi.tooltip.title}
              definition={kpi.tooltip.definition}
              note={kpi.tooltip.note}
              position="below"
            >
              <div
                id={`kpi-card-${kpi.id}`}
                className={`p-3 sm:p-4 rounded-xl border shadow-2xs hover:shadow-xs transition-[box-shadow,border-color] cursor-default ${kpi.bgClass}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#3d3d3d] truncate">
                      {kpi.title}
                    </p>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-black font-mono mt-0.5 sm:mt-1 text-[#1a1a1a] tracking-tight truncate">
                      {kpi.value}
                    </h3>
                    <p className="text-[8.5px] sm:text-[9px] text-[#a1a1a1] leading-tight mt-0.5 sm:mt-1 truncate font-sans">
                      {kpi.subtitle}
                    </p>
                  </div>
                  <div className={`p-1.5 sm:p-2 rounded-lg border flex-shrink-0 ${kpi.color}`}>
                    <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
              </div>
            </MetricTooltip>
          );
        })}
      </div>

      {/* LTV milestones — always visible, grouped as a progression */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[#f0f0f0]">
          {[
            { label: "LTV 3-Month",    value: formatCurrency(summary.totalLTV3),    sub: "Total cohort value" },
            { label: "LTV 6-Month",    value: formatCurrency(summary.totalLTV6),    sub: "Total cohort value" },
            { label: "Avg per Customer", value: formatCurrency(summary.averageLTV12), sub: "12-month avg per paying cx" },
          ].map((m, i) => (
            <div key={i} className="px-4 py-3.5">
              <p className="text-[9px] font-semibold text-[#b0b0b0] uppercase tracking-widest font-mono">{m.label}</p>
              <p className="text-lg font-bold font-mono text-[#1a1a1a] mt-0.5 tracking-tight">{m.value}</p>
              <p className="text-[9px] text-[#c0c0c0] font-mono mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accordion expand toggle button */}
      <div className="flex justify-center" id="advanced-kpi-collapsible-trigger">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-full cursor-pointer shadow-3xs hover:shadow-2xs transition-[box-shadow,background-color,border-color]"
        >
          {showAdvanced ? (
            <>
              <span className="text-[#2b5346]">Hide advanced metrics</span>
              <ChevronUp className="w-3.5 h-3.5 text-[#2b5346]" />
            </>
          ) : (
            <>
              <span>View Advanced Metrics</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </>
          )}
        </button>
      </div>

      {/* Advanced metrics section */}
      {showAdvanced && (
        <div 
          className="grid grid-cols-2 md:grid-cols-4 gap-3.5 p-4 border border-dashed border-slate-200/80 rounded-xl bg-slate-50/40 animate-fade-in"
          id="advanced-kpi-grid"
        >
          {advancedKpis.map((kpi) => {
            const IconComponent = kpi.icon;
            return (
              <MetricTooltip
                key={kpi.id}
                title={kpi.tooltip.title}
                definition={kpi.tooltip.definition}
                note={kpi.tooltip.note}
                position="below"
              >
                <div
                  id={`kpi-card-${kpi.id}`}
                  className={`p-3 rounded-lg border shadow-3xs hover:shadow-2xs transition-[box-shadow] cursor-default ${kpi.bgClass}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#a1a1a1] truncate">
                        {kpi.title}
                      </p>
                      <h3 className="text-sm font-bold font-mono mt-0.5 text-[#1a1a1a] tracking-tight truncate">
                        {kpi.value}
                      </h3>
                      <p className="text-[8.5px] text-[#a1a1a1] leading-tight mt-0.5 truncate font-sans">
                        {kpi.subtitle}
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-md border flex-shrink-0 ${kpi.color}`}>
                      <IconComponent className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </MetricTooltip>
            );
          })}
        </div>
      )}

    </div>
  );
}
