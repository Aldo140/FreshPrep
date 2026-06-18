/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { AnalyzedCodeReport, KPIReportSummary, UserPersona } from "../../../types";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

interface KeyFindingsSectionProps {
  reports: AnalyzedCodeReport[];
  summary: KPIReportSummary;
  eventDate?: string;
  userPersona: UserPersona;
}

export default function KeyFindingsSection({ reports, summary, eventDate, userPersona }: KeyFindingsSectionProps) {
  const calc = useMemo(() => {
    if (reports.length === 0) return null;

    const sorted = [...reports].sort((a, b) => b.calculatedConversion - a.calculatedConversion);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const aboveTarget = reports.filter(r => r.calculatedConversion >= 40);
    const belowTarget = reports.filter(r => r.calculatedConversion < 20);

    const sortedByLTV = [...reports].sort((a, b) => b["Avg LTV 12"] - a["Avg LTV 12"]);
    const highestLTV = sortedByLTV[0];

    const avgConversion = reports.reduce((s, r) => s + r.calculatedConversion, 0) / reports.length;
    const avgLTV = reports.reduce((s, r) => s + r["Avg LTV 12"], 0) / reports.length;

    return { sorted, best, worst, aboveTarget, belowTarget, highestLTV, avgConversion, avgLTV };
  }, [reports]);

  if (!calc) return null;

  const { best, worst, aboveTarget, belowTarget, highestLTV, avgConversion, avgLTV } = calc;
  const n = reports.length;
  const isSingle = n === 1;

  // Determine if this is a recent event (conversions not fully materialized yet)
  // FreshPrep: customers aren't paying until their 2nd box (full price), ~1–2 weeks post-signup
  const eventDaysDelta = eventDate
    ? Math.floor((Date.now() - new Date(eventDate + "T00:00:00").getTime()) / 86_400_000)
    : null;
  const isRecentEvent = eventDaysDelta !== null && eventDaysDelta <= 14;

  // Build plain-language findings
  const findings: { icon: React.ReactNode; text: React.ReactNode; tone: "good" | "warn" | "bad" | "neutral" }[] = [];

  // Conversion threshold
  if (isSingle) {
    const tone = best.calculatedConversion >= 40 ? "good" : best.calculatedConversion >= 20 ? "warn" : "bad";
    findings.push({
      icon: tone === "good" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />,
      text: <>
        <strong className="font-mono">{best.discount_code}</strong> converted at{" "}
        <strong>{best.calculatedConversion.toFixed(1)}%</strong>
        {tone === "good" ? " — above the 40% target." : tone === "warn" ? " — within the average range (20–39%)." : " — below the 20% floor."}
        {tone !== "good" && isRecentEvent && (
          <span className="block mt-1 text-[10px] opacity-70">
            Event was {eventDaysDelta}d ago — conversions are still coming in. Customers only become paying after their 2nd box (first full-price week).
          </span>
        )}
        {tone !== "good" && !isRecentEvent && !eventDate && (
          <span className="block mt-1 text-[10px] opacity-70">
            FreshPrep customers are only counted as paying after their 2nd box. If this is a recent event, the rate will improve over the next 1–2 weeks.
          </span>
        )}
      </>,
      tone,
    });
  } else if (aboveTarget.length > 0) {
    findings.push({
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: <>
        <strong>{aboveTarget.length} of {n} codes</strong> hit the 40% conversion target.{" "}
        {aboveTarget.length === 1
          ? <><strong className="font-mono">{aboveTarget[0].discount_code}</strong> is your strongest performer.</>
          : <>Top: <strong className="font-mono">{best.discount_code}</strong> at <strong>{best.calculatedConversion.toFixed(1)}%</strong>.</>
        }
      </>,
      tone: "good",
    });
  } else {
    findings.push({
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      text: <>
        No codes hit the 40% target — blended average is <strong>{avgConversion.toFixed(1)}%</strong>.{" "}
        Best result: <strong className="font-mono">{best.discount_code}</strong> at <strong>{best.calculatedConversion.toFixed(1)}%</strong>.
        {isRecentEvent && (
          <span className="block mt-1 text-[10px] opacity-70">
            Event was {eventDaysDelta}d ago — conversions are still materializing. Customers pay full price on their 2nd box, typically 1–2 weeks post-signup.
          </span>
        )}
        {!isRecentEvent && !eventDate && (
          <span className="block mt-1 text-[10px] opacity-70">
            If this is a recent event, expect the rate to improve — FreshPrep counts paying customers from the 2nd box (first full-price week), not the initial discounted order.
          </span>
        )}
      </>,
      tone: "warn",
    });
  }

  // LTV finding (only meaningful with multiple codes, or if single and LTV is set)
  if (highestLTV["Avg LTV 12"] > 0) {
    if (!isSingle) {
      findings.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: <>
          <strong className="font-mono">{highestLTV.discount_code}</strong> produced the highest-value customers —{" "}
          avg LTV of <strong>${highestLTV["Avg LTV 12"].toFixed(0)}</strong> vs portfolio avg of <strong>${avgLTV.toFixed(0)}</strong>.
        </>,
        tone: "good",
      });
    } else {
      findings.push({
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: <>
          Avg 12-month LTV per customer: <strong>${best["Avg LTV 12"].toFixed(0)}</strong>.
          {best["Avg LTV 12"] > 500 ? " Strong customer quality for this code." : ""}
        </>,
        tone: "neutral",
      });
    }
  }

  // Low performers (only useful with multiple codes)
  if (!isSingle && belowTarget.length > 0) {
    findings.push({
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      text: <>
        <strong>{belowTarget.length} {belowTarget.length === 1 ? "code" : "codes"}</strong> fell below 20%
        {belowTarget.length <= 2
          ? <>: {belowTarget.map((r, i) => <><strong key={r.discount_code} className="font-mono">{r.discount_code}</strong>{i < belowTarget.length - 1 ? ", " : ""}</>)}.</>
          : <>. Worst: <strong className="font-mono">{worst.discount_code}</strong> at <strong>{worst.calculatedConversion.toFixed(1)}%</strong>.</>
        }
        {isRecentEvent && (
          <span className="block mt-1 text-[10px] opacity-70">
            These rates may still improve — it's only been {eventDaysDelta}d since the event.
          </span>
        )}
      </>,
      tone: "bad",
    });
  }

  // Average baseline (skip for single)
  if (!isSingle) {
    findings.push({
      icon: <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold font-mono">avg</span>,
      text: <>
        Portfolio average: <strong>{avgConversion.toFixed(1)}%</strong> conversion,{" "}
        <strong>${avgLTV.toFixed(0)}</strong> avg LTV across {n} codes.
      </>,
      tone: "neutral",
    });
  }

  // BD-specific verdict
  if (userPersona === "bd-rep") {
    if (summary.blendedConversionRate >= 40) {
      findings.push({
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        text: <>Strong event — recommend returning next year.</>,
        tone: "good",
      });
    } else if (summary.blendedConversionRate < 20) {
      findings.push({
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        text: <>Below event threshold — review booth placement or offer before committing to a return.</>,
        tone: "bad",
      });
    }
  }

  const toneColor = {
    good: { dot: "#2b5346", bg: "#eef4f1", border: "rgba(43,83,70,0.15)", icon: "text-[#2b5346]" },
    warn: { dot: "#8a6f00", bg: "#fdf8e1", border: "rgba(231,189,39,0.25)", icon: "text-[#8a6f00]" },
    bad:  { dot: "#850b0b", bg: "#fff4f4", border: "rgba(133,11,11,0.15)", icon: "text-[#850b0b]" },
    neutral: { dot: "#a1a1a1", bg: "#f8f7f5", border: "#e5e5e5", icon: "text-[#a1a1a1]" },
  };

  return (
    <div className="space-y-2.5">
      {findings.map((f, i) => {
        const c = toneColor[f.tone];
        return (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border text-xs leading-relaxed"
            style={{ backgroundColor: c.bg, borderColor: c.border }}
          >
            <span className={`shrink-0 mt-0.5 ${c.icon}`}>{f.icon}</span>
            <span className="text-[#3d3d3d]">{f.text}</span>
          </div>
        );
      })}
    </div>
  );
}
