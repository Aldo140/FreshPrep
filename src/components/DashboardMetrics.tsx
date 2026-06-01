/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { KPIReportSummary } from "../types";
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
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200/80 hover:border-emerald-300",
    },
    {
      id: "paying-customers",
      title: "Paying Customers",
      value: summary.totalPayingCustomers.toLocaleString(),
      subtitle: "Acquired subscriptions",
      icon: CreditCard,
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200/80 hover:border-emerald-300",
    },
    {
      id: "blended-conv",
      title: "Conversion Rate",
      value: `${summary.blendedConversionRate.toFixed(1)}%`,
      subtitle: "Blended cohort output",
      icon: Percent,
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200/80 hover:border-emerald-300",
    },
    {
      id: "ltv-12",
      title: "Total LTV (12M)",
      value: formatCurrency(summary.totalLTV12),
      subtitle: "Total lifetime valuation",
      icon: DollarSign,
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200/80 hover:border-emerald-300",
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
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200",
    },
    {
      id: "missing-codes",
      title: "Missing Input Keys",
      value: summary.numCodesMissing,
      subtitle: "Vouchers not matched",
      icon: AlertTriangle,
      color: summary.numCodesMissing > 0 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-slate-400 bg-slate-50 border-slate-100",
      bgClass: "bg-white border-slate-200",
    },
    {
      id: "avg-conv",
      title: "Avg Conversion Rate",
      value: `${summary.averageConversionRate.toFixed(1)}%`,
      subtitle: "Mean average rate",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200",
    },
    {
      id: "avg-ltv-12",
      title: "Average LTV (12M)",
      value: formatCurrency(summary.averageLTV12),
      subtitle: "Mean customer value",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200",
    },
    {
      id: "ltv-3",
      title: "Total LTV (3M)",
      value: formatCurrency(summary.totalLTV3),
      subtitle: "Recognized cohort LTV",
      icon: DollarSign,
      color: "text-slate-600 bg-slate-50 border-slate-150",
      bgClass: "bg-white border-slate-200",
    },
    {
      id: "ltv-6",
      title: "Total LTV (6M)",
      value: formatCurrency(summary.totalLTV6),
      subtitle: "Recognized cohort LTV",
      icon: DollarSign,
      color: "text-slate-600 bg-slate-50 border-slate-150",
      bgClass: "bg-white border-slate-200",
    },
    {
      id: "top-performer-code",
      title: "Highest Conversion",
      value: summary.topPerformingCodeCode || "N/A",
      subtitle: summary.topPerformingCodeVal > 0 ? `Conv: ${summary.topPerformingCodeVal.toFixed(1)}%` : "No matches",
      icon: TrendingUp,
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200",
    },
    {
      id: "best-overall-score",
      title: "Top Performer Code",
      value: summary.bestOverallScoreCode || "N/A",
      subtitle: summary.bestOverallScoreVal > 0 ? `Index Rating: ${summary.bestOverallScoreVal}/100` : "No matches",
      icon: FileCheck,
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
      bgClass: "bg-white border-slate-200",
    }
  ];

  return (
    <div className="flex flex-col gap-4 font-sans" id="dashboard-metric-engine-root">
      
      {/* Primary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="primary-kpi-grid">
        {primaryKpis.map((kpi) => {
          const IconComponent = kpi.icon;
          return (
            <div
              key={kpi.id}
              id={`kpi-card-${kpi.id}`}
              className={`p-3 sm:p-4 rounded-xl border shadow-2xs hover:shadow-xs transition-all ${kpi.bgClass}`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-455 truncate">
                    {kpi.title}
                  </p>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-black font-display mt-0.5 sm:mt-1 text-slate-900 tracking-tight truncate">
                    {kpi.value}
                  </h3>
                  <p className="text-[8.5px] sm:text-[9px] text-slate-500 leading-tight mt-0.5 sm:mt-1 truncate font-sans">
                    {kpi.subtitle}
                  </p>
                </div>
                <div className={`p-1.5 sm:p-2 rounded-lg border flex-shrink-0 ${kpi.color}`}>
                  <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accordion expand toggle button */}
      <div className="flex justify-center" id="advanced-kpi-collapsible-trigger">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-full cursor-pointer shadow-3xs hover:shadow-2xs transition-all"
        >
          {showAdvanced ? (
            <>
              <span className="text-emerald-750">Hide Advanced Metrics</span>
              <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
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
              <div
                key={kpi.id}
                id={`kpi-card-${kpi.id}`}
                className={`p-3 rounded-lg border shadow-3xs hover:shadow-2xs transition-all ${kpi.bgClass}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      {kpi.title}
                    </p>
                    <h3 className="text-sm font-black font-display mt-0.5 text-slate-800 tracking-tight truncate">
                      {kpi.value}
                    </h3>
                    <p className="text-[8.5px] text-slate-500 leading-tight mt-0.5 truncate font-sans">
                      {kpi.subtitle}
                    </p>
                  </div>
                  <div className={`p-1.5 rounded-md border flex-shrink-0 ${kpi.color}`}>
                    <IconComponent className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
